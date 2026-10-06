// ╔═══════════════════════════════════════════════════════════════╗
// ║              MODBOT — SES AFK KOMUTU (v2)                    ║
// ║         Botu bir ses kanalında 7/24 AFK tutar                ║
// ║         • Sadece OWNER kullanabilir                          ║
// ║         • Atılırsa otomatik geri bağlanır                    ║
// ║         • Başka kanala taşınırsa geri döner                  ║
// ╚═══════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const {
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

// ─── Owner Kontrolü ─────────────────────────────────────────────
const OWNER_ID = process.env.OWNER_ID || config.ownerID;

// ─── AFK State Dosyası ──────────────────────────────────────────
const STATE_DIR = path.join(__dirname, '..', '..', 'logs');
const STATE_FILE = path.join(STATE_DIR, 'sesafk-state.json');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

function stateOku() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[sesafk] State okuma hatası:', e.message);
    }
    return {};
}

function stateYaz(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error('[sesafk] State yazma hatası:', e.message);
    }
}

// ─── Aktif AFK Kanalları (guild.id → { channelId, player, connection }) ──
const aktifAfk = new Map();

// ─────────────────────────────────────────────────────────────────
//  SES AFK KOMUTU
// ─────────────────────────────────────────────────────────────────
module.exports = {
    name: 'sesafk',
    description: 'Botu bir ses kanalında 7/24 AFK tutar (sadece bot sahibi)',
    aliases: ['voiceafk', 'safk'],
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('sesafk')
        .setDescription('Botu bir ses kanalında 7/24 AFK tutar (sadece bot sahibi)')
        .setDefaultMemberPermissions(0)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('durum')
                .setDescription('AFK modunu aç veya kapat')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Aç', value: 'ac' },
                    { name: '🔴 Kapat', value: 'kapat' },
                )
        )
        .addChannelOption(option =>
            option
                .setName('kanal')
                .setDescription('Botun gireceği ses kanalı (Aç seçeneği için gerekli)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        ),

    async execute(interaction, client) {
        // ─── Sadece OWNER ────────────────────────────────────────────
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Bu komutu sadece **bot sahibi** kullanabilir.',
                ephemeral: true,
            });
        }

        const durum = interaction.options.getString('durum');
        const kanal = interaction.options.getChannel('kanal');
        const guild = interaction.guild;

        // ═══════════════════════════════════════════════════════════
        //  KAPAT
        // ═══════════════════════════════════════════════════════════
        if (durum === 'kapat') {
            // State'den sil
            const state = stateOku();
            delete state[guild.id];
            stateYaz(state);

            // Aktif map'ten sil
            const afk = aktifAfk.get(guild.id);
            if (afk) {
                try { afk.player.stop(); } catch (_) {}
                try { afk.connection.destroy(); } catch (_) {}
                aktifAfk.delete(guild.id);
            }

            // Kalan bağlantı varsa temizle
            const connection = getVoiceConnection(guild.id);
            if (connection) {
                try { connection.destroy(); } catch (_) {}
            }

            console.log(`[sesafk] Kapatıldı — ${guild.name} | ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🔴 Ses AFK Kapatıldı')
                .setDescription('Bot ses kanalından ayrıldı. Otomatik geri bağlanma durduruldu.')
                .addFields(
                    { name: '👤 Kullanan', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                )
                .setTimestamp()
                .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

            return interaction.reply({ embeds: [embed] });
        }

        // ═══════════════════════════════════════════════════════════
        //  AÇ
        // ═══════════════════════════════════════════════════════════
        if (durum === 'ac') {
            if (!kanal) {
                return interaction.reply({
                    content: '❌ **Aç** seçeneği için bir **ses kanalı** belirtmelisin.',
                    ephemeral: true,
                });
            }

            if (kanal.type !== ChannelType.GuildVoice && kanal.type !== ChannelType.GuildStageVoice) {
                return interaction.reply({
                    content: '❌ Belirtilen kanal bir **ses kanalı** değil.',
                    ephemeral: true,
                });
            }

            const permissions = kanal.permissionsFor(guild.members.me);
            if (!permissions.has(PermissionFlagsBits.Connect)) {
                return interaction.reply({
                    content: `❌ Botun **${kanal.name}** kanalına bağlanma yetkisi yok.`,
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            // Eski bağlantıyı temizle
            const eskiBaglanti = getVoiceConnection(guild.id);
            if (eskiBaglanti) {
                try { eskiBaglanti.destroy(); } catch (_) {}
            }

            const eskiAfk = aktifAfk.get(guild.id);
            if (eskiAfk) {
                try { eskiAfk.player.stop(); } catch (_) {}
                aktifAfk.delete(guild.id);
            }

            try {
                // AFK'ya bağlan
                const basarili = await afkBaglan(client, guild, kanal.id);

                if (!basarili) {
                    return interaction.editReply({
                        content: '❌ Ses kanalına bağlanılamadı (30 saniye zaman aşımı).',
                    });
                }

                // State'e kaydet
                const state = stateOku();
                state[guild.id] = {
                    channelId: kanal.id,
                    guildId: guild.id,
                    baslatan: interaction.user.id,
                    baslamaZamani: Date.now(),
                };
                stateYaz(state);

                console.log(`[sesafk] Açıldı — ${guild.name} | #${kanal.name} | ${interaction.user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🟢 Ses AFK Açıldı')
                    .setDescription(`Bot **${kanal.name}** kanalında AFK moduna geçti.`)
                    .addFields(
                        { name: '🔊 Kanal', value: `<#${kanal.id}>`, inline: true },
                        { name: '👤 Kullanan', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '🛡️ Koruma', value: 'Bot atılırsa **otomatik geri bağlanır**. Kapatmak için `/sesafk durum:Kapat`.', inline: false },
                    )
                    .setTimestamp()
                    .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

                return interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('[sesafk] Açma hatası:', error);
                return interaction.editReply({
                    content: `❌ AFK açılırken hata: \`${error.message}\``,
                });
            }
        }
    },

    // ─── Dışa aktarılan yardımcılar ─────────────────────────────────
    _afkBaglan: afkBaglan,
    _aktifAfk: aktifAfk,
    _stateOku: stateOku,
};

