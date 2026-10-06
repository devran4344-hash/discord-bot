// ╔═══════════════════════════════════════════════════════════════╗
// ║              MODBOT — SES AFK KOMUTU (v3)                    ║
// ║         Prefix komut: !sesafk                                ║
// ║         • Sadece OWNER kullanabilir                          ║
// ║         • Atılırsa otomatik geri bağlanır                    ║
// ╚═══════════════════════════════════════════════════════════════╝

const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
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

const OWNER_ID = process.env.OWNER_ID || config.ownerID;

// ─── State Dosyası ──────────────────────────────────────────────
const STATE_DIR = path.join(__dirname, '..', '..', 'logs');
const STATE_FILE = path.join(STATE_DIR, 'sesafk-state.json');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

function stateOku() {
    try {
        if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) { console.error('[sesafk] State okuma hatası:', e.message); }
    return {};
}

function stateYaz(state) {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8'); }
    catch (e) { console.error('[sesafk] State yazma hatası:', e.message); }
}

const aktifAfk = new Map();

// ═══════════════════════════════════════════════════════════════
//  KOMUT
// ═══════════════════════════════════════════════════════════════
module.exports = {
    name: 'sesafk',
    description: 'Botu bir ses kanalında 7/24 AFK tutar (sadece bot sahibi)',
    aliases: ['voiceafk', 'safk'],
    cooldown: 5,
    usage: '!sesafk <ac|kapat> [#kanal]',

    async execute(message, args, client) {
        // ─── Owner kontrolü ──────────────────────────────────────
        if (message.author.id !== OWNER_ID) {
            return message.reply('❌ Bu komutu sadece **bot sahibi** kullanabilir.');
        }

        const durum = (args[0] || '').toLowerCase();

        // ═════════════════════════════════════════════════════════
        //  KAPAT
        // ═════════════════════════════════════════════════════════
        if (durum === 'kapat' || durum === 'kapa' || durum === 'off') {
            const state = stateOku();
            delete state[message.guild.id];
            stateYaz(state);

            const afk = aktifAfk.get(message.guild.id);
            if (afk) {
                try { afk.player.stop(); } catch (_) {}
                try { afk.connection.destroy(); } catch (_) {}
                aktifAfk.delete(message.guild.id);
            }

            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                try { connection.destroy(); } catch (_) {}
            }

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🔴 Ses AFK Kapatıldı')
                .setDescription('Bot ses kanalından ayrıldı. Otomatik geri bağlanma durduruldu.')
                .addFields(
                    { name: '👤 Kullanan', value: `<@${message.author.id}>`, inline: true },
                    { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                )
                .setTimestamp()
                .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

            return message.reply({ embeds: [embed] });
        }

        // ═════════════════════════════════════════════════════════
        //  AÇ
        // ═════════════════════════════════════════════════════════
        if (durum === 'ac' || durum === 'aç' || durum === 'on') {
            // Kanal belirleme: mention, ID, veya komutu yazan kişinin sesli kanalı
            let kanal = message.mentions.channels.first();

            if (!kanal && args[1]) {
                kanal = message.guild.channels.cache.get(args[1]);
            }

            if (!kanal && message.member.voice.channel) {
                kanal = message.member.voice.channel;
            }

            if (!kanal) {
                return message.reply('❌ Ses kanalı belirtmelisin: `!sesafk ac #sesli-kanal`\n💡 Ya da bir sesli kanala girip tekrar dene.');
            }

            if (kanal.type !== ChannelType.GuildVoice && kanal.type !== ChannelType.GuildStageVoice) {
                return message.reply('❌ Belirtilen kanal bir **ses kanalı** değil.');
            }

            const permissions = kanal.permissionsFor(message.guild.members.me);
            if (!permissions.has(PermissionFlagsBits.Connect)) {
                return message.reply(`❌ Botun **${kanal.name}** kanalına bağlanma yetkisi yok.`);
            }

            // Eski bağlantıları temizle
            const eskiBaglanti = getVoiceConnection(message.guild.id);
            if (eskiBaglanti) { try { eskiBaglanti.destroy(); } catch (_) {} }

            const eskiAfk = aktifAfk.get(message.guild.id);
            if (eskiAfk) {
                try { eskiAfk.player.stop(); } catch (_) {}
                aktifAfk.delete(message.guild.id);
            }

            const bekleMesaj = await message.reply('⏳ Ses kanalına bağlanılıyor...').catch(() => null);

            try {
                const basarili = await afkBaglan(client, message.guild, kanal.id);

                if (!basarili) {
                    if (bekleMesaj) await bekleMesaj.edit('❌ Ses kanalına bağlanılamadı (30 saniye zaman aşımı).');
                    return;
                }

                // State'e kaydet
                const state = stateOku();
                state[message.guild.id] = {
                    channelId: kanal.id,
                    guildId: message.guild.id,
                    baslatan: message.author.id,
                    baslamaZamani: Date.now(),
                };
                stateYaz(state);

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🟢 Ses AFK Açıldı')
                    .setDescription(`Bot **${kanal.name}** kanalında AFK moduna geçti.`)
                    .addFields(
                        { name: '🔊 Kanal', value: `<#${kanal.id}>`, inline: true },
                        { name: '👤 Kullanan', value: `<@${message.author.id}>`, inline: true },
                        { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '🛡️ Koruma', value: 'Bot atılırsa **otomatik geri bağlanır**. Kapatmak için `!sesafk kapat`.', inline: false },
                    )
                    .setTimestamp()
                    .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

                if (bekleMesaj) {
                    await bekleMesaj.edit({ content: null, embeds: [embed] });
                } else {
                    await message.reply({ embeds: [embed] });
                }

                console.log(`[sesafk] Açıldı — ${message.guild.name} | #${kanal.name} | ${message.author.tag}`);

            } catch (error) {
                console.error('[sesafk] Açma hatası:', error);
                if (bekleMesaj) await bekleMesaj.edit(`❌ Hata: \`${error.message}\``);
            }

            return;
        }

        // ═════════════════════════════════════════════════════════
        //  YARDIM
        // ═════════════════════════════════════════════════════════
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📖 Ses AFK Komutu')
            .setDescription('Botu bir ses kanalında 7/24 AFK tutar.')
            .addFields(
                { name: '`!sesafk ac [#kanal]`', value: 'AFK modunu açar. Kanal belirtmezsen bulunduğun sesli kanala girer.', inline: false },
                { name: '`!sesafk kapat`', value: 'AFK modunu kapatır, bot kanaldan ayrılır.', inline: false },
                { name: '`!sesafk`', value: 'Bu yardım mesajını gösterir.', inline: false },
                { name: '🔒 Yetki', value: 'Sadece **bot sahibi** kullanabilir.', inline: false },
            )
            .setTimestamp()
            .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

        return message.reply({ embeds: [embed] });
    },

    // Dışa aktarılanlar
    _afkBaglan: afkBaglan,
    _aktifAfk: aktifAfk,
    _stateOku: stateOku,
};

