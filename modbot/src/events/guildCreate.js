'use strict';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  guildCreate — Bot sunucuya eklenince:                              ║
// ║  1. Kanal yapısını otomatik oluştur                                 ║
// ║  2. Kurucuya DM + onboarding paneli gönder                         ║
// ╚══════════════════════════════════════════════════════════════════════╝

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
} = require('discord.js');
const { initGuild, saveSettings } = require('../utils/guildSettings');
const e = require('../emojiConfig');

// ══════════════════════════════════════════════════════════════════════
//  Sunucu Kanal Yapısı
// ══════════════════════════════════════════════════════════════════════
const YAPI = [
    // ── Bilgi ──────────────────────────────────────────────────────────
    {
        kategori: '📌 Bilgi',
        kanallar: [
            { isim: '📢・duyurular',    tür: ChannelType.GuildText,  sadeceBak: true  },
            { isim: '📋・kurallar',      tür: ChannelType.GuildText,  sadeceBak: true  },
            { isim: '🎉・etkinlikler',   tür: ChannelType.GuildText,  sadeceBak: true  },
        ],
    },
    // ── Genel ──────────────────────────────────────────────────────────
    {
        kategori: '💬 Genel',
        kanallar: [
            { isim: '💬・genel',         tür: ChannelType.GuildText                   },
            { isim: '🤖・bot-komutlar',  tür: ChannelType.GuildText                   },
            { isim: '😂・medya',         tür: ChannelType.GuildText                   },
            { isim: '🎵・Genel',         tür: ChannelType.GuildVoice                  },
            { isim: '🎮・Oyun',          tür: ChannelType.GuildVoice                  },
            { isim: '📚・Çalışma',       tür: ChannelType.GuildVoice                  },
            { isim: '🔇・AFK',           tür: ChannelType.GuildVoice                  },
        ],
    },
    // ── Destek ─────────────────────────────────────────────────────────
    {
        kategori: '🎫 Destek',
        kanallar: [
            { isim: '🎫・ticket-aç',    tür: ChannelType.GuildText,  sadeceBak: true  },
        ],
    },
    // ── Loglar ─────────────────────────────────────────────────────────
    {
        kategori: '📊 Loglar',
        sadeceYetkililer: true,   // @everyone göremez
        kanallar: [
            { isim: '💬・modsohbeti',    tür: ChannelType.GuildText                   },
            { isim: '🔨・vectorlogs',    tür: ChannelType.GuildText                   },
            { isim: '🔨・modlogs',       tür: ChannelType.GuildText                   },
            { isim: '🎉・giriscikislogs',tür: ChannelType.GuildText                   },
            { isim: '🎵・serverlogs',    tür: ChannelType.GuildText                   },
            { isim: '🔊・seslogs',       tür: ChannelType.GuildText                   },
            { isim: '💬・mesajlogs',     tür: ChannelType.GuildText                   },
            { isim: '❤️・rollogs',       tür: ChannelType.GuildText                   },
            { isim: '🤖・botlogs',       tür: ChannelType.GuildText                   },
            { isim: '💬・spamlogs',      tür: ChannelType.GuildText                   },
            { isim: '🔨・automodslogs',  tür: ChannelType.GuildText                   },
            { isim: '🎫・ticketlogs',    tür: ChannelType.GuildText                   },
        ],
    },
    // ── Moderasyon ─────────────────────────────────────────────────────
    {
        kategori: '⚙️ Moderasyon',
        sadeceYetkililer: true,
        kanallar: [
            { isim: '⚙️・bot-ayarlar',  tür: ChannelType.GuildText                   },
            { isim: '📋・mod-notlar',    tür: ChannelType.GuildText                   },
        ],
    },
];

