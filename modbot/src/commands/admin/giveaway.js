'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GIVEAWAY — Dashboard Panel Sistemi                                 ║
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

// ══════════════════════════════════════════════════════════════════════
//  Dashboard State (memory — her interaction kendi state'ini taşır)
// ══════════════════════════════════════════════════════════════════════
// state: { prize, channelId, duration, winnerCount,
//          boostRoleId, boostMultiplier,
//          requirements: { role, tag, minAge, invites, level } }
const DEFAULT_STATE = () => ({
    prize:           null,
    channelId:       null,
    duration:        null,   // ms cinsinden
    winnerCount:     1,
    boostRoleId:     null,
    boostMultiplier: 1,
    requirements: {
        role:    null,
        tag:     false,
        minAge:  null,
        invites: null,
        level:   null,
    },
    showRequirements: false,
    showBoost:        false,
});

// Aktif dashboard oturumları (userId → state)
const sessions = new Map();

// ══════════════════════════════════════════════════════════════════════
//  EMBED + COMPONENT BUILDER
// ══════════════════════════════════════════════════════════════════════
function buildDashboard(guild, state, activeGiveaways = []) {
    const s = state;

    // ── Ana Embed ──────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setAuthor({ name: `${guild.name} — Çekiliş Paneli`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('🎉 Çekiliş Başlatma Paneli')
        .setTimestamp();

    // ── Bölüm 1: Çekiliş Başlatma ─────────────────────────────────────
    const prizeStr    = s.prize      ? `> 🏆 **Ödül:** ${s.prize}`                 : '> 🏆 **Ödül:** `Ayarlanmamış`';
    const channelStr  = s.channelId  ? `> 📢 **Kanal:** <#${s.channelId}>`         : '> 📢 **Kanal:** `Ayarlanmamış`';
    const durStr      = s.duration   ? `> ⏱️ **Süre:** ${ms(s.duration, { long: true })}` : '> ⏱️ **Süre:** `Ayarlanmamış`';
    const winnerStr   = `> 🏅 **Kazanan:** ${s.winnerCount} kişi`;

    embed.addFields({
        name: '🎊 Çekiliş Başlatma',
        value: [prizeStr, channelStr, durStr, winnerStr].join('\n'),
        inline: false,
    });

    // ── Bölüm 2: Çekiliş Şartları ──────────────────────────────────────
    const reqParts = [];
    if (s.requirements.role)    reqParts.push(`> 🎭 **Zorunlu Rol:** <@&${s.requirements.role}>`);
    if (s.requirements.tag)     reqParts.push(`> 🏷️ **Sunucu Tagı:** Aktif`);
    if (s.requirements.minAge)  reqParts.push(`> 📅 **Min Hesap Yaşı:** ${s.requirements.minAge} gün`);
    if (s.requirements.invites) reqParts.push(`> 📨 **Davet Şartı:** ${s.requirements.invites} davet`);
    if (s.requirements.level)   reqParts.push(`> ⭐ **Seviye Şartı:** Seviye ${s.requirements.level}+`);

    embed.addFields({
        name: `📋 Çekiliş Şartları ${s.showRequirements ? '`Aktif ✅`' : '`Kapalı ❌`'}`,
        value: reqParts.length ? reqParts.join('\n') : '> Şart yok — herkes katılabilir',
        inline: false,
    });

    // ── Bölüm 3: Boost ────────────────────────────────────────────────
    const boostStr = s.boostRoleId
        ? `> 🚀 **Boost Rolü:** <@&${s.boostRoleId}> → **${s.boostMultiplier}x** katılım`
        : '> 🚀 **Boost Rolü:** `Ayarlanmamış`';

    embed.addFields({
        name: `⚙️ Çekiliş Ayarları`,
        value: boostStr,
        inline: false,
    });

    // Aktif çekilişler
    if (activeGiveaways.length > 0) {
        const list = activeGiveaways.slice(0, 3).map(g =>
            `> 🎉 **${g.prize}** — <t:${Math.floor(g.endsAt / 1000)}:R> — ${g.participants?.length || 0} katılımcı`
        ).join('\n');
        embed.addFields({ name: `📊 Aktif Çekilişler (${activeGiveaways.length})`, value: list, inline: false });
    }

    embed.setFooter({ text: 'Tüm ayarları yapın → Çekiliş Oluştur butonuna basın' });

    // ── Row 1: Ödül + Kanal + Süre + Kazanan ──────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_set_prize').setLabel('🏆 Ödül Belirle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_channel').setLabel('📢 Kanal Seç').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_duration').setLabel('⏱️ Süre Belirle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gw_set_winners').setLabel('🏅 Kazanan Sayısı').setStyle(ButtonStyle.Secondary),
    );

    // ── Row 2: Şartlar toggle + Boost toggle ──────────────────────────
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gw_toggle_req')
            .setLabel(s.showRequirements ? '📋 Şartlar: Aktif' : '📋 Şartlar: Kapalı')
            .setStyle(s.showRequirements ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('gw_toggle_boost')
            .setLabel(s.showBoost ? '🚀 Boost: Aktif' : '🚀 Boost: Kapalı')
            .setStyle(s.showBoost ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('gw_create')
            .setLabel('🎉 Çekiliş Oluştur')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!s.prize || !s.channelId || !s.duration),
    );

    const components = [row1, row2];

    // ── Row 3: Şartlar select menu (showRequirements ise) ─────────────
    if (s.showRequirements) {
        const reqMenu = new StringSelectMenuBuilder()
            .setCustomId('gw_select_req')
            .setPlaceholder('📋 Katılım şartı ekle...')
            .setMinValues(0)
            .setMaxValues(4)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('🎭 Zorunlu Rol').setValue('req_role')
                    .setDescription('Sadece bu role sahip olanlar katılabilir')
                    .setDefault(!!s.requirements.role),
                new StringSelectMenuOptionBuilder().setLabel('🏷️ Sunucu Tagı').setValue('req_tag')
                    .setDescription('Sunucu tagı takması zorunlu')
                    .setDefault(s.requirements.tag),
                new StringSelectMenuOptionBuilder().setLabel('📅 Min Hesap Yaşı').setValue('req_age')
                    .setDescription('Hesabın belirli bir yaşta olması gerekiyor')
                    .setDefault(!!s.requirements.minAge),
                new StringSelectMenuOptionBuilder().setLabel('📨 Davet Şartı').setValue('req_invites')
                    .setDescription('Belirli sayıda davet getirmiş olma')
                    .setDefault(!!s.requirements.invites),
                new StringSelectMenuOptionBuilder().setLabel('⭐ Seviye Şartı').setValue('req_level')
                    .setDescription('Belirli seviyeye ulaşmış olma')
                    .setDefault(!!s.requirements.level),
            );
        components.push(new ActionRowBuilder().addComponents(reqMenu));
    }

    // ── Row 4: Boost multiplier select (showBoost ise) ────────────────
    if (s.showBoost) {
        const boostMenu = new StringSelectMenuBuilder()
            .setCustomId('gw_select_boost')
            .setPlaceholder('🚀 Boost çarpanı seç...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2x Katılım').setValue('boost_2')
                    .setDescription('Boost rolü olanlara 2 kat şans')
                    .setDefault(s.boostMultiplier === 2),
                new StringSelectMenuOptionBuilder().setLabel('3x Katılım').setValue('boost_3')
                    .setDescription('Boost rolü olanlara 3 kat şans')
                    .setDefault(s.boostMultiplier === 3),
                new StringSelectMenuOptionBuilder().setLabel('4x Katılım').setValue('boost_4')
                    .setDescription('Boost rolü olanlara 4 kat şans')
                    .setDefault(s.boostMultiplier === 4),
            );
        components.push(new ActionRowBuilder().addComponents(boostMenu));
    }

    return { embeds: [embed], components, flags: 64 };
}

