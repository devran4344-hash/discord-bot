'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  guildCreate — Bot sunucuya eklenince kurucuya DM + onboarding      ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { initGuild, getSettings, saveSettings } = require('../utils/guildSettings');
const e = require('../emojiConfig');

module.exports = {
    name: 'guildCreate',
    once: false,

    async execute(guild, client) {
        console.log(`[guildCreate] Yeni sunucu: ${guild.name} (${guild.id})`);

        // Firebase'de sunucu kaydı oluştur
        await initGuild(guild.id);

        // Kurucuyu bul
        let owner = null;
        try {
            owner = await guild.fetchOwner();
        } catch {
            console.error(`[guildCreate] Kurucu bulunamadı: ${guild.id}`);
            return;
        }

        // Hoşgeldin DM embed'i
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setAuthor({
                name: 'BlackNetwork Bot — Kurulum Sihirbazı',
                iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`${e.success || '✅'} Merhaba, **${owner.user.username}**!`)
            .setDescription(
                `**BlackNetwork Bot** sunucuna eklendi! 🎉\n\n` +
                `> **Sunucu:** ${guild.name}\n` +
                `> **Üye:** ${guild.memberCount} kişi\n\n` +
                `Botu kullanmaya başlamadan önce birkaç temel ayar yapman gerekiyor.\n` +
                `Aşağıdan hangi sistemleri aktif etmek istediğini seç.`
            )
            .addFields(
                {
                    name: `${e.info || 'ℹ️'} Mevcut Sistemler`,
                    value: [
                        `> 🛡️ **Anti-Spam** — Spam koruması`,
                        `> 🔗 **Anti-Link** — İzinsiz link engelleme`,
                        `> 🚨 **Anti-Raid** — Toplu katılım koruması`,
                        `> 🤬 **Küfür Filtresi** — Otomatik küfür silme + uyarı`,
                        `> 🎫 **Ticket** — Destek ticket sistemi`,
                        `> 👋 **Hoşgeldin/Veda** — Üye karşılama mesajları`,
                        `> ⚠️ **Uyarı Sistemi** — Warn, mute, ban zinciri`,
                        `> 📊 **Moderasyon Logları** — Tüm işlemleri kaydet`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: `${e.warning || '⚠️'} Önemli`,
                    value: `> Ayarları daha sonra sunucuda \`/ayarlar\` komutuyla değiştirebilirsin.\n> Bu komutu yalnızca **sen** (sunucu kurucusu) kullanabilirsin.`,
                    inline: false,
                }
            )
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL())
            .setFooter({ text: `${guild.name} • BlackNetwork Bot Kurulum` })
            .setTimestamp();

        // Sistem seçim menüsü
        const systemMenu = new StringSelectMenuBuilder()
            .setCustomId(`onboard_systems_${guild.id}`)
            .setPlaceholder('🔧 Aktif etmek istediğin sistemleri seç...')
            .setMinValues(0)
            .setMaxValues(8)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Anti-Spam').setValue('antiSpam')
                    .setDescription('Spam yapan kullanıcıları otomatik cezalandır')
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔗 Anti-Link').setValue('antiLink')
                    .setDescription('İzinsiz link ve davet linklerini sil')
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 Anti-Raid').setValue('antiRaid')
                    .setDescription('Toplu katılım saldırılarına karşı koru')
                    .setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🤬 Küfür Filtresi').setValue('wordFilter')
                    .setDescription('Küfürleri otomatik sil ve kullanıcıyı uyar')
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎫 Ticket Sistemi').setValue('ticket')
                    .setDescription('Üyeler destek talebi oluşturabilsin')
                    .setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👋 Hoşgeldin/Veda').setValue('welcomeMsg')
                    .setDescription('Yeni üyelere karşılama mesajı gönder')
                    .setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚠️ Uyarı Sistemi').setValue('warnSystem')
                    .setDescription('Moderatörler uyarı verebilsin')
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Moderasyon Logları').setValue('modLogs')
                    .setDescription('Ban/kick/mute işlemlerini log kanalına kaydet')
                    .setDefault(true),
            );

        // Devam butonu
        const continueBtn = new ButtonBuilder()
            .setCustomId(`onboard_continue_${guild.id}`)
            .setLabel('✅ Devam Et — Rol & Kanal Ayarları')
            .setStyle(ButtonStyle.Success);

        const skipBtn = new ButtonBuilder()
            .setCustomId(`onboard_skip_${guild.id}`)
            .setLabel('⏭️ Şimdilik Atla')
            .setStyle(ButtonStyle.Secondary);

        const row1 = new ActionRowBuilder().addComponents(systemMenu);
        const row2 = new ActionRowBuilder().addComponents(continueBtn, skipBtn);

        try {
            const dmChannel = await owner.user.createDM();
            const dmMsg = await dmChannel.send({
                embeds: [welcomeEmbed],
                components: [row1, row2],
            });

            // DM collector — 10 dakika bekle
            const collector = dmMsg.createMessageComponentCollector({ time: 600_000 });

            // Seçilen sistemleri geçici sakla
            let selectedSystems = ['antiSpam', 'antiLink', 'wordFilter', 'warnSystem', 'modLogs'];

            collector.on('collect', async (i) => {
                const cid = i.customId;

                // Sistem seçimi
                if (cid === `onboard_systems_${guild.id}`) {
                    selectedSystems = i.values;
                    await i.reply({
                        content: `✅ **${selectedSystems.length}** sistem seçildi. Devam etmek için "Devam Et" butonuna bas.`,
                        flags: 64,
                    });
                    return;
                }

                // Atla
                if (cid === `onboard_skip_${guild.id}`) {
                    collector.stop('skip');
                    await i.update({
                        embeds: [new EmbedBuilder()
                            .setColor(0xfee75c)
                            .setTitle('⏭️ Kurulum Atlandı')
                            .setDescription(
                                `Kurulumu daha sonra sunucunda \`/ayarlar\` komutuyla tamamlayabilirsin.\n\n` +
                                `Varsayılan ayarlar uygulandı.`
                            )
                            .setTimestamp()],
                        components: [],
                    });
                    return;
                }

                // Devam et — 2. adım: Rol & Kanal ayarları
                if (cid === `onboard_continue_${guild.id}`) {
                    // Sistemleri kaydet
                    const systemSettings = {
                        'systems.antiSpam':   selectedSystems.includes('antiSpam'),
                        'systems.antiLink':   selectedSystems.includes('antiLink'),
                        'systems.antiRaid':   selectedSystems.includes('antiRaid'),
                        'systems.wordFilter': selectedSystems.includes('wordFilter'),
                        'systems.ticket':     selectedSystems.includes('ticket'),
                        'systems.welcomeMsg': selectedSystems.includes('welcomeMsg'),
                        'systems.modLogs':    selectedSystems.includes('modLogs'),
                        setupDone: false,
                    };

                    await saveSettings(guild.id, systemSettings);

                    // 2. adım embed'i
                    const step2Embed = new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle('⚙️ Adım 2 — Rol & Kanal Ayarları')
                        .setDescription(
                            `Sistemler kaydedildi! ✅\n\n` +
                            `Şimdi sunucundaki **rolleri** ve **kanalları** ayarlamak için \`/ayarlar\` komutunu kullan.\n\n` +
                            `**Ayarlamanız önerilen şeyler:**\n` +
                            `> 👮 Moderatör rolü\n` +
                            `> 🛡️ Admin rolü\n` +
                            `> 📢 Log kanalı\n` +
                            `> 🎫 Ticket kategorisi *(ticket aktifse)*\n` +
                            `> 👋 Hoşgeldin kanalı *(hoşgeldin aktifse)*`
                        )
                        .addFields({
                            name: '✅ Seçilen Sistemler',
                            value: selectedSystems.length > 0
                                ? selectedSystems.map(s => `> ✅ ${systemLabels[s] || s}`).join('\n')
                                : '> Hiçbir sistem seçilmedi.',
                            inline: false,
                        })
                        .setFooter({ text: 'Sunucuda /ayarlar yazarak devam edebilirsin.' })
                        .setTimestamp();

                    const gotoBtn = new ButtonBuilder()
                        .setLabel('📖 Kurulum Rehberini Görüntüle')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.gg/example');

                    await i.update({
                        embeds: [step2Embed],
                        components: [new ActionRowBuilder().addComponents(gotoBtn)],
                    });

                    await saveSettings(guild.id, { setupDone: true, setupAt: Date.now() });
                    collector.stop('done');
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    dmMsg.edit({ components: [] }).catch(() => {});
                }
            });

        } catch (err) {
            console.error(`[guildCreate] DM gönderilemedi (${guild.name}):`, err.message);
            // DM kapalıysa sunucunun ilk kanalına mesaj göndermeyi dene
            try {
                const ch = guild.systemChannel || guild.channels.cache
                    .filter(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'))
                    .first();

                if (ch) {
                    await ch.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0xfee75c)
                            .setTitle('👋 BlackNetwork Bot Kurulumu')
                            .setDescription(
                                `Merhaba! Kurulum için sunucu kurucusunun bana DM atması gerekiyor.\n` +
                                `DM ayarlarını açıp beni kickle ve tekrar ekle, veya sunucuda \`/ayarlar\` komutunu kullan.`
                            )
                            .setTimestamp()],
                    });
                }
            } catch { /* ignore */ }
        }
    },
};

// Sistem etiketleri
const systemLabels = {
    antiSpam:   '🛡️ Anti-Spam',
    antiLink:   '🔗 Anti-Link',
    antiRaid:   '🚨 Anti-Raid',
    wordFilter: '🤬 Küfür Filtresi',
    ticket:     '🎫 Ticket Sistemi',
    welcomeMsg: '👋 Hoşgeldin/Veda',
    warnSystem: '⚠️ Uyarı Sistemi',
    modLogs:    '📊 Moderasyon Logları',
};