// ═════════════════════════════════════════════════════════════════
//  AFK BAĞLANMA FONKSİYONU
// ═════════════════════════════════════════════════════════════════
async function afkBaglan(client, guild, channelId) {
    try {
        const connection = joinVoiceChannel({
            channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
        });

        // Ready olana kadar bekle
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30000);
        } catch (err) {
            try { connection.destroy(); } catch (_) {}
            return false;
        }

        // Sessiz ses player'ı
        const player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Play },
        });
        connection.subscribe(player);

        startSilentAudio(player);

        // Aktif map'e kaydet
        aktifAfk.set(guild.id, { channelId, player, connection });

        // ─── Bağlantı koptuğunda ────────────────────────────────────
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            // State'te hâlâ kayıtlı mı? (yani kullanıcı kapatmadı mı?)
            const state = stateOku();
            if (!state[guild.id]) {
                try { connection.destroy(); } catch (_) {}
                aktifAfk.delete(guild.id);
                return;
            }

            // Yeniden bağlanmayı dene
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
                // Discord kendi bağlanıyor
            } catch {
                // Gerçekten koptu — otomatik yeniden bağlan
                console.log(`[sesafk] Bağlantı koptu, yeniden bağlanılıyor — ${guild.name}`);
                try { connection.destroy(); } catch (_) {}
                aktifAfk.delete(guild.id);

                // 3 saniye sonra tekrar dene
                setTimeout(async () => {
                    const yeniState = stateOku();
                    if (!yeniState[guild.id]) return;

                    // Kanal hâlâ var mı?
                    const kanal = guild.channels.cache.get(yeniState[guild.id].channelId)
                        || await guild.channels.fetch(yeniState[guild.id].channelId).catch(() => null);
                    if (!kanal) return;

                    await afkBaglan(client, guild, kanal.id);
                }, 3000);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            try { player.stop(); } catch (_) {}
        });

        return true;
    } catch (error) {
        console.error('[sesafk] afkBaglan hatası:', error.message);
        return false;
    }
}

// ═════════════════════════════════════════════════════════════════
//  SESSİZ SES KAYNAĞI
// ═════════════════════════════════════════════════════════════════
function startSilentAudio(player) {
    const silentFrame = Buffer.alloc(3840, 0); // 20ms @ 48kHz stereo s16le

    const silenceStream = new Readable({
        read() {
            this.push(silentFrame);
        },
    });

    const resource = createAudioResource(silenceStream, {
        inputType: StreamType.Raw,
    });

    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        try { startSilentAudio(player); } catch (_) {}
    });

    player.on('error', (err) => {
        if (err.message && err.message.includes('Premature close')) return;
        console.error('[sesafk] Ses player hatası:', err.message);
    });
}

