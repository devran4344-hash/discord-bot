'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY — Premium Dashboard Panel Sistemi                         ║
// ║  /giveaway → Modal yok, direkt embed + select menu panel            ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType,
} = require('discord.js');
const { createGiveaway, getActiveGiveaways } = require('../../utils/giveawayDB');
const ms = require('ms');

// ── Custom Emojiler ────────────────────────────────────────────────────
const EMO = {
    coin:   '<:C_:1566356814503743498>',
    boost:  '<:boster:1566356851941969940>',
    time:   '<:h_:1566356992791158849>',
    join:   '<:j_:1566357006091292804>',
    award:  '<:kk:1566357034964615199>',
    a:      '<:A_:1566356814503743498>',
    b:      '<:B_:1566356851941969940>',
};

// ══════════════════════════════════════════════════════════════════════
//  Dashboard State
// ══════════════════════════════════════════════════════════════════════
const DEFAULT_STATE = () => ({
    prize:            null,
    channelId:        null,
    duration:         null,
    winnerCount:      1,
    boostRoleId:      null,
    boostMultiplier:  1,
    showRequirements: false,
    showBoost:        false,
    requirements: {
        role:    null,
        tag:     false,
        minAge:  null,
        invites: null,
        level:   null,
    },
});

const sessions = new Map();

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD EMBED + COMPONENTS
// ══════════════════════════════════════════════════════════════════════
function buildDashboard(guild, state, activeGiveaways = []) {
    const s = state;
    const ready = s.prize && s.channelId && s.duration;

    // ── Embed ──────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
        .setColor(ready ? 0x57f287 : 0x5865f2)
        .setAuthor({
            name: `${guild.name} — Çekiliş Kontrol Paneli`,
            iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTitle(`${EMO.award} Çekiliş Başlatma Paneli`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));

    // ── Bölüm 1: Çekiliş Ayarları ──────────────────────────────────────
    const prizeStr   = s.prize     ? `**${s.prize}**`                                      : '`Ayarlanmamış`';
    const channelStr = s.channelId ? `<#${s.channelId}>`                                   : '`Ayarlanmamış`';
    const durStr     = s.duration  ? `**${ms(s.duration, { long: true })}**`               : '`Ayarlanmamış`';
    const endStr     = s.duration  ? `<t:${Math.floor((Date.now() + s.duration) / 1000)}:R>` : '`—`';

    embed.addFields({
        name: `${EMO.coin} __Çekiliş Bilgileri__`,
        value: [
            `> 🏆 **Ödül:** ${prizeStr}`,
            `> 📢 **Kanal:** ${channelStr}`,
            `> ${EMO.time} **Süre:** ${durStr} (${endStr})`,
            `> 🏅 **Kazanan:** **${s.winnerCount}** kişi`,
        ].join('\n'),
        inline: false,
    });

    // ── Bölüm 2: Şartlar ──────────────────────────────────────────────
    const reqLines = [];
    if (s.requirements.role)    reqLines.push(`> 🎭 Zorunlu Rol: <@&${s.requirements.role}>`);
    if (s.requirements.tag)     reqLines.push(`> 🏷️ Sunucu Tagı: **Aktif**`);
    if (s.requirements.minAge)  reqLines.push(`> 📅 Min Hesap Yaşı: **${s.requirements.minAge} gün**`);
    if (s.requirements.invites) reqLines.push(`> 📨 Min Davet: **${s.requirements.invites} davet**`);
    if (s.requirements.level)   reqLines.push(`> ⭐ Min Seviye: **${s.requirements.level}**`);

    embed.addFields({
        name: s.showRequirements
            ? `📋 __Katılım Şartları__ ✅`
            : `📋 __Katılım Şartları__ ❌`,
        value: reqLines.length
            ? reqLines.join('\n')
            : '> Şart yok — herkes katılabilir.',
        inline: false,
    });

    // ── Bölüm 3: Boost ────────────────────────────────────────────────
    embed.addFields({
        name: s.showBoost
            ? `${EMO.boost} __Boost Sistemi__ ✅`
            : `${EMO.boost} __Boost Sistemi__ ❌`,
        value: s.boostRoleId
            ? `> <@&${s.boostRoleId}> → **${s.boostMultiplier}x** kazanma şansı`
            : '> Boost rolü ayarlanmamış.',
        inline: false,
    });

    // ── Aktif Çekilişler ───────────────────────────────────────────────
    if (activeGiveaways.length > 0) {
        const list = activeGiveaways.slice(0, 3).map((g, i) => {
            const endTs = Math.floor(g.endsAt / 1000);
            return `> **${i + 1}.** ${EMO.coin} ${g.prize} — <t:${endTs}:R> — 👥 ${g.participants?.length || 0}`;
        }).join('\n');
        embed.addFields({ name: `📊 Aktif Çekilişler (${activeGiveaways.length})`, value: list, inline: false });
    }

    // Durum footer
    embed.setFooter({
        text: ready
            ? '✅ Hazır! Çekiliş Oluştur butonuna basabilirsin.'
            : '⚠️ Ödül, kanal ve süreyi ayarla, ardından oluştur.',
    }).setTimestamp();

    // ── Row 1: Temel Ayarlar ───────────────────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_set_prize').setLabel('🏆 Ödül').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_channel').setLabel('📢 Kanal').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_duration').setLabel('⏱️ Süre').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_winners').setLabel('🏅 Kazanan').setStyle(ButtonStyle.Secondary),
    );

    // ── Row 2: Toggle + Oluştur ────────────────────────────────────────
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gw_toggle_req')
            .setLabel(s.showRequirements ? '📋 Şartlar: Açık' : '📋 Şartlar: Kapalı')
            .setStyle(s.showRequirements ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('gw_toggle_boost')
            .setLabel(s.showBoost ? '🚀 Boost: Açık' : '🚀 Boost: Kapalı')
            .setStyle(s.showBoost ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('gw_create')
            .setLabel(ready ? '🎉 Çekiliş Oluştur' : '🎉 Oluştur (eksik var)')
            .setStyle(ready ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(!ready),
    );

    const components = [row1, row2];

    // ── Row 3: Şartlar Select (şartlar açıksa) ─────────────────────────
    if (s.showRequirements) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gw_select_req')
                .setPlaceholder('📋 Katılım şartı seç (birden fazla olabilir)...')
                .setMinValues(0)
                .setMaxValues(5)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎭 Zorunlu Rol').setValue('req_role')
                        .setDescription('Sadece bu role sahip olanlar katılabilir')
                        .setDefault(!!s.requirements.role),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏷️ Sunucu Tagı').setValue('req_tag')
                        .setDescription('Kullanıcının sunucu tagını takması gerekiyor')
                        .setDefault(s.requirements.tag),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📅 Min Hesap Yaşı').setValue('req_age')
                        .setDescription('Hesabın belirli bir yaşta olması gerekiyor')
                        .setDefault(!!s.requirements.minAge),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📨 Davet Şartı').setValue('req_invites')
                        .setDescription('Belirli sayıda davet getirmiş olma')
                        .setDefault(!!s.requirements.invites),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⭐ Seviye Şartı').setValue('req_level')
                        .setDescription('Belirli seviyeye ulaşmış olma')
                        .setDefault(!!s.requirements.level),
                ),
        ));
    }

    // ── Row 4: Boost Select (boost açıksa) ────────────────────────────
    if (s.showBoost) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gw_select_boost')
                .setPlaceholder('🚀 Boost çarpanı seç...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('2x Katılım Şansı').setValue('boost_2')
                        .setDescription('Boost rolüne sahip üyeler 2 kat şansa sahip olur')
                        .setDefault(s.boostMultiplier === 2),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('3x Katılım Şansı').setValue('boost_3')
                        .setDescription('Boost rolüne sahip üyeler 3 kat şansa sahip olur')
                        .setDefault(s.boostMultiplier === 3),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('4x Katılım Şansı').setValue('boost_4')
                        .setDescription('Boost rolüne sahip üyeler 4 kat şansa sahip olur')
                        .setDefault(s.boostMultiplier === 4),
                ),
        ));
    }

    return { embeds: [embed], components, flags: 64 };
}