// ══════════════════════════════════════════════════════════════════════
//  Kanal Yapısı Oluşturucu
// ══════════════════════════════════════════════════════════════════════
async function kanallarOlustur(guild) {
    const olusturulan = {
        kategoriler: {},
        kanallar: {},
    };

    console.log(`[guildCreate] ${guild.name} için kanal yapısı oluşturuluyor...`);

    for (const blok of YAPI) {
        try {
            // Kategori izinleri
            const kategoriIzinler = blok.sadeceYetkililer
                ? [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
                : [];

            // Kategori oluştur
            const kategori = await guild.channels.create({
                name: blok.kategori,
                type: ChannelType.GuildCategory,
                permissionOverwrites: kategoriIzinler,
            });

            olusturulan.kategoriler[blok.kategori] = kategori.id;
            console.log(`  ✅ Kategori: ${blok.kategori}`);

            // Kanalları oluştur
            for (const kanal of blok.kanallar) {
                try {
                    const kanalIzinler = [];

                    // Sadece bak (mesaj gönderemesin)
                    if (kanal.sadeceBak) {
                        kanalIzinler.push({
                            id:   guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.SendMessages],
                        });
                    }

                    // Sadece yetkililer görsün
                    if (blok.sadeceYetkililer) {
                        kanalIzinler.push({
                            id:   guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        });
                    }

                    const yeniKanal = await guild.channels.create({
                        name:   kanal.isim,
                        type:   kanal.tür,
                        parent: kategori.id,
                        permissionOverwrites: kanalIzinler,
                    });

                    olusturulan.kanallar[kanal.isim] = yeniKanal.id;

                    // Rate limit için küçük bekleme
                    await new Promise(r => setTimeout(r, 500));
                } catch (err) {
                    console.error(`  ❌ Kanal oluşturulamadı (${kanal.isim}): ${err.message}`);
                }
            }

            // Kategoriler arası bekleme
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`  ❌ Kategori oluşturulamadı (${blok.kategori}): ${err.message}`);
        }
    }

    console.log(`[guildCreate] Kanal yapısı tamamlandı.`);
    return olusturulan;
}