// ═══════════════════════════════════════════════════════════════
//  AFK BAĞLANMA
// ═══════════════════════════════════════════════════════════════
async function afkBaglan(client, guild, channelId) {
    try {
        const connection = joinVoiceChannel({
            channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30000);
        } catch (err) {
            try { connection.destroy(); } catch (_) {}
            return false;
        }

        const player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Play },
        });
        connection.subscribe(player);

        startSilentAudio(player);

        aktifAfk.set(guild.id, { channelId, player, connection });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            const state = stateOku();
            if (!state[guild.id]) {
                try { connection.destroy(); } catch (_) {}
                aktifAfk.delete(guild.id);
                return;
            }
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch {
                console.log(`[sesafk] Bağlantı koptu, yeniden bağlanılıyor — ${guild.name}`);
                try { connection.destroy(); } catch (_) {}
                aktifAfk.delete(guild.id);
                setTimeout(async () => {
                    const yeniState = stateOku();
                    if (!yeniState[guild.id]) return;
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

// ═══════════════════════════════════════════════════════════════
//  SESSİZ SES
// ═══════════════════════════════════════════════════════════════
function startSilentAudio(player) {
    const silentFrame = Buffer.alloc(3840, 0);
    const silenceStream = new Readable({
        read() { this.push(silentFrame); },
    });
    const resource = createAudioResource(silenceStream, { inputType: StreamType.Raw });
    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        try { startSilentAudio(player); } catch (_) {}
    });
    player.on('error', (err) => {
        if (err.message && err.message.includes('Premature close')) return;
        console.error('[sesafk] Ses player hatası:', err.message);
    });
}

// ═══════════════════════════════════════════════════════════════
//  BOT ATILIRSA GERİ GEL
// ═══════════════════════════════════════════════════════════════
module.exports.handleVoiceStateUpdate = async (client, oldState, newState) => {
    try {
        if (oldState.id !== client.user.id) return;
        if (oldState.channelId === newState.channelId) return;

        const guild = oldState.guild || newState.guild;
        if (!guild) return;

        const state = stateOku();
        const afkState = state[guild.id];
        if (!afkState) return;

        // AFK kanalından çıkarıldı
        if (oldState.channelId === afkState.channelId && !newState.channelId) {
            console.log(`[sesafk] Bot atıldı! Geri getiriliyor... — ${guild.name}`);

            let atanKisi = 'Bilinmiyor';
            try {
                const auditLogs = await guild.fetchAuditLogs({ type: 26, limit: 5 });
                const entry = auditLogs.entries.find(e =>
                    e.target?.id === client.user.id && Date.now() - e.createdTimestamp < 10000
                );
                if (entry) atanKisi = `<@${entry.executor.id}> (\`${entry.executor.tag}\`)`;
            } catch (_) {}

            try {
                if (OWNER_ID) {
                    const owner = await client.users.fetch(OWNER_ID).catch(() => null);
                    if (owner) {
                        await owner.send(`⚠️ **${guild.name}** sunucusunda bot ses kanalından atıldı!\n👤 Atan: ${atanKisi}\n🔄 3 saniye içinde geri bağlanacak...`).catch(() => {});
                    }
                }
            } catch (_) {}

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
                console.log(`[sesafk] Geri bağlandı — ${guild.name}`);
            }, 3000);
        }

        // Başka kanala taşındı
        if (oldState.channelId === afkState.channelId &&
            newState.channelId &&
            newState.channelId !== afkState.channelId) {
            console.log(`[sesafk] Bot taşındı, geri getiriliyor... — ${guild.name}`);

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

// ═══════════════════════════════════════════════════════════════
//  BOT BAŞLARKEN OTOMATİK GERİ YÜKLE
// ═══════════════════════════════════════════════════════════════
module.exports.restoreAfkOnStartup = async (client) => {
    try {
        const state = stateOku();
        const entries = Object.entries(state);
        if (entries.length === 0) return;

        console.log(`[sesafk] ${entries.length} sunucuda AFK geri yükleniyor...`);

        for (const [guildId, data] of entries) {
            try {
                await new Promise(r => setTimeout(r, 2000));
                const guild = client.guilds.cache.get(guildId)
                    || await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) continue;

                const kanal = guild.channels.cache.get(data.channelId)
                    || await guild.channels.fetch(data.channelId).catch(() => null);
                if (!kanal) {
                    delete state[guildId];
                    stateYaz(state);
                    continue;
                }
                await afkBaglan(client, guild, data.channelId);
                console.log(`[sesafk] Otomatik geri yüklendi — ${guild.name} | #${kanal.name}`);
            } catch (e) {
                console.error(`[sesafk] ${guildId} geri yükleme hatası:`, e.message);
            }
        }
    } catch (error) {
        console.error('[sesafk] restoreAfkOnStartup hatası:', error.message);
    }
};