// ══════════════════════════════════════════════════════════════════════
//  AKTİF ÇEKİLİŞ EMBED (katılım mesajı)
// ══════════════════════════════════════════════════════════════════════
function buildGiveawayEmbed(giveaway) {
    const endTs   = Math.floor(giveaway.endsAt / 1000);
    const count   = giveaway.participants?.length || 0;
    const chance  = count > 0
        ? Math.min(100, Math.round((giveaway.winnerCount / count) * 100))
        : 100;

    const reqLines = [];
    const r = giveaway.requirements || {};
    if (r.role)    reqLines.push(`> 🎭 <@&${r.role}> rolü zorunlu`);
    if (r.tag)     reqLines.push(`> 🏷️ Sunucu tagı zorunlu`);
    if (r.minAge)  reqLines.push(`> 📅 Hesap yaşı en az ${r.minAge} gün`);
    if (r.invites) reqLines.push(`> 📨 En az ${r.invites} davet`);
    if (r.level)   reqLines.push(`> ⭐ Seviye ${r.level}+`);

    const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`🎉 ${giveaway.prize}`)
        .addFields(
            { name: '⏰ Bitiş',           value: `<t:${endTs}:R> (<t:${endTs}:F>)`,                           inline: false },
            { name: '🏅 Kazanan',         value: `**${giveaway.winnerCount}** kişi`,                           inline: true  },
            { name: '👥 Katılımcı',       value: `**${count}** kişi`,                                         inline: true  },
            { name: '🎯 Kazanma Şansın',  value: `**%${chance}**`,                                            inline: true  },
        );

    if (giveaway.boostRoleId) {
        embed.addFields({
            name: '🚀 Boost Avantajı',
            value: `> <@&${giveaway.boostRoleId}> rolü → **${giveaway.boostMultiplier}x** şans`,
            inline: false,
        });
    }

    if (reqLines.length) {
        embed.addFields({ name: '📋 Katılım Şartları', value: reqLines.join('\n'), inline: false });
    }

    embed
        .setFooter({ text: `Düzenleyen: ${giveaway.hostTag || 'Bilinmiyor'} | ID: ${giveaway.messageId}` })
        .setTimestamp();

    return embed;
}

