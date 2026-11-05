'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  /ayarlar — Sadece sunucu kurucusu kullanabilir                     ║
// ║  Sunucuya özel tüm bot ayarları burada yönetilir                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType,
} = require('discord.js');
const { getSettings, saveSettings } = require('../../utils/guildSettings');
const { clearConfigCache }          = require('../../utils/getGuildConfig');
const e = require('../../emojiConfig');

// Aktif ayar oturumları (userId → state)
const sessions = new Map();

// ══════════════════════════════════════════════════════════════════════
//  ANA PANEL EMBED
// ══════════════════════════════════════════════════════════════════════
function buildMainEmbed(guild, settings) {
    const s = settings;

    const sistemDurumu = [
        `> ${s.systems.antiSpam   ? '🟢' : '🔴'} Anti-Spam`,
        `> ${s.systems.antiLink   ? '🟢' : '🔴'} Anti-Link`,
        `> ${s.systems.antiRaid   ? '🟢' : '🔴'} Anti-Raid`,
        `> ${s.systems.wordFilter ? '🟢' : '🔴'} Küfür Filtresi`,
        `> ${s.systems.ticket     ? '🟢' : '🔴'} Ticket Sistemi`,
        `> ${s.systems.welcomeMsg ? '🟢' : '🔴'} Hoşgeldin/Veda`,
        `> ${s.systems.modLogs    ? '🟢' : '🔴'} Mod Logları`,
    ].join('\n');

    const rolDurumu = [
        `> 👮 Admin Rolü: ${s.roles.admin     ? `<@&${s.roles.admin}>`     : '`Ayarlanmamış`'}`,
        `> 🛡️ Mod Rolü:   ${s.roles.moderator ? `<@&${s.roles.moderator}>` : '`Ayarlanmamış`'}`,
        `> 👤 Üye Rolü:   ${s.roles.member    ? `<@&${s.roles.member}>`    : '`Ayarlanmamış`'}`,
        `> 🔇 Muted Rolü: ${s.roles.muted     ? `<@&${s.roles.muted}>`     : '`Ayarlanmamış`'}`,
    ].join('\n');

    const kanalDurumu = [
        `> 📋 Mod Log:     ${s.channels.modLog       ? `<#${s.channels.modLog}>`       : '`Ayarlanmamış`'}`,
        `> 📊 Sunucu Log:  ${s.channels.serverLog    ? `<#${s.channels.serverLog}>`    : '`Ayarlanmamış`'}`,
        `> 🎫 Ticket Log:  ${s.channels.ticketLog    ? `<#${s.channels.ticketLog}>`    : '`Ayarlanmamış`'}`,
        `> 👋 Hoşgeldin:   ${s.channels.welcomeChannel ? `<#${s.channels.welcomeChannel}>` : '`Ayarlanmamış`'}`,
    ].join('\n');

    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({
            name: `${guild.name} — Bot Ayarları`,
            iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTitle(`${e.success || '⚙️'} Sunucu Ayar Paneli`)
        .setDescription(`Aşağıdaki butonlardan ayar kategorisini seç.`)
        .addFields(
            { name: '🔧 Sistem Durumları', value: sistemDurumu, inline: true  },
            { name: '👥 Roller',           value: rolDurumu,    inline: true  },
            { name: '\u200b',              value: '\u200b',     inline: true  },
            { name: '📢 Kanallar',         value: kanalDurumu,  inline: false },
        )
        .setFooter({ text: `Son güncelleme: ${s.updatedAt ? new Date(s.updatedAt).toLocaleString('tr-TR') : 'Hiç'}` })
        .setTimestamp();
}

function buildMainButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ayar_sistemler').setLabel('🔧 Sistemler').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ayar_roller').setLabel('👥 Roller').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ayar_kanallar').setLabel('📢 Kanallar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ayar_koruma').setLabel('🛡️ Koruma').setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ayar_ticket').setLabel('🎫 Ticket').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ayar_hosgeldin').setLabel('👋 Hoşgeldin').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ayar_kayit').setLabel('📝 Kayıt').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ayar_kapat').setLabel('❌ Kapat').setStyle(ButtonStyle.Danger),
        ),
    ];
}