// ═════════════════════════════════════════════════════════════════
//  VOICE STATE UPDATE — BOT ATILIRSA GERİ GEL
//  Bu fonksiyon index.js'ten çağrılmalı!
// ═════════════════════════════════════════════════════════════════
module.exports.handleVoiceStateUpdate = async (client, oldState, newState) => {
    try {
        // Sadece botu ilgilendirir
        if (oldState.id !== client.user.id) return;

        // Kanal değişikliği var mı?
        if (oldState.channelId === newState.channelId) return;

        const guild = oldState.guild || newState.guild;
        if (!guild) return;

        // State'te AFK kayıtlı mı?
        const state = stateOku();
        const afkState = state[guild.id];
        if (!afkState) return;

        // Bot AFK kanalından mı çıkarıldı?
        if (oldState.channelId === afkState.channelId) {
            console.log(`[sesafk] Bot AFK kanalından atıldı! Geri getiriliyor... — ${guild.name}`);

            // Kim attı? Audit log'dan bul
            let atanKisi = 'Bilinmiyor';
            try {
                const auditLogs = await guild.fetchAuditLogs({ type: 26, limit: 5 }); // 26 = MEMBER_DISCONNECT
                const entry = auditLogs.entries.find(e =>
                    e.target?.id === client.user.id &&
                    Date.now() - e.createdTimestamp < 10000
                );
                if (entry) {
                    atanKisi = `<@${entry.executor.id}> (\`${entry.executor.tag}\`)`;
                }
            } catch (_) {}

            // Kullanıcıya DM at
            try {
                if (OWNER_ID) {
                    const owner = await client.users.fetch(OWNER_ID).catch(() => null);
                    if (owner) {
                        await owner.send({
                            content: `⚠️ **${guild.name}** sunucusunda bot ses kanalından atıldı!\n👤 Atan: ${atanKisi}\n🔄 3 saniye içinde geri bağlanacak...`,
                        }).catch(() => {});
                    }
                }
            } catch (_) {}

            // 3 saniye bekle, sonra geri bağlan
            setTimeout(async () => {
                const yeniState = stateOku();
                if (!yeniState[guild.id]) return; // Kullanıcı kapattıysa bağlanma

                const kanalId = yeniState[guild.id].channelId;
                const kanal = guild.channels.cache.get(kanalId)
                    || await guild.channels.fetch(kanalId).catch(() => null);

                if (!kanal) {
                    console.log(`[sesafk] AFK kanalı silinmiş — ${guild.name}`);
                    return;
                }

                // Eski bağlantıyı temizle
                const eskiAfk = aktifAfk.get(guild.id);
                if (eskiAfk) {
                    try { eskiAfk.player.stop(); } catch (_) {}
                    aktifAfk.delete(guild.id);
                }

                await afkBaglan(client, guild, kanalId);
                console.log(`[sesafk] Bot geri bağlandı — ${guild.name} | #${kanal.name}`);
            }, 3000);
        }

        // Bot başka kanala taşındıysa → AFK kanalına geri taşı
        if (oldState.channelId === afkState.channelId &&
            newState.channelId &&
            newState.channelId !== afkState.channelId) {
            console.log(`[sesafk] Bot başka kanala taşındı, geri getiriliyor... — ${guild.name}`);

            setTimeout(async () => {
                const yeniState = stateOku();
                if (!yeniState[guild.id]) return;

                const kanalId = yeniState[guild.id].channelId;
                const kanal = guild.channels.cache.get(kanalId)
                    || await guild.channels.fetch(kanalId).catch(() => null);

                if (!kanal) return;

                const eskiAfk = aktifAfk.get(guild.id);
                if (eskiAfk) {
                    try { eskiAfk.player.stop(); } catch (_) {}
                    aktifAfk.delete(guild.id);
                }

                await afkBaglan(client, guild, kanalId);
            }, 2000);
        }

    } catch (error) {
        console.error('[sesafk] handleVoiceStateUpdate hatası:', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════
//  BOT BAŞLADIĞINDA OTOMATİK AFK'YA DÖN
//  index.js'ten çağrılmalı!
// ═════════════════════════════════════════════════════════════════
module.exports.restoreAfkOnStartup = async (client) => {
    try {
        const state = stateOku();
        const entries = Object.entries(state);

        if (entries.length === 0) return;

        console.log(`[sesafk] ${entries.length} sunucuda AFK geri yükleniyor...`);

        for (const [guildId, data] of entries) {
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const guild = client.guilds.cache.get(guildId)
                    || await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) continue;

                const kanal = guild.channels.cache.get(data.channelId)
                    || await guild.channels.fetch(data.channelId).catch(() => null);
                if (!kanal) {
                    console.log(`[sesafk] Kanal silinmiş, state temizleniyor — ${guild.name}`);
                    delete state[guildId];
                    stateYaz(state);
                    continue;
                }

                await afkBaglan(client, guild, data.channelId);
                console.log(`[sesafk] Otomatik AFK geri yüklendi — ${guild.name} | #${kanal.name}`);
            } catch (e) {
                console.error(`[sesafk] Sunucu ${guildId} geri yükleme hatası:`, e.message);
            }
        }
    } catch (error) {
        console.error('[sesafk] restoreAfkOnStartup hatası:', error.message);
    }
};
