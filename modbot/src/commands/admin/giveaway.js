'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY — Sade, Sağlam, Premium                                   ║
// ║  /giveaway başlat | /giveaway bitir | /giveaway reroll              ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType,
} = require('discord.js');
const { createGiveaway, getGiveaway, updateGiveaway, getAllActive, addEntry, removeEntry, pickWinners } = require('../../utils/giveawayDB');
const ms = require('ms');

// ══════════════════════════════════════════════════════════════════════
//  EMBED BUILDER — Premium görünüm
// ══════════════════════════════════════════════════════════════════════
function makeEmbed(gw) {
    const endTs   = Math.floor(gw.endsAt / 1000);
    const entries = gw.entries || [];
    // unique katılımcı sayısı
    const unique  = new Set(entries).size;
    const chance  = unique > 0
        ? Math.min(100, Math.round((gw.winnerCount / unique) * 100))
        : 100;

    // Renk: süreye göre değişir
    const remaining = gw.endsAt - Date.now();
    const color = remaining < 60_000 ? 0xed4245
                : remaining < 300_000 ? 0xfee75c
                : 0x57f287;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🎉  ${gw.prize}`)
        .setDescription(
            `> ⏰  Bitiş: <t:${endTs}:R>  •  <t:${endTs}:F>`
        )
        .addFields(
            { name: '🏅  Kazanan',        value: `**${gw.winnerCount}**`,    inline: true },
            { name: '👥  Katılımcı',      value: `**${unique}**`,            inline: true },
            { name: '🎯  Kazanma Şansı',  value: `**%${chance}**`,           inline: true },
        );

    if (gw.boostRoleId && gw.boostMultiplier > 1) {
        embed.addFields({
            name:  '🚀  Boost Avantajı',
            value: `<@&${gw.boostRoleId}> rolü → **${gw.boostMultiplier}x** şans`,
            inline: false,
        });
    }

    if (gw.reqRole) {
        embed.addFields({ name: '🎭  Zorunlu Rol', value: `<@&${gw.reqRole}>`, inline: true });
    }
    if (gw.reqMinAge) {
        embed.addFields({ name: '📅  Min Hesap Yaşı', value: `${gw.reqMinAge} gün`, inline: true });
    }

    embed
        .setFooter({ text: `Düzenleyen: ${gw.hostTag}  •  Katılmak için 🎉 butonuna bas!` })
        .setTimestamp(new Date(gw.endsAt));

    return embed;
}

function makeButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gw_join').setLabel('🎉  Katıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('gw_leave').setLabel('👋  Ayrıl').setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gw_cancel').setLabel('🗑️  Çekilişi İptal Et  (Admin)').setStyle(ButtonStyle.Danger),
        ),
    ];
}

function makeEndedEmbed(gw, winners) {
    const embed = new EmbedBuilder().setTimestamp();

    if (winners.length) {
        embed
            .setColor(0x57f287)
            .setTitle(`🏆  Çekiliş Bitti — ${gw.prize}`)
            .setDescription(
                `**Tebrikler kazananlara! 🎊**\n\n` +
                winners.map((id, i) => `> ${'🥇🥈🥉'.split('')[i] || '🏅'}  <@${id}>`).join('\n')
            )
            .addFields(
                { name: '🏆  Ödül',           value: gw.prize,                                  inline: true },
                { name: '👥  Toplam Katılım',  value: `${new Set(gw.entries || []).size} kişi`,  inline: true },
                { name: '🏅  Kazanan',         value: `${winners.length} kişi`,                  inline: true },
            )
            .setFooter({ text: `Yeniden çekmek için Reroll butonunu kullan  •  Düzenleyen: ${gw.hostTag}` });
    } else {
        embed
            .setColor(0xed4245)
            .setTitle(`❌  Çekiliş Bitti — ${gw.prize}`)
            .setDescription('> Geçerli katılımcı bulunamadı, çekiliş iptal edildi.')
            .setFooter({ text: `Düzenleyen: ${gw.hostTag}` });
    }
    return embed;
}

function makeRerollRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_reroll').setLabel('🔄  Reroll (Yeniden Çek)').setStyle(ButtonStyle.Primary),
    );
}

// ══════════════════════════════════════════════════════════════════════
//  KOMUT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
    name: 'giveaway',

    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Çekiliş yönetimi')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(s => s
            .setName('başlat')
            .setDescription('Yeni çekiliş başlatır')
            .addChannelOption(o => o.setName('kanal').setDescription('Çekilişin yapılacağı kanal').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addStringOption(o => o.setName('ödül').setDescription('Çekiliş ödülü').setRequired(true).setMaxLength(100))
            .addStringOption(o => o.setName('süre').setDescription('Süre: 1d, 12h, 30m').setRequired(true))
            .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan sayısı (1-20)').setRequired(false).setMinValue(1).setMaxValue(20))
            .addRoleOption(o => o.setName('boost_rolü').setDescription('Bu role sahip üyeler daha yüksek şansa sahip olur').setRequired(false))
            .addIntegerOption(o => o.setName('boost_çarpan').setDescription('Boost çarpanı (2/3/4)').setRequired(false).addChoices(
                { name: '2x Şans', value: 2 },
                { name: '3x Şans', value: 3 },
                { name: '4x Şans', value: 4 },
            ))
            .addRoleOption(o => o.setName('zorunlu_rol').setDescription('Sadece bu role sahip olanlar katılabilir').setRequired(false))
            .addIntegerOption(o => o.setName('min_hesap_yaşı').setDescription('Min hesap yaşı (gün)').setRequired(false).setMinValue(1))
        )
        .addSubcommand(s => s
            .setName('bitir')
            .setDescription('Aktif bir çekilişi erkenden bitirir')
            .addStringOption(o => o.setName('mesaj_id').setDescription('Çekiliş mesajının ID\'si').setRequired(true))
        )
        .addSubcommand(s => s
            .setName('reroll')
            .setDescription('Biten bir çekilişi yeniden çeker')
            .addStringOption(o => o.setName('mesaj_id').setDescription('Çekiliş mesajının ID\'si').setRequired(true))
        )
        .addSubcommand(s => s
            .setName('liste')
            .setDescription('Aktif çekilişleri listeler')
        ),

    // ── Execute ────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        // ── BAŞLAT ──────────────────────────────────────────────────────
        if (sub === 'başlat') {
            const channel     = interaction.options.getChannel('kanal');
            const prize       = interaction.options.getString('ödül');
            const sureRaw     = interaction.options.getString('süre');
            const winnerCount = interaction.options.getInteger('kazanan') || 1;
            const boostRole   = interaction.options.getRole('boost_rolü');
            const boostMult   = interaction.options.getInteger('boost_çarpan') || 2;
            const reqRole     = interaction.options.getRole('zorunlu_rol');
            const reqMinAge   = interaction.options.getInteger('min_hesap_yaşı');

            const duration = ms(sureRaw);
            if (!duration || duration < 10_000) {
                return interaction.reply({ content: '❌ Geçersiz süre. Örn: `1d`, `12h`, `30m` (min 10 saniye)', flags: 64 });
            }
            if (duration > 30 * 24 * 60 * 60 * 1000) {
                return interaction.reply({ content: '❌ Maksimum süre 30 gündür.', flags: 64 });
            }

            await interaction.deferReply({ flags: 64 });

            const endsAt = Date.now() + duration;
            const gw = {
                guildId:         interaction.guild.id,
                channelId:       channel.id,
                messageId:       null,
                hostId:          interaction.user.id,
                hostTag:         interaction.user.username,
                prize,
                winnerCount,
                endsAt,
                entries:         [],
                winners:         [],
                status:          'active',
                boostRoleId:     boostRole?.id || null,
                boostMultiplier: boostRole ? boostMult : 1,
                reqRole:         reqRole?.id || null,
                reqMinAge:       reqMinAge || null,
            };

            // Mesajı gönder
            let msg;
            try {
                msg = await channel.send({
                    embeds:     [makeEmbed(gw)],
                    components: makeButtons(),
                });
            } catch (e) {
                return interaction.editReply({ content: `❌ Mesaj gönderilemedi: \`${e.message}\`` });
            }

            gw.messageId = msg.id;
            await createGiveaway(gw);

            // Timer kur
            const { GiveawayManager } = require('../systems/giveawayManager');
            GiveawayManager.schedule(gw.guildId, gw.messageId, gw.endsAt, client);

            const endTs = Math.floor(endsAt / 1000);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('✅ Çekiliş Başlatıldı!')
                    .addFields(
                        { name: '🏆 Ödül',    value: prize,                      inline: true },
                        { name: '📢 Kanal',   value: `${channel}`,               inline: true },
                        { name: '⏰ Bitiş',   value: `<t:${endTs}:R>`,           inline: true },
                        { name: '🏅 Kazanan', value: `${winnerCount} kişi`,      inline: true },
                        { name: '🔗 Mesaj',   value: `[Tıkla](${msg.url})`,      inline: true },
                    )
                    .setTimestamp()],
            });
            return;
        }

        // ── BİTİR ───────────────────────────────────────────────────────
        if (sub === 'bitir') {
            const msgId = interaction.options.getString('mesaj_id').trim();
            const gw    = await getGiveaway(interaction.guild.id, msgId);
            if (!gw)                      return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });
            if (gw.status !== 'active')   return interaction.reply({ content: '❌ Bu çekiliş zaten bitmişti.', flags: 64 });

            await interaction.deferReply({ flags: 64 });

            const { GiveawayManager } = require('../systems/giveawayManager');
            await GiveawayManager.end(interaction.guild.id, msgId, client);

            await interaction.editReply({ content: '✅ Çekiliş sonlandırıldı.' });
            return;
        }

        // ── REROLL ──────────────────────────────────────────────────────
        if (sub === 'reroll') {
            const msgId = interaction.options.getString('mesaj_id').trim();
            const gw    = await getGiveaway(interaction.guild.id, msgId);
            if (!gw)                    return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });
            if (gw.status === 'active') return interaction.reply({ content: '❌ Çekiliş henüz bitmemiş.', flags: 64 });

            await interaction.deferReply({ flags: 64 });

            const winners = pickWinners(gw.entries || [], gw.winnerCount);
            await updateGiveaway(interaction.guild.id, msgId, { winners });

            // Mesajı güncelle
            const ch = interaction.guild.channels.cache.get(gw.channelId);
            if (ch) {
                const msg = await ch.messages.fetch(msgId).catch(() => null);
                if (msg) {
                    await msg.edit({
                        embeds:     [makeEndedEmbed({ ...gw, prize: `${gw.prize} (Reroll)` }, winners)],
                        components: [makeRerollRow()],
                    }).catch(() => {});
                    if (winners.length) {
                        await ch.send(`🔄 **Reroll!** Yeni kazananlar: ${winners.map(id => `<@${id}>`).join(', ')}`).catch(() => {});
                    }
                }
            }

            // DM
            for (const wId of winners) {
                try {
                    const u = await client.users.fetch(wId);
                    await u.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('🎉 Çekiliş Kazandın! (Reroll)')
                            .setDescription(`> **Ödül:** ${gw.prize}\n> **Sunucu:** ${interaction.guild.name}\n\nÖdülünü almak için sunucu yetkililerine ulaş!`)
                            .setTimestamp()],
                    }).catch(() => {});
                } catch { /* DM kapalı */ }
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('🔄 Reroll Tamamlandı')
                    .setDescription(winners.length
                        ? `Yeni kazananlar: ${winners.map(id => `<@${id}>`).join(', ')}`
                        : 'Geçerli katılımcı bulunamadı.')
                    .setTimestamp()],
            });
            return;
        }

        // ── LİSTE ───────────────────────────────────────────────────────
        if (sub === 'liste') {
            const actives = (await getAllActive()).filter(g => g.guildId === interaction.guild.id);

            if (!actives.length) {
                return interaction.reply({ content: 'ℹ️ Aktif çekiliş yok.', flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('📋 Aktif Çekilişler')
                .setDescription(
                    actives.map((g, i) => {
                        const ts = Math.floor(g.endsAt / 1000);
                        return `**${i + 1}.** 🏆 ${g.prize}\n> 📢 <#${g.channelId}> • ⏰ <t:${ts}:R> • 👥 ${new Set(g.entries || []).size} katılımcı\n> 🔗 ID: \`${g.messageId}\``;
                    }).join('\n\n')
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: 64 });
        }
    },

    // ── Buton Handler ──────────────────────────────────────────────────
    async handleButton(interaction, client) {
        const id    = interaction.customId;
        const msgId = interaction.message.id;

        // ── Katıl ──────────────────────────────────────────────────────
        if (id === 'gw_join') {
            const gw = await getGiveaway(interaction.guild.id, msgId);
            if (!gw || gw.status !== 'active') {
                return interaction.reply({ content: '❌ Bu çekiliş artık aktif değil.', flags: 64 });
            }

            // Şart: Zorunlu rol
            if (gw.reqRole && !interaction.member.roles.cache.has(gw.reqRole)) {
                return interaction.reply({
                    content: `❌ Katılmak için <@&${gw.reqRole}> rolüne sahip olman gerekiyor.`,
                    flags: 64,
                });
            }

            // Şart: Min hesap yaşı
            if (gw.reqMinAge) {
                const ageDays = (Date.now() - interaction.user.createdTimestamp) / 86_400_000;
                if (ageDays < gw.reqMinAge) {
                    return interaction.reply({
                        content: `❌ Hesabın en az **${gw.reqMinAge} günlük** olmalı. (Şu an: ${Math.floor(ageDays)} gün)`,
                        flags: 64,
                    });
                }
            }

            // Boost çarpanı hesapla
            let entries = 1;
            if (gw.boostRoleId && interaction.member.roles.cache.has(gw.boostRoleId)) {
                entries = gw.boostMultiplier || 1;
            }

            const result = await addEntry(interaction.guild.id, msgId, interaction.user.id, entries);

            if (!result.ok) {
                if (result.reason === 'already') return interaction.reply({ content: '❌ Zaten katıldın!', flags: 64 });
                if (result.reason === 'ended')   return interaction.reply({ content: '❌ Çekiliş sona erdi.', flags: 64 });
                return interaction.reply({ content: `❌ Katılım başarısız: ${result.reason}`, flags: 64 });
            }

            const boostTxt = entries > 1 ? ` 🚀 **${entries}x** boost çarpanıyla katıldın!` : '';
            await interaction.reply({ content: `✅ **${gw.prize}** çekilişine katıldın!${boostTxt}`, flags: 64 });

            // Embed'i güncelle (non-blocking)
            _refreshEmbed(interaction.guild, msgId, client).catch(() => {});
            return;
        }

        // ── Ayrıl ──────────────────────────────────────────────────────
        if (id === 'gw_leave') {
            const gw = await getGiveaway(interaction.guild.id, msgId);
            if (!gw || gw.status !== 'active') {
                return interaction.reply({ content: '❌ Bu çekiliş artık aktif değil.', flags: 64 });
            }

            const ok = await removeEntry(interaction.guild.id, msgId, interaction.user.id);
            await interaction.reply({
                content: ok ? '✅ Çekilişten ayrıldın.' : '❌ Bu çekilişe katılmamışsın.',
                flags: 64,
            });

            if (ok) _refreshEmbed(interaction.guild, msgId, client).catch(() => {});
            return;
        }

        // ── İptal ──────────────────────────────────────────────────────
        if (id === 'gw_cancel') {
            if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Administrator yetkisi gerekiyor.', flags: 64 });
            }

            const gw = await getGiveaway(interaction.guild.id, msgId);
            if (!gw || gw.status !== 'active') {
                return interaction.reply({ content: '❌ Çekiliş bulunamadı veya zaten bitmişti.', flags: 64 });
            }

            await updateGiveaway(interaction.guild.id, msgId, { status: 'cancelled' });

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle(`❌ Çekiliş İptal Edildi — ${gw.prize}`)
                    .setDescription(`> İptal eden: <@${interaction.user.id}>\n> Toplam katılım: ${new Set(gw.entries || []).size}`)
                    .setTimestamp()],
                components: [],
            });
            return;
        }

        // ── Reroll (butondan) ──────────────────────────────────────────
        if (id === 'gw_reroll') {
            if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Administrator yetkisi gerekiyor.', flags: 64 });
            }

            const gw = await getGiveaway(interaction.guild.id, msgId);
            if (!gw) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });

            const winners = pickWinners(gw.entries || [], gw.winnerCount);
            await updateGiveaway(interaction.guild.id, msgId, { winners });

            await interaction.update({
                embeds:     [makeEndedEmbed({ ...gw, prize: `${gw.prize} (Reroll)` }, winners)],
                components: [makeRerollRow()],
            });

            const ch = interaction.guild.channels.cache.get(gw.channelId);
            if (ch && winners.length) {
                await ch.send(`🔄 **Reroll!** Yeni kazananlar: ${winners.map(id => `<@${id}>`).join(', ')}`).catch(() => {});
            }

            // DM
            for (const wId of winners) {
                try {
                    const u = await client.users.fetch(wId);
                    await u.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('🎉 Tebrikler! (Reroll)')
                            .setDescription(`> **Ödül:** ${gw.prize}\n> **Sunucu:** ${interaction.guild.name}`)
                            .setTimestamp()],
                    }).catch(() => {});
                } catch { /* DM kapalı */ }
            }
            return;
        }
    },

    // Dışa aktar
    makeEmbed, makeButtons, makeEndedEmbed, makeRerollRow,
};

// ── Embed yenile yardımcısı ────────────────────────────────────────────
async function _refreshEmbed(guild, msgId, client) {
    const gw = await getGiveaway(guild.id, msgId);
    if (!gw || gw.status !== 'active') return;
    const ch  = guild.channels.cache.get(gw.channelId);
    if (!ch) return;
    const msg = await ch.messages.fetch(msgId).catch(() => null);
    if (!msg) return;
    await msg.edit({ embeds: [makeEmbed(gw)] }).catch(() => {});
}