// ══════════════════════════════════════════════════════════════════════
//  KOMUT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
    name: 'ayarlar',
    data: new SlashCommandBuilder()
        .setName('ayarlar')
        .setDescription('Sunucu bot ayarlarını yönetir (Sadece kurucu)'),

    async execute(interaction, client) {
        // ── Sadece kurucu kullanabilir ─────────────────────────────────
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle('❌ Yetki Yetersiz')
                    .setDescription('Bu komutu yalnızca **sunucu kurucusu** kullanabilir.')
                    .setTimestamp()],
                flags: 64,
            });
        }

        await interaction.deferReply({ flags: 64 });

        const settings = await getSettings(interaction.guild.id);
        sessions.set(interaction.user.id, { guildId: interaction.guild.id, settings });

        await interaction.editReply({
            embeds:     [buildMainEmbed(interaction.guild, settings)],
            components: buildMainButtons(),
        });
    },

    // ── Buton Handler ──────────────────────────────────────────────────
    async handleButton(interaction, client) {
        const id     = interaction.customId;
        const userId = interaction.user.id;

        // Kurucu kontrolü
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ Sadece sunucu kurucusu kullanabilir.', flags: 64 });
        }

        const guild    = interaction.guild;
        let   settings = (sessions.get(userId) || {}).settings || await getSettings(guild.id);

        // ── Kapat ──────────────────────────────────────────────────────
        if (id === 'ayar_kapat') {
            sessions.delete(userId);
            return interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('✅ Ayarlar Kapatıldı')
                    .setDescription('Tüm değişiklikler kaydedildi.')
                    .setTimestamp()],
                components: [],
            });
        }

        // ── Ana menüye dön ─────────────────────────────────────────────
        if (id === 'ayar_ana_menu') {
            settings = await getSettings(guild.id);
            sessions.set(userId, { guildId: guild.id, settings });
            return interaction.update({
                embeds:     [buildMainEmbed(guild, settings)],
                components: buildMainButtons(),
            });
        }

        // ── Sistemler ──────────────────────────────────────────────────
        if (id === 'ayar_sistemler') {
            const s = settings.systems;
            const menu = new StringSelectMenuBuilder()
                .setCustomId('ayar_sistemler_select')
                .setPlaceholder('Aktif/pasif etmek istediğin sistemleri seç...')
                .setMinValues(0)
                .setMaxValues(7)
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('🛡️ Anti-Spam').setValue('antiSpam')
                        .setDescription('Spam koruması').setDefault(s.antiSpam),
                    new StringSelectMenuOptionBuilder().setLabel('🔗 Anti-Link').setValue('antiLink')
                        .setDescription('İzinsiz link engelleme').setDefault(s.antiLink),
                    new StringSelectMenuOptionBuilder().setLabel('🚨 Anti-Raid').setValue('antiRaid')
                        .setDescription('Toplu katılım koruması').setDefault(s.antiRaid),
                    new StringSelectMenuOptionBuilder().setLabel('🤬 Küfür Filtresi').setValue('wordFilter')
                        .setDescription('Otomatik küfür silme').setDefault(s.wordFilter),
                    new StringSelectMenuOptionBuilder().setLabel('🎫 Ticket').setValue('ticket')
                        .setDescription('Destek ticket sistemi').setDefault(s.ticket),
                    new StringSelectMenuOptionBuilder().setLabel('👋 Hoşgeldin/Veda').setValue('welcomeMsg')
                        .setDescription('Üye karşılama mesajları').setDefault(s.welcomeMsg),
                    new StringSelectMenuOptionBuilder().setLabel('📊 Mod Logları').setValue('modLogs')
                        .setDescription('Moderasyon işlemlerini kaydet').setDefault(s.modLogs),
                );

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('🔧 Sistem Ayarları')
                .setDescription('Aşağıdan aktif etmek istediğin sistemleri seç.\nSeçili olanlar **aktif**, seçilmeyenler **pasif** olacak.');

            return interaction.update({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(menu),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ayar_ana_menu').setLabel('← Geri').setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });
        }

        // ── Roller ─────────────────────────────────────────────────────
        if (id === 'ayar_roller') {
            const s = settings.roles;
            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('👥 Rol Ayarları')
                .setDescription('Ayarlamak istediğin rolü seç, ardından rol ID\'sini gir.')
                .addFields(
                    { name: '👮 Admin Rolü',  value: s.admin     ? `<@&${s.admin}>`     : '`Ayarlanmamış`', inline: true },
                    { name: '🛡️ Mod Rolü',   value: s.moderator ? `<@&${s.moderator}>` : '`Ayarlanmamış`', inline: true },
                    { name: '👤 Üye Rolü',    value: s.member    ? `<@&${s.member}>`    : '`Ayarlanmamış`', inline: true },
                    { name: '🔇 Muted Rolü',  value: s.muted     ? `<@&${s.muted}>`     : '`Ayarlanmamış`', inline: true },
                );

            return interaction.update({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ayar_rol_admin').setLabel('👮 Admin Rolü').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_rol_mod').setLabel('🛡️ Mod Rolü').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_rol_member').setLabel('👤 Üye Rolü').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_rol_muted').setLabel('🔇 Muted Rolü').setStyle(ButtonStyle.Secondary),
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ayar_ana_menu').setLabel('← Geri').setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });
        }

        // ── Rol modal aç ───────────────────────────────────────────────
        const rolMap = {
            'ayar_rol_admin':  { key: 'roles.admin',     label: 'Admin Rolü'  },
            'ayar_rol_mod':    { key: 'roles.moderator', label: 'Mod Rolü'    },
            'ayar_rol_member': { key: 'roles.member',    label: 'Üye Rolü'    },
            'ayar_rol_muted':  { key: 'roles.muted',     label: 'Muted Rolü'  },
        };
        if (rolMap[id]) {
            const { key, label } = rolMap[id];
            const modal = new ModalBuilder()
                .setCustomId(`ayar_modal_rol_${key}`)
                .setTitle(`${label} Ayarla`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('rol_id')
                    .setLabel(`${label} ID\'si (@rol etiketle veya ID gir)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Rol ID veya 0 (sıfırlamak için)')
                    .setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Kanallar ───────────────────────────────────────────────────
        if (id === 'ayar_kanallar') {
            const s = settings.channels;
            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('📢 Kanal Ayarları')
                .setDescription('Ayarlamak istediğin kanalı seç.')
                .addFields(
                    { name: '📋 Mod Log',    value: s.modLog          ? `<#${s.modLog}>`          : '`Ayarlanmamış`', inline: true },
                    { name: '📊 Sunucu Log', value: s.serverLog       ? `<#${s.serverLog}>`       : '`Ayarlanmamış`', inline: true },
                    { name: '🎫 Ticket Log', value: s.ticketLog       ? `<#${s.ticketLog}>`       : '`Ayarlanmamış`', inline: true },
                    { name: '👋 Hoşgeldin',  value: s.welcomeChannel  ? `<#${s.welcomeChannel}>`  : '`Ayarlanmamış`', inline: true },
                    { name: '🤖 Bot Log',    value: s.botLog          ? `<#${s.botLog}>`          : '`Ayarlanmamış`', inline: true },
                );

            return interaction.update({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ayar_kanal_modlog').setLabel('📋 Mod Log').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_kanal_serverlog').setLabel('📊 Sunucu Log').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_kanal_ticketlog').setLabel('🎫 Ticket Log').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_kanal_welcome').setLabel('👋 Hoşgeldin').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ayar_kanal_botlog').setLabel('🤖 Bot Log').setStyle(ButtonStyle.Secondary),
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ayar_ana_menu').setLabel('← Geri').setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });
        }

        // ── Kanal modal aç ─────────────────────────────────────────────
        const kanalMap = {
            'ayar_kanal_modlog':    { key: 'channels.modLog',        label: 'Mod Log Kanalı'    },
            'ayar_kanal_serverlog': { key: 'channels.serverLog',     label: 'Sunucu Log Kanalı' },
            'ayar_kanal_ticketlog': { key: 'channels.ticketLog',     label: 'Ticket Log Kanalı' },
            'ayar_kanal_welcome':   { key: 'channels.welcomeChannel',label: 'Hoşgeldin Kanalı'  },
            'ayar_kanal_botlog':    { key: 'channels.botLog',        label: 'Bot Log Kanalı'    },
        };
        if (kanalMap[id]) {
            const { key, label } = kanalMap[id];
            const modal = new ModalBuilder()
                .setCustomId(`ayar_modal_kanal_${key}`)
                .setTitle(`${label} Ayarla`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('kanal_id')
                    .setLabel(`${label} ID\'si (#kanal etiketle veya ID gir)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Kanal ID veya 0 (sıfırlamak için)')
                    .setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // ── Koruma ayarları ────────────────────────────────────────────
        if (id === 'ayar_koruma') {
            const modal = new ModalBuilder()
                .setCustomId('ayar_modal_koruma')
                .setTitle('🛡️ Koruma Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('spam_limit')
                        .setLabel('Anti-Spam: Kaç mesaj spam sayılsın? (1-10)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('5')
                        .setValue(String(settings.antiSpam?.maxMessages || 5))
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('warn_before_mute')
                        .setLabel('Küfür: Kaç uyarıdan sonra mute? (1-5)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('3')
                        .setValue(String(settings.wordFilter?.warnBefore || 3))
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('link_whitelist')
                        .setLabel('Anti-Link Whitelist (virgülle ayır)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('discord.com, youtube.com, twitch.tv')
                        .setValue((settings.antiLink?.whitelist || []).join(', '))
                        .setRequired(false)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Ticket ayarları ────────────────────────────────────────────
        if (id === 'ayar_ticket') {
            const modal = new ModalBuilder()
                .setCustomId('ayar_modal_ticket')
                .setTitle('🎫 Ticket Sistemi Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('ticket_category')
                        .setLabel('Ticket Kategori ID\'si')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Kategori ID')
                        .setValue(settings.ticket?.categoryId || '')
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('ticket_max')
                        .setLabel('Kişi başı max ticket sayısı (1-5)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('1')
                        .setValue(String(settings.ticket?.maxTicketsPerUser || 1))
                        .setRequired(false)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Hoşgeldin ayarları ─────────────────────────────────────────
        if (id === 'ayar_hosgeldin') {
            const modal = new ModalBuilder()
                .setCustomId('ayar_modal_hosgeldin')
                .setTitle('👋 Hoşgeldin/Veda Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('welcome_msg')
                        .setLabel('Hoşgeldin mesajı ({user} = mention)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Hoşgeldin {user}! 🎉')
                        .setValue(settings.welcome?.message || 'Hoşgeldin {user}! 🎉')
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('leave_msg')
                        .setLabel('Veda mesajı ({user} = kullanıcı adı)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('{user} sunucudan ayrıldı.')
                        .setValue(settings.leave?.message || '{user} sunucudan ayrıldı.')
                        .setRequired(false)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Kayıt ayarları ─────────────────────────────────────────────
        if (id === 'ayar_kayit') {
            const modal = new ModalBuilder()
                .setCustomId('ayar_modal_kayit')
                .setTitle('📝 Kayıt Sistemi Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('kayit_format')
                        .setLabel('İsim formatı ({isim}, {yas} kullanabilirsin)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('{isim} | {yas}')
                        .setValue(settings.kayit?.isimFormati || '{isim} | {yas}')
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('kayit_roller')
                        .setLabel('Kayıt sonrası verilecek rol ID\'leri (virgülle)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('1234567890, 9876543210')
                        .setValue((settings.kayit?.memberRoller || []).join(', '))
                        .setRequired(false)
                ),
            );
            return interaction.showModal(modal);
        }
    },

    // ── Select Menu Handler ────────────────────────────────────────────
    async handleSelect(interaction, client) {
        const id     = interaction.customId;
        const userId = interaction.user.id;

        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ Sadece sunucu kurucusu kullanabilir.', flags: 64 });
        }

        if (id === 'ayar_sistemler_select') {
            const selected = interaction.values;
            const allSystems = ['antiSpam','antiLink','antiRaid','wordFilter','ticket','welcomeMsg','modLogs'];
            const patch = {};
            for (const sys of allSystems) {
                patch[`systems.${sys}`] = selected.includes(sys);
            }
            await saveSettings(interaction.guild.id, patch);
            clearConfigCache(interaction.guild.id);

            const settings = await getSettings(interaction.guild.id);
            const session  = sessions.get(userId) || {};
            sessions.set(userId, { ...session, settings });

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('✅ Sistemler Güncellendi')
                    .setDescription(
                        allSystems.map(s =>
                            `> ${selected.includes(s) ? '🟢' : '🔴'} ${systemLabels[s] || s}`
                        ).join('\n')
                    )
                    .setTimestamp()],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ayar_ana_menu').setLabel('← Ana Menü').setStyle(ButtonStyle.Secondary),
                )],
            });
        }
    },

    // ── Modal Handler ──────────────────────────────────────────────────
    async handleModal(interaction, client) {
        const id     = interaction.customId;
        const guild  = interaction.guild;
        const userId = interaction.user.id;

        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ Sadece sunucu kurucusu kullanabilir.', flags: 64 });
        }

        // Rol ayarla
        if (id.startsWith('ayar_modal_rol_')) {
            const key   = id.replace('ayar_modal_rol_', '');
            const input = interaction.fields.getTextInputValue('rol_id').trim().replace(/[<@&>]/g, '');
            const value = input === '0' ? null : input;

            if (value) {
                const role = guild.roles.cache.get(value);
                if (!role) return interaction.reply({ content: '❌ Rol bulunamadı. Geçerli bir rol ID\'si gir.', flags: 64 });
            }

            await saveSettings(guild.id, { [key]: value });
            clearConfigCache(guild.id);
            await interaction.reply({
                content: value ? `✅ **${key}** → <@&${value}> olarak ayarlandı.` : `✅ **${key}** sıfırlandı.`,
                flags: 64,
            });

            // Ana menüyü güncelle
            const settings = await getSettings(guild.id);
            sessions.set(userId, { guildId: guild.id, settings });
            return;
        }

        // Kanal ayarla
        if (id.startsWith('ayar_modal_kanal_')) {
            const key   = id.replace('ayar_modal_kanal_', '');
            const input = interaction.fields.getTextInputValue('kanal_id').trim().replace(/[<#>]/g, '');
            const value = input === '0' ? null : input;

            if (value) {
                const ch = guild.channels.cache.get(value);
                if (!ch) return interaction.reply({ content: '❌ Kanal bulunamadı. Geçerli bir kanal ID\'si gir.', flags: 64 });
            }

            await saveSettings(guild.id, { [key]: value });
            clearConfigCache(guild.id);
            await interaction.reply({
                content: value ? `✅ **${key}** → <#${value}> olarak ayarlandı.` : `✅ **${key}** sıfırlandı.`,
                flags: 64,
            });
            return;
        }

        // Koruma ayarları
        if (id === 'ayar_modal_koruma') {
            const spamLimit = parseInt(interaction.fields.getTextInputValue('spam_limit')) || 5;
            const warnBefore = parseInt(interaction.fields.getTextInputValue('warn_before_mute')) || 3;
            const whitelist  = interaction.fields.getTextInputValue('link_whitelist')
                .split(',').map(s => s.trim()).filter(Boolean);

            await saveSettings(guild.id, {
                'antiSpam.maxMessages':    Math.max(1, Math.min(10, spamLimit)),
                'wordFilter.warnBefore':   Math.max(1, Math.min(5, warnBefore)),
                'antiLink.whitelist':      whitelist,
            });

            await interaction.reply({ content: '✅ Koruma ayarları güncellendi.', flags: 64 });
            return;
        }

        // Ticket ayarları
        if (id === 'ayar_modal_ticket') {
            const categoryId = interaction.fields.getTextInputValue('ticket_category').trim() || null;
            const maxTickets = parseInt(interaction.fields.getTextInputValue('ticket_max')) || 1;

            if (categoryId) {
                const cat = guild.channels.cache.get(categoryId);
                if (!cat) return interaction.reply({ content: '❌ Kategori bulunamadı.', flags: 64 });
            }

            await saveSettings(guild.id, {
                'ticket.categoryId':       categoryId,
                'ticket.maxTicketsPerUser': Math.max(1, Math.min(5, maxTickets)),
            });
            await interaction.reply({ content: '✅ Ticket ayarları güncellendi.', flags: 64 });
            return;
        }

        // Hoşgeldin ayarları
        if (id === 'ayar_modal_hosgeldin') {
            const welcomeMsg = interaction.fields.getTextInputValue('welcome_msg').trim();
            const leaveMsg   = interaction.fields.getTextInputValue('leave_msg').trim();

            await saveSettings(guild.id, {
                'welcome.message': welcomeMsg || 'Hoşgeldin {user}! 🎉',
                'leave.message':   leaveMsg   || '{user} sunucudan ayrıldı.',
            });
            await interaction.reply({ content: '✅ Hoşgeldin/Veda mesajları güncellendi.', flags: 64 });
            return;
        }

        // Kayıt ayarları
        if (id === 'ayar_modal_kayit') {
            const format = interaction.fields.getTextInputValue('kayit_format').trim();
            const roller = interaction.fields.getTextInputValue('kayit_roller')
                .split(',').map(s => s.trim()).filter(Boolean);

            await saveSettings(guild.id, {
                'kayit.isimFormati': format || '{isim} | {yas}',
                'kayit.memberRoller': roller,
            });
            await interaction.reply({ content: '✅ Kayıt ayarları güncellendi.', flags: 64 });
            return;
        }
    },
};

const systemLabels = {
    antiSpam:   '🛡️ Anti-Spam',
    antiLink:   '🔗 Anti-Link',
    antiRaid:   '🚨 Anti-Raid',
    wordFilter: '🤬 Küfür Filtresi',
    ticket:     '🎫 Ticket Sistemi',
    welcomeMsg: '👋 Hoşgeldin/Veda',
    modLogs:    '📊 Mod Logları',
};