function buildGiveawayButtons(isAdmin = false) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_join').setLabel('🎉 Katıl').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gw_leave').setLabel('👋 Ayrıl').setStyle(ButtonStyle.Secondary),
    );
    if (isAdmin) {
        row.addComponents(
            new ButtonBuilder().setCustomId('gw_cancel').setLabel('🗑️ İptal Et').setStyle(ButtonStyle.Danger),
        );
    }
    return row;
}

// ══════════════════════════════════════════════════════════════════════
//  BİTİŞ EMBED
// ══════════════════════════════════════════════════════════════════════
function buildEndedEmbed(giveaway, winners) {
    const embed = new EmbedBuilder()
        .setColor(winners.length ? 0x57f287 : 0xed4245)
        .setTitle(`🎉 Çekiliş Bitti — ${giveaway.prize}`)
        .setTimestamp();

    if (winners.length) {
        embed.setDescription(winners.map(id => `> 🏆 <@${id}>`).join('\n'));
        embed.addFields(
            { name: '🏅 Kazananlar', value: winners.map(id => `<@${id}>`).join(', '), inline: false },
            { name: '👥 Toplam Katılım', value: `${giveaway.participants?.length || 0} kişi`, inline: true },
        );
    } else {
        embed.setDescription('> Geçerli katılımcı bulunamadığı için çekiliş iptal edildi.');
    }

    embed.setFooter({ text: `Çekilişi Düzenleyen: ${giveaway.hostTag || '?'} | ID: ${giveaway.messageId}` });
    return embed;
}

function buildRerollButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('gw_reroll')
            .setLabel('🔄 Reroll (Yeniden Çek)')
            .setStyle(ButtonStyle.Primary)
            .setDefaultMemberPermissions
    );
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

    // ── İnteraction handler (interactionCreate'ten çağrılır) ──────────
    async handleInteraction(interaction, client) {
        const id = interaction.customId;

        // ── Sadece admin kullanabilir ──────────────────────────────────
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            // Katıl/Ayrıl butonları herkese açık
            if (id !== 'gw_join' && id !== 'gw_leave') {
                return interaction.reply({ content: '❌ Bu işlem için Administrator yetkisi gerekiyor.', flags: 64 });
            }
        }

        const userId = interaction.user.id;
        let state    = sessions.get(userId) || DEFAULT_STATE();

        // ── DASHBOARD BUTONLARI ────────────────────────────────────────

        if (id === 'gw_set_prize') {
            const modal = new ModalBuilder().setCustomId('gw_modal_prize').setTitle('🏆 Ödül Belirle');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('prize_input').setLabel('Ödül adı / açıklaması')
                    .setStyle(TextInputStyle.Short).setPlaceholder('Örn: Discord Nitro 1 Aylık').setRequired(true).setMaxLength(100)
            ));
            return interaction.showModal(modal);
        }

        if (id === 'gw_set_channel') {
            const modal = new ModalBuilder().setCustomId('gw_modal_channel').setTitle('📢 Kanal Belirle');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_input').setLabel('Kanal ID\'si')
                    .setStyle(TextInputStyle.Short).setPlaceholder('Kanal ID\'sini buraya yaz').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (id === 'gw_set_duration') {
            const modal = new ModalBuilder().setCustomId('gw_modal_duration').setTitle('⏱️ Süre Belirle');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('duration_input').setLabel('Süre (örn: 1d, 12h, 30m)')
                    .setStyle(TextInputStyle.Short).setPlaceholder('1d = 1 gün, 12h = 12 saat, 30m = 30 dakika').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (id === 'gw_set_winners') {
            const modal = new ModalBuilder().setCustomId('gw_modal_winners').setTitle('🏅 Kazanan Sayısı');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('winners_input').setLabel('Kazanan sayısı (1-20)')
                    .setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (id === 'gw_toggle_req') {
            state.showRequirements = !state.showRequirements;
            sessions.set(userId, state);
            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        if (id === 'gw_toggle_boost') {
            state.showBoost = !state.showBoost;
            if (!state.showBoost) { state.boostRoleId = null; state.boostMultiplier = 1; }
            sessions.set(userId, state);
            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        // ── Select Menu: Şartlar ───────────────────────────────────────
        if (id === 'gw_select_req') {
            const vals = interaction.values;
            // Seçilen şartları sıfırla, sonra modal ile doldur
            state.requirements = { role: null, tag: false, minAge: null, invites: null, level: null };

            if (vals.includes('req_tag'))     state.requirements.tag = true;
            if (vals.includes('req_role'))    state.requirements.role = '__pending__';
            if (vals.includes('req_age'))     state.requirements.minAge = '__pending__';
            if (vals.includes('req_invites')) state.requirements.invites = '__pending__';
            if (vals.includes('req_level'))   state.requirements.level = '__pending__';

            sessions.set(userId, state);

            // Eğer değer gerektiren şartlar seçildiyse modal aç
            const needsInput = vals.filter(v => v !== 'req_tag');
            if (needsInput.length > 0) {
                const modal = new ModalBuilder().setCustomId('gw_modal_req').setTitle('📋 Şart Değerleri');
                const inputs = [];
                if (vals.includes('req_role'))    inputs.push(new TextInputBuilder().setCustomId('req_role_input').setLabel('Zorunlu Rol ID\'si').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Rol ID'));
                if (vals.includes('req_age'))     inputs.push(new TextInputBuilder().setCustomId('req_age_input').setLabel('Min Hesap Yaşı (gün)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 30'));
                if (vals.includes('req_invites')) inputs.push(new TextInputBuilder().setCustomId('req_invites_input').setLabel('Min Davet Sayısı').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 5'));
                if (vals.includes('req_level'))   inputs.push(new TextInputBuilder().setCustomId('req_level_input').setLabel('Min Seviye').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: 10'));

                inputs.slice(0, 5).forEach(inp => modal.addComponents(new ActionRowBuilder().addComponents(inp)));
                return interaction.showModal(modal);
            }

            const active = await getActiveGiveaways(interaction.guild.id);
            return interaction.update(buildDashboard(interaction.guild, state, active));
        }

        // ── Select Menu: Boost çarpanı ─────────────────────────────────
        if (id === 'gw_select_boost') {
            const val = interaction.values[0];
            state.boostMultiplier = parseInt(val.replace('boost_', ''));

            // Boost rolü ID'si için modal
            const modal = new ModalBuilder().setCustomId('gw_modal_boost_role').setTitle('🚀 Boost Rolü');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('boost_role_input').setLabel('Boost Rolünün ID\'si')
                    .setStyle(TextInputStyle.Short).setPlaceholder('Rol ID\'sini buraya yaz').setRequired(true)
            ));
            sessions.set(userId, state);
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
                messageId:       null, // mesaj atılınca doldurulacak
                hostId:          interaction.user.id,
                hostTag:         interaction.user.tag,
                prize:           state.prize,
                winnerCount:     state.winnerCount,
                endsAt,
                requirements:    state.requirements,
                boostRoleId:     state.boostRoleId,
                boostMultiplier: state.boostMultiplier,
            };

            const gwEmbed  = buildGiveawayEmbed(giveaway);
            const gwBtns   = buildGiveawayButtons(true);

            await interaction.deferUpdate();
            const msg = await channel.send({ embeds: [gwEmbed], components: [gwBtns] });

            giveaway.messageId = msg.id;
            await createGiveaway(giveaway);

            // GiveawayManager'a bildir
            const { GiveawayManager } = require('../systems/giveawayManager');
            if (GiveawayManager) GiveawayManager.schedule(giveaway, client);

            sessions.delete(userId);

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('✅ Çekiliş Oluşturuldu!')
                    .setDescription(`> 🎉 **${state.prize}** çekilişi <#${state.channelId}> kanalında başlatıldı!\n> ⏰ Bitiş: <t:${Math.floor(endsAt / 1000)}:R>`)
                    .setTimestamp()],
                components: [],
            });
            return;
        }

        // ── Katıl / Ayrıl (herkes) ────────────────────────────────────
        if (id === 'gw_join' || id === 'gw_leave') {
            const { addParticipant, removeParticipant, getGiveaway, updateGiveaway } = require('../../utils/giveawayDB');
            const { GiveawayManager } = require('../systems/giveawayManager');

            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);

            if (!giveaway) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });
            if (giveaway.status !== 'active') return interaction.reply({ content: '❌ Bu çekiliş aktif değil.', flags: 64 });

            // Şart kontrolleri
            const member = interaction.member;
            const r = giveaway.requirements || {};

            if (r.role && r.role !== '__pending__' && !member.roles.cache.has(r.role)) {
                return interaction.reply({ content: `❌ Bu çekilişe katılmak için <@&${r.role}> rolüne ihtiyacın var.`, flags: 64 });
            }
            if (r.tag) {
                const tag = interaction.guild.vanityURLCode;
                if (tag && !member.user.username.includes(tag) && !member.displayName.includes(tag)) {
                    return interaction.reply({ content: `❌ Bu çekilişe katılmak için sunucu tagını (\`${tag}\`) kullanman gerekiyor.`, flags: 64 });
                }
            }
            if (r.minAge && r.minAge !== '__pending__') {
                const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
                if (accountAge < r.minAge) {
                    return interaction.reply({ content: `❌ Hesabın en az **${r.minAge} günlük** olması gerekiyor. (Şu an: ${Math.floor(accountAge)} gün)`, flags: 64 });
                }
            }

            // Boost çarpanı hesapla
            let entries = 1;
            if (giveaway.boostRoleId && member.roles.cache.has(giveaway.boostRoleId)) {
                entries = giveaway.boostMultiplier || 1;
            }

            if (id === 'gw_join') {
                const result = await addParticipant(interaction.guild.id, msgId, interaction.user.id, entries);
                if (!result.success) {
                    if (result.alreadyJoined) return interaction.reply({ content: '❌ Zaten bu çekilişe katıldın!', flags: 64 });
                    return interaction.reply({ content: `❌ Katılım başarısız: ${result.error}`, flags: 64 });
                }

                const boostMsg = entries > 1 ? ` 🚀 **${entries}x** boost çarpanıyla katıldın!` : '';
                await interaction.reply({ content: `✅ **${giveaway.prize}** çekilişine katıldın!${boostMsg}`, flags: 64 });
            } else {
                const result = await removeParticipant(interaction.guild.id, msgId, interaction.user.id);
                await interaction.reply({ content: result.success ? `✅ Çekilişten ayrıldın.` : '❌ Bu çekilişe katılmış değildin.', flags: 64 });
            }

            // Embed'i güncelle
            await GiveawayManager?.updateEmbed(interaction.guild, msgId, client);
            return;
        }

        // ── İptal Et ──────────────────────────────────────────────────
        if (id === 'gw_cancel') {
            const { updateGiveaway, getGiveaway } = require('../../utils/giveawayDB');
            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);
            if (!giveaway) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });

            await updateGiveaway(interaction.guild.id, msgId, { status: 'cancelled' });

            const cancelEmbed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle(`❌ Çekiliş İptal Edildi — ${giveaway.prize}`)
                .setDescription(`> İptal eden: <@${interaction.user.id}>`)
                .setTimestamp();

            await interaction.update({ embeds: [cancelEmbed], components: [] });
            return;
        }

        // ── Reroll ────────────────────────────────────────────────────
        if (id === 'gw_reroll') {
            const { getGiveaway, pickWinners, updateGiveaway } = require('../../utils/giveawayDB');
            const msgId    = interaction.message.id;
            const giveaway = await getGiveaway(interaction.guild.id, msgId);
            if (!giveaway) return interaction.reply({ content: '❌ Çekiliş bulunamadı.', flags: 64 });

            const winners = pickWinners(giveaway.participants || [], giveaway.winnerCount);
            await updateGiveaway(interaction.guild.id, msgId, { winners });

            const rerollEmbed = buildEndedEmbed(giveaway, winners);
            rerollEmbed.setTitle(`🔄 Reroll — ${giveaway.prize}`);

            await interaction.update({ embeds: [rerollEmbed] });

            // Kazananlara DM
            for (const winnerId of winners) {
                try {
                    const user = await client.users.fetch(winnerId);
                    await user.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('🎉 Tebrikler! Çekilişi Kazandın!')
                            .setDescription(`> **${giveaway.prize}** çekilişini kazandın!\n> Ödülünü almak için sunucu yetkililerine ulaş.`)
                            .setTimestamp()],
                    }).catch(() => {});
                } catch { /* DM kapalı */ }
            }
            return;
        }
    },

    // Modal submit handler
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
                return interaction.reply({ content: '❌ Geçersiz kanal ID\'si veya metin kanalı değil.', flags: 64 });
            }
            state.channelId = chId;
        }

        if (id === 'gw_modal_duration') {
            const raw  = interaction.fields.getTextInputValue('duration_input').trim();
            const dur  = ms(raw);
            if (!dur || dur < 60000) {
                return interaction.reply({ content: '❌ Geçersiz süre. Örn: `1d`, `12h`, `30m` (min 1 dakika)', flags: 64 });
            }
            state.duration = dur;
        }

        if (id === 'gw_modal_winners') {
            const num = parseInt(interaction.fields.getTextInputValue('winners_input'));
            if (isNaN(num) || num < 1 || num > 20) {
                return interaction.reply({ content: '❌ Kazanan sayısı 1-20 arası olmalıdır.', flags: 64 });
            }
            state.winnerCount = num;
        }

        if (id === 'gw_modal_req') {
            const roleInput    = interaction.fields.getTextInputValue('req_role_input')?.trim();
            const ageInput     = interaction.fields.getTextInputValue('req_age_input')?.trim();
            const inviteInput  = interaction.fields.getTextInputValue('req_invites_input')?.trim();
            const levelInput   = interaction.fields.getTextInputValue('req_level_input')?.trim();

            if (roleInput)   state.requirements.role    = roleInput;
            if (ageInput)    state.requirements.minAge  = parseInt(ageInput) || null;
            if (inviteInput) state.requirements.invites = parseInt(inviteInput) || null;
            if (levelInput)  state.requirements.level   = parseInt(levelInput) || null;
        }

        if (id === 'gw_modal_boost_role') {
            const roleId = interaction.fields.getTextInputValue('boost_role_input').trim();
            const role   = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.reply({ content: '❌ Rol bulunamadı. Geçerli bir Rol ID\'si gir.', flags: 64 });
            state.boostRoleId = roleId;
        }

        sessions.set(userId, state);
        const active = await getActiveGiveaways(interaction.guild.id);
        return interaction.update(buildDashboard(interaction.guild, state, active));
    },

    // Dışa aktar (giveawayManager kullanır)
    buildGiveawayEmbed,
    buildGiveawayButtons,
    buildEndedEmbed,
    buildRerollButton,
    sessions,
};