// ══════════════════════════════════════════════════════════════════════
//  ANA EVENT
// ══════════════════════════════════════════════════════════════════════
module.exports = {
    name: 'guildCreate',
    once: false,

    async execute(guild, client) {
        console.log(`[guildCreate] Yeni sunucu: ${guild.name} (${guild.id})`);

        // Firebase'de sunucu kaydı oluştur
        await initGuild(guild.id);

        // ── 1. Kanal yapısını oluştur ──────────────────────────────────
        let kanallar = {};
        try {
            const sonuc = await kanallarOlustur(guild);
            kanallar = sonuc.kanallar;

            // Oluşturulan log kanallarını guildSettings'e kaydet
            const patch = {};
            if (kanallar['🔨・modlogs'])        patch['channels.modLog']        = kanallar['🔨・modlogs'];
            if (kanallar['🎵・serverlogs'])      patch['channels.serverLog']     = kanallar['🎵・serverlogs'];
            if (kanallar['🎫・ticketlogs'])      patch['channels.ticketLog']     = kanallar['🎫・ticketlogs'];
            if (kanallar['🎉・giriscikislogs'])  patch['channels.welcomeChannel']= kanallar['🎉・giriscikislogs'];
            if (kanallar['🤖・botlogs'])         patch['channels.botLog']        = kanallar['🤖・botlogs'];
            if (kanallar['💬・spamlogs'])        patch['channels.spamLog']       = kanallar['💬・spamlogs'];
            if (kanallar['🔨・automodslogs'])    patch['channels.autoModLog']    = kanallar['🔨・automodslogs'];

            if (Object.keys(patch).length > 0) {
                await saveSettings(guild.id, patch);
                console.log(`[guildCreate] Log kanalları ayarlara kaydedildi.`);
            }
        } catch (err) {
            console.error(`[guildCreate] Kanal oluşturma hatası: ${err.message}`);
        }

        // ── 2. Kurucuyu bul ────────────────────────────────────────────
        let owner = null;
        try {
            owner = await guild.fetchOwner();
        } catch {
            console.error(`[guildCreate] Kurucu bulunamadı: ${guild.id}`);
            return;
        }

        // ── 3. Kurucuya DM gönder ──────────────────────────────────────
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setAuthor({
                name: 'BlackNetwork Bot — Kurulum Sihirbazı',
                iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`✅ Merhaba, **${owner.user.username}**!`)
            .setDescription(
                `**BlackNetwork Bot** sunucuna eklendi! 🎉\n\n` +
                `> **Sunucu:** ${guild.name}\n` +
                `> **Üye:** ${guild.memberCount} kişi\n\n` +
                `📁 Kanal yapısı otomatik oluşturuldu!\n` +
                `Aşağıdan aktif etmek istediğin sistemleri seç.`
            )
            .addFields(
                {
                    name: '📁 Oluşturulan Yapı',
                    value: YAPI.map(b => `> 📂 **${b.kategori}** — ${b.kanallar.length} kanal`).join('\n'),
                    inline: false,
                },
                {
                    name: '⚙️ Sonraki Adım',
                    value: `> Sunucuda \`/ayarlar\` komutunu kullanarak\n> roller ve diğer ayarları yapabilirsin.`,
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
                    .setDescription('Spam koruması').setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔗 Anti-Link').setValue('antiLink')
                    .setDescription('İzinsiz link engelleme').setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚨 Anti-Raid').setValue('antiRaid')
                    .setDescription('Toplu katılım koruması').setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🤬 Küfür Filtresi').setValue('wordFilter')
                    .setDescription('Otomatik küfür silme').setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎫 Ticket Sistemi').setValue('ticket')
                    .setDescription('Destek ticket sistemi').setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('👋 Hoşgeldin/Veda').setValue('welcomeMsg')
                    .setDescription('Üye karşılama mesajları').setDefault(false),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚠️ Uyarı Sistemi').setValue('warnSystem')
                    .setDescription('Moderatörler uyarı verebilsin').setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Moderasyon Logları').setValue('modLogs')
                    .setDescription('Tüm işlemleri log kanalına kaydet').setDefault(true),
            );

        const continueBtn = new ButtonBuilder()
            .setCustomId(`onboard_continue_${guild.id}`)
            .setLabel('✅ Sistemleri Kaydet')
            .setStyle(ButtonStyle.Success);

        const skipBtn = new ButtonBuilder()
            .setCustomId(`onboard_skip_${guild.id}`)
            .setLabel('⏭️ Atla')
            .setStyle(ButtonStyle.Secondary);

        const row1 = new ActionRowBuilder().addComponents(systemMenu);
        const row2 = new ActionRowBuilder().addComponents(continueBtn, skipBtn);

        try {
            const dmChannel = await owner.user.createDM();
            const dmMsg = await dmChannel.send({
                embeds: [welcomeEmbed],
                components: [row1, row2],
            });

            let selectedSystems = ['antiSpam', 'antiLink', 'wordFilter', 'warnSystem', 'modLogs'];
            const collector = dmMsg.createMessageComponentCollector({ time: 600_000 });

            collector.on('collect', async (i) => {
                const cid = i.customId;

                if (cid === `onboard_systems_${guild.id}`) {
                    selectedSystems = i.values;
                    await i.reply({ content: `✅ **${selectedSystems.length}** sistem seçildi.`, flags: 64 });
                    return;
                }

                if (cid === `onboard_skip_${guild.id}`) {
                    collector.stop('skip');
                    await i.update({
                        embeds: [new EmbedBuilder()
                            .setColor(0xfee75c)
                            .setTitle('⏭️ Atlandı')
                            .setDescription('Varsayılan ayarlar uygulandı. `/ayarlar` ile değiştirebilirsin.')
                            .setTimestamp()],
                        components: [],
                    });
                    return;
                }

                if (cid === `onboard_continue_${guild.id}`) {
                    const allSystems = ['antiSpam','antiLink','antiRaid','wordFilter','ticket','welcomeMsg','warnSystem','modLogs'];
                    const patch = {};
                    for (const sys of allSystems) {
                        patch[`systems.${sys}`] = selectedSystems.includes(sys);
                    }
                    patch.setupDone = true;
                    patch.setupAt   = Date.now();
                    await saveSettings(guild.id, patch);

                    await i.update({
                        embeds: [new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle('✅ Kurulum Tamamlandı!')
                            .setDescription(
                                `Ayarlar kaydedildi!\n\n` +
                                `**Seçilen sistemler:**\n` +
                                allSystems.map(s =>
                                    `> ${selectedSystems.includes(s) ? '🟢' : '🔴'} ${sistemEtiketleri[s] || s}`
                                ).join('\n') +
                                `\n\n> Sunucuda \`/ayarlar\` ile roller ve kanalları ayarlayabilirsin.`
                            )
                            .setTimestamp()],
                        components: [],
                    });
                    collector.stop('done');
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    dmMsg.edit({ components: [] }).catch(() => {});
                }
            });

        } catch (err) {
            console.error(`[guildCreate] DM gönderilemedi: ${err.message}`);
            // Sistem kanalına mesaj gönder
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
                                `Merhaba! Kurulum için sunucu kurucusunun DM\'lerini açması gerekiyor.\n` +
                                `Şimdilik \`/ayarlar\` komutuyla ayarları yapabilirsin.`
                            )
                            .setTimestamp()],
                    });
                }
            } catch { /* ignore */ }
        }
    },
};

const sistemEtiketleri = {
    antiSpam:   '🛡️ Anti-Spam',
    antiLink:   '🔗 Anti-Link',
    antiRaid:   '🚨 Anti-Raid',
    wordFilter: '🤬 Küfür Filtresi',
    ticket:     '🎫 Ticket Sistemi',
    welcomeMsg: '👋 Hoşgeldin/Veda',
    warnSystem: '⚠️ Uyarı Sistemi',
    modLogs:    '📊 Mod Logları',
};