// ══════════════════════════════════════════════════════════════════════
//  AKTİF ÇEKİLİŞ EMBED (katılım mesajı)
// ══════════════════════════════════════════════════════════════════════
function buildGiveawayEmbed(giveaway) {
    const endTs  = Math.floor(giveaway.endsAt / 1000);
    const count  = giveaway.participants?.length || 0;
    const chance = count > 0
        ? Math.min(100, Math.round((giveaway.winnerCount / count) * 100))
        : 100;

    // Kazanma şansı rengi
    const color = chance >= 50 ? 0x57f287 : chance >= 20 ? 0xfee75c : 0xed4245;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${EMO.coin} ${giveaway.prize}`)
        .setDescription(
            `> ${EMO.time} **Bitiş:** <t:${endTs}:F>\n` +
            `> ⏰ **Kalan:** <t:${endTs}:R>`
        )
        .addFields(
            { name: `${EMO.award} Kazanan`,       value: `**${giveaway.winnerCount}** kişi`, inline: true },
            { name: `${EMO.join} Katılımcı`,      value: `**${count}** kişi`,               inline: true },
            { name: `🎯 Kazanma Şansın`,          value: `**%${chance}**`,                  inline: true },
        );

    if (giveaway.boostRoleId) {
        embed.addFields({
            name: `${EMO.boost} Boost Avantajı`,
            value: `<@&${giveaway.boostRoleId}> rolüne sahip üyeler **${giveaway.boostMultiplier}x** şansa sahip!`,
            inline: false,
        });
    }

    const r = giveaway.requirements || {};
    const reqLines = [];
    if (r.role)    reqLines.push(`> 🎭 <@&${r.role}> rolü zorunlu`);
    if (r.tag)     reqLines.push(`> 🏷️ Sunucu tagı zorunlu`);
    if (r.minAge)  reqLines.push(`> 📅 Hesap yaşı en az **${r.minAge}** gün`);
    if (r.invites) reqLines.push(`> 📨 En az **${r.invites}** davet`);
    if (r.level)   reqLines.push(`> ⭐ Seviye **${r.level}**+`);

    if (reqLines.length) {
        embed.addFields({ name: '📋 Katılım Şartları', value: reqLines.join('\n'), inline: false });
    }

    embed
        .setFooter({
            text: `Düzenleyen: ${giveaway.hostTag || 'Bilinmiyor'} • Katılmak için 🎉 butonuna bas!`,
        })
        .setTimestamp(new Date(giveaway.endsAt));

    return embed;
}

function buildGiveawayButtons() {
    // Row 1: Katıl + Ayrıl
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gw_join')
            .setLabel('🎉 Katıl')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('gw_leave')
            .setLabel('👋 Ayrıl')
            .setStyle(ButtonStyle.Secondary),
    );

    // Row 2: İptal (admin only — kontrol koda bırakıldı)
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gw_cancel')
            .setLabel('🗑️ İptal Et')
            .setStyle(ButtonStyle.Danger),
    );

    return [row1, row2];
}

// ══════════════════════════════════════════════════════════════════════
//  BİTİŞ EMBED
// ══════════════════════════════════════════════════════════════════════
function buildEndedEmbed(giveaway, winners) {
    const embed = new EmbedBuilder()
        .setTimestamp();

    if (winners.length) {
        embed
            .setColor(0x57f287)
            .setTitle(`${EMO.award} Çekiliş Bitti — ${giveaway.prize}`)
            .setDescription(
                `🎊 **Tebrikler kazananlara!**\n\n` +
                winners.map((id, i) => `> ${['🥇','🥈','🥉'][i] || '🏅'} <@${id}>`).join('\n')
            )
            .addFields(
                { name: '🏆 Ödül',         value: giveaway.prize,                                    inline: true },
                { name: '👥 Toplam Katılım', value: `${giveaway.participants?.length || 0} kişi`,     inline: true },
                { name: '🏅 Kazanan Sayısı', value: `${winners.length} kişi`,                        inline: true },
            );
    } else {
        embed
            .setColor(0xed4245)
            .setTitle(`❌ Çekiliş Bitti — ${giveaway.prize}`)
            .setDescription('> Geçerli katılımcı bulunamadı. Çekiliş iptal edildi.');
    }

    embed.setFooter({ text: `Düzenleyen: ${giveaway.hostTag || '?'} | Reroll için butonu kullan` });
    return embed;
}

// ══════════════════════════════════════════════════════════════════════
//  KOMUT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
    name: 'giveaway',
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Çekiliş kontrol panelini açar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const state = DEFAULT_STATE();
        sessions.set(interaction.user.id, state);
        const active = await getActiveGiveaways(interaction.guild.id);
        await interaction.reply(buildDashboard(interaction.guild, state, active));
    },

    // ── Main Interaction Handler ───────────────────────────────────────
    async handleInteraction(interaction, client) {
        const id     = interaction.customId;
        const userId = interaction.user.id;

        // Katıl/Ayrıl herkese açık, diğerleri admin
        const publicActions = ['gw_join', 'gw_leave'];
        if (!publicActions.includes(id)) {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Bu işlem için **Administrator** yetkisi gerekiyor.', flags: 64 });
            }
        }

        let state = sessions.get(userId) || DEFAULT_STATE();

        // ── Ödül Modal ─────────────────────────────────────────────────
        if (id === 'gw_set_prize') {
            const modal = new ModalBuilder().setCustomId('gw_modal_prize').setTitle('🏆 Ödül Belirle');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('prize_input')
                    .setLabel('Ödül adı / açıklaması').setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: Discord Nitro 1 Aylık').setRequired(true).setMaxLength(100)
            ));
            return interaction.showModal(modal);
        }

        // ── Kanal Modal ────────────────────────────────────────────────
        if (id === 'gw_set_channel') {
            const modal = new ModalBuilder().setCustomId('gw_modal_channel').setTitle('📢 Kanal Seç');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_input')
                    .setLabel('Kanal ID\'si').setStyle(TextInputStyle.Short)
                    .setPlaceholder('Kanalın ID\'sini buraya yapıştır').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Süre Modal ─────────────────────────────────────────────────
        if (id === 'gw_set_duration') {
            const modal = new ModalBuilder().setCustomId('gw_modal_duration').setTitle('⏱️ Süre Belirle');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('duration_input')
                    .setLabel('Süre (1d = 1 gün, 12h = 12 saat, 30m = 30dk)').setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: 1d veya 12h veya 30m').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Kazanan Modal ──────────────────────────────────────────────
        if (id === 'gw_set_winners') {
            const modal = new ModalBuilder().setCustomId('gw_modal_winners').setTitle('🏅 Kazanan Sayısı');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('winners_input')
                    .setLabel('Kazanan sayısı (1-20)').setStyle(TextInputStyle.Short)
                    .setPlaceholder('1').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Toggle Şartlar ─────────────────────────────────────────────
        if (id === 'gw_toggle_req') {
            state.showRequirements = !state.showRequirements;
            sessions.set(userId, state);
            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        // ── Toggle Boost ───────────────────────────────────────────────
        if (id === 'gw_toggle_boost') {
            state.showBoost = !state.showBoost;
            if (!state.showBoost) { state.boostRoleId = null; state.boostMultiplier = 1; }
            sessions.set(userId, state);
            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        // ── Şartlar Select ─────────────────────────────────────────────
        if (id === 'gw_select_req') {
            const vals = interaction.values;

            // Önce hepsini sıfırla
            state.requirements = { role: null, tag: false, minAge: null, invites: null, level: null };

            // Seçilenleri işaretle
            if (vals.includes('req_tag')) state.requirements.tag = true;

            sessions.set(userId, state);

            // Değer gerektiren şartlar için ayrı modallar aç
            const needsInput = vals.filter(v => v !== 'req_tag');

            if (needsInput.length > 0) {
                // Her seferinde tek bir modal açılabilir — en fazla 5 input
                const modal = new ModalBuilder().setCustomId('gw_modal_req').setTitle('📋 Şart Değerleri');
                const inputs = [];

                if (vals.includes('req_role')) {
                    inputs.push(new TextInputBuilder()
                        .setCustomId('req_role_input').setLabel('Zorunlu Rol ID\'si')
                        .setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Rol ID (boş bırakırsan iptal)'));
                }
                if (vals.includes('req_age')) {
                    inputs.push(new TextInputBuilder()
                        .setCustomId('req_age_input').setLabel('Min Hesap Yaşı (gün olarak)')
                        .setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 30'));
                }
                if (vals.includes('req_invites')) {
                    inputs.push(new TextInputBuilder()
                        .setCustomId('req_invites_input').setLabel('Min Davet Sayısı')
                        .setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 5'));
                }
                if (vals.includes('req_level')) {
                    inputs.push(new TextInputBuilder()
                        .setCustomId('req_level_input').setLabel('Min Seviye')
                        .setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 10'));
                }

                inputs.slice(0, 5).forEach(inp =>
                    modal.addComponents(new ActionRowBuilder().addComponents(inp))
                );
                return interaction.showModal(modal);
            }

            // Sadece tag seçildiyse direkt güncelle
            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        // ── Boost Select ───────────────────────────────────────────────
        if (id === 'gw_select_boost') {
            state.boostMultiplier = parseInt(interaction.values[0].replace('boost_', ''));
            sessions.set(userId, state);

            const modal = new ModalBuilder().setCustomId('gw_modal_boost_role').setTitle('🚀 Boost Rolü');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('boost_role_input')
                    .setLabel('Boost Rolünün ID\'si').setStyle(TextInputStyle.Short)
                    .setPlaceholder('Rol ID\'sini buraya yapıştır').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Çekiliş Oluştur ────────────────────────────────────────────
        if (id === 'gw_create') {
            state = sessions.get(userId);
            if (!state?.prize || !state?.channelId || !state?.duration) {
                return interaction.reply({ content: '❌ Ödül, kanal ve süre zorunludur!', flags: 64 });
            }

            const channel = interaction.guild.channels.cache.get(state.channelId);
            if (!channel) return interaction.reply({ content: '❌ Kanal bulunamadı.', flags: 64 });

            const endsAt   = Date.now() + state.duration;
            const giveaway = {
                guildId:         interaction.guild.id,
                channelId:       state.channelId,
                messageId:       null,
                hostId:          interaction.user.id,
                hostTag:         `${interaction.user.username}`,
                prize:           state.prize,
                winnerCount:     state.winnerCount,
                endsAt,
                requirements:    state.requirements,
                boostRoleId:     state.boostRoleId,
                boostMultiplier: state.boostMultiplier,
                participants:    [],
                status:          'active',
            };

            await interaction.deferUpdate();

            const gwEmbed = buildGiveawayEmbed(giveaway);
            const gwBtns  = buildGiveawayButtons();
            const msg     = await channel.send({ embeds: [gwEmbed], components: gwBtns });

            giveaway.messageId = msg.id;
            await createGiveaway(giveaway);

            try {
                const { GiveawayManager } = require('../systems/giveawayManager');
                GiveawayManager.schedule(giveaway, client);
            } catch { /* ignore */ }

            sessions.delete(userId);

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle(`${EMO.coin} Çekiliş Başlatıldı!`)
                    .setDescription(
                        `> 🏆 **Ödül:** ${state.prize}\n` +
                        `> 📢 **Kanal:** <#${state.channelId}>\n` +
                        `> ⏰ **Bitiş:** <t:${Math.floor(endsAt / 1000)}:R>\n` +
                        `> 🏅 **Kazanan:** ${state.winnerCount} kişi`
                    )
                    .setFooter({ text: 'İyi çekilişler! 🎉' })
                    .setTimestamp()],
                components: [],
            });
            return;
        }

        // ── Katıl ──────────────────────────────────────────────────────
        if (id === 'gw_join') {
            const { addParticipant, getGiveaway } = require('../../utils/giveawayDB');
            const { GiveawayManager } = require('../systems/giveawayManager');

            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);

            if (!giveaway || giveaway.status !== 'active') {
                return interaction.reply({ content: '❌ Bu çekiliş aktif değil.', flags: 64 });
            }

            const member = interaction.member;
            const r = giveaway.requirements || {};

            // Şart kontrolleri
            if (r.role && r.role !== '__pending__' && !member.roles.cache.has(r.role)) {
                return interaction.reply({
                    content: `❌ Bu çekilişe katılmak için <@&${r.role}> rolüne sahip olman gerekiyor.`,
                    flags: 64,
                });
            }
            if (r.tag) {
                const tag = interaction.guild.vanityURLCode;
                if (tag && !member.displayName.includes(tag) && !member.user.username.includes(tag)) {
                    return interaction.reply({
                        content: `❌ Sunucu tagını (\`${tag}\`) kullanıcı adında bulundurman gerekiyor.`,
                        flags: 64,
                    });
                }
            }
            if (r.minAge && r.minAge !== '__pending__') {
                const ageInDays = (Date.now() - member.user.createdTimestamp) / 86400000;
                if (ageInDays < r.minAge) {
                    return interaction.reply({
                        content: `❌ Hesabın en az **${r.minAge} günlük** olması gerekiyor. (Şu an: ${Math.floor(ageInDays)} gün)`,
                        flags: 64,
                    });
                }
            }

            // Boost çarpanı
            let entries = 1;
            if (giveaway.boostRoleId && member.roles.cache.has(giveaway.boostRoleId)) {
                entries = giveaway.boostMultiplier || 1;
            }

            const result = await addParticipant(interaction.guild.id, msgId, interaction.user.id, entries);

            if (!result.success) {
                if (result.alreadyJoined) {
                    return interaction.reply({ content: '❌ Zaten bu çekilişe katıldın!', flags: 64 });
                }
                return interaction.reply({ content: `❌ Katılım başarısız: ${result.error}`, flags: 64 });
            }

            const boostMsg = entries > 1 ? ` ${EMO.boost} **${entries}x** boost çarpanıyla katıldın!` : '';
            await interaction.reply({
                content: `✅ **${giveaway.prize}** çekilişine katıldın!${boostMsg}`,
                flags: 64,
            });

            await GiveawayManager?.updateEmbed(interaction.guild, msgId, client);
            return;
        }

        // ── Ayrıl ──────────────────────────────────────────────────────
        if (id === 'gw_leave') {
            const { removeParticipant, getGiveaway } = require('../../utils/giveawayDB');
            const { GiveawayManager } = require('../systems/giveawayManager');

            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);

            if (!giveaway || giveaway.status !== 'active') {
                return interaction.reply({ content: '❌ Bu çekiliş aktif değil.', flags: 64 });
            }

            const result = await removeParticipant(interaction.guild.id, msgId, interaction.user.id);
            await interaction.reply({
                content: result.success ? '✅ Çekilişten ayrıldın.' : '❌ Bu çekilişe katılmamışsın.',
                flags: 64,
            });

            if (result.success) {
                await GiveawayManager?.updateEmbed(interaction.guild, msgId, client);
            }
            return;
        }

        // ── İptal Et ───────────────────────────────────────────────────
        if (id === 'gw_cancel') {
            const { updateGiveaway, getGiveaway } = require('../../utils/giveawayDB');
            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);
            if (!giveaway) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });

            await updateGiveaway(interaction.guild.id, msgId, { status: 'cancelled' });

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle(`❌ Çekiliş İptal Edildi — ${giveaway.prize}`)
                    .setDescription(`> İptal eden: <@${interaction.user.id}>\n> Toplam katılımcı: ${giveaway.participants?.length || 0}`)
                    .setTimestamp()],
                components: [],
            });
            return;
        }

        // ── Reroll ─────────────────────────────────────────────────────
        if (id === 'gw_reroll') {
            const { getGiveaway, pickWinners, updateGiveaway } = require('../../utils/giveawayDB');
            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);
            if (!giveaway) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });

            const winners = pickWinners(giveaway.participants || [], giveaway.winnerCount);
            await updateGiveaway(interaction.guild.id, msgId, { winners });

            const { ActionRowBuilder: AR, ButtonBuilder: BB, ButtonStyle: BS } = require('discord.js');
            const rerollEmbed = buildEndedEmbed({ ...giveaway, prize: `${giveaway.prize} (Reroll)` }, winners);

            await interaction.update({
                embeds: [rerollEmbed],
                components: [new AR().addComponents(
                    new BB().setCustomId('gw_reroll').setLabel('🔄 Tekrar Reroll').setStyle(BS.Primary)
                )],
            });

            // DM kazananlara
            for (const wId of winners) {
                try {
                    const u = await client.users.fetch(wId);
                    await u.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('🎉 Çekilişi Kazandın!')
                            .setDescription(`> **Ödül:** ${giveaway.prize}\n> **Sunucu:** ${interaction.guild.name}\n\nÖdülünü almak için sunucu yetkililerine ulaş!`)
                            .setTimestamp()],
                    }).catch(() => {});
                } catch { /* DM kapalı */ }
            }
            return;
        }
    },

    // ── Modal Handler ──────────────────────────────────────────────────
    async handleModal(interaction, client) {
        const id     = interaction.customId;
        const userId = interaction.user.id;
        let state    = sessions.get(userId) || DEFAULT_STATE();

        if (id === 'gw_modal_prize') {
            state.prize = interaction.fields.getTextInputValue('prize_input');
        }

        if (id === 'gw_modal_channel') {
            const chId = interaction.fields.getTextInputValue('channel_input').trim();
            const ch   = interaction.guild.channels.cache.get(chId);
            if (!ch || ch.type !== ChannelType.GuildText) {
                return interaction.reply({ content: '❌ Geçersiz kanal ID\'si. Lütfen bir metin kanalı ID\'si gir.', flags: 64 });
            }
            state.channelId = chId;
        }

        if (id === 'gw_modal_duration') {
            const raw = interaction.fields.getTextInputValue('duration_input').trim();
            const dur = ms(raw);
            if (!dur || dur < 60000) {
                return interaction.reply({ content: '❌ Geçersiz süre! Örn: `1d`, `12h`, `30m` (min 1 dakika)', flags: 64 });
            }
            state.duration = dur;
        }

        if (id === 'gw_modal_winners') {
            const num = parseInt(interaction.fields.getTextInputValue('winners_input'));
            if (isNaN(num) || num < 1 || num > 20) {
                return interaction.reply({ content: '❌ Kazanan sayısı 1-20 arasında olmalıdır.', flags: 64 });
            }
            state.winnerCount = num;
        }

        if (id === 'gw_modal_req') {
            // Her field try-catch ile al — sadece modal'da olanları al
            const safeGet = (fieldId) => {
                try { return interaction.fields.getTextInputValue(fieldId); }
                catch { return null; }
            };

            const roleInput    = safeGet('req_role_input')?.trim();
            const ageInput     = safeGet('req_age_input')?.trim();
            const inviteInput  = safeGet('req_invites_input')?.trim();
            const levelInput   = safeGet('req_level_input')?.trim();

            if (roleInput)   state.requirements.role    = roleInput || null;
            if (ageInput)    state.requirements.minAge  = parseInt(ageInput)   || null;
            if (inviteInput) state.requirements.invites = parseInt(inviteInput) || null;
            if (levelInput)  state.requirements.level   = parseInt(levelInput)  || null;
        }

        if (id === 'gw_modal_boost_role') {
            const roleId = interaction.fields.getTextInputValue('boost_role_input').trim();
            const role   = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.reply({ content: '❌ Rol bulunamadı. Geçerli bir rol ID\'si gir.', flags: 64 });
            }
            state.boostRoleId = roleId;
        }

        sessions.set(userId, state);
        const active = await getActiveGiveaways(interaction.guild.id);
        return interaction.update(buildDashboard(interaction.guild, state, active));
    },

    buildGiveawayEmbed,
    buildGiveawayButtons,
    buildEndedEmbed,
    sessions,
};
