// ╔═══════════════════════════════════════════════════════════════╗
// ║                    MODBOT — SES AFK KOMUTU                    ║
// ║           Botu bir ses kanalında 7/24 AFK tutar              ║
// ║           Sadece OWNER_ID kullanabilir!                      ║
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
const config = require('../../config');

// ─── Owner Kontrolü ─────────────────────────────────────────────
const OWNER_ID = process.env.OWNER_ID || config.ownerID;

module.exports = {
    name: 'sesafk',
    description: 'Botu bir ses kanalında 7/24 AFK tutar (sadece bot sahibi)',
    aliases: ['voiceafk', 'safk'],
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('sesafk')
        .setDescription('Botu bir ses kanalında 7/24 AFK tutar (sadece bot sahibi)')
        .setDefaultMemberPermissions(0) // Herkese kapalı, sadece owner kontrolü ile açılacak
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
        // ─── Sadece OWNER kullanabilir ──────────────────────────────
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
            const connection = getVoiceConnection(guild.id);

            if (!connection) {
                return interaction.reply({
                    content: '⚠️ Bot zaten hiçbir ses kanalında değil.',
                    ephemeral: true,
                });
            }

            try {
                connection.destroy();
                console.log(`[sesafk] AFK kapatıldı — ${guild.name} | ${interaction.user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🔴 Ses AFK Kapatıldı')
                    .setDescription('Bot ses kanalından ayrıldı.')
                    .addFields(
                        { name: '👤 Kullanan', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    )
                    .setTimestamp()
                    .setFooter({ text: 'ModBot — Ses AFK Sistemi' });

                return interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('[sesafk] Kapatma hatası:', error);
                return interaction.reply({
                    content: `❌ Kapatma sırasında hata: \`${error.message}\``,
                    ephemeral: true,
                });
            }
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

            // Kanal gerçekten ses kanalı mı?
            if (kanal.type !== ChannelType.GuildVoice && kanal.type !== ChannelType.GuildStageVoice) {
                return interaction.reply({
                    content: '❌ Belirtilen kanal bir **ses kanalı** değil.',
                    ephemeral: true,
                });
            }

            // Botun o kanala bağlanma yetkisi var mı?
            const permissions = kanal.permissionsFor(guild.members.me);
            if (!permissions.has(PermissionFlagsBits.Connect)) {
                return interaction.reply({
                    content: `❌ Botun **${kanal.name}** kanalına bağlanma yetkisi yok.`,
                    ephemeral: true,
                });
            }

            // Zaten bir bağlantı varsa önce onu kapat
            const eskiBaglanti = getVoiceConnection(guild.id);
            if (eskiBaglanti) {
                try { eskiBaglanti.destroy(); } catch (_) {}
            }

            await interaction.deferReply();

            try {
                // Ses kanalına bağlan
                const connection = joinVoiceChannel({
                    channelId: kanal.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: false,   // Kendi sesini sağır etme
                    selfMute: true,    // Kendini mute et (AFK gibi görünsün)
                });

                // Bağlantı hazır olana kadar bekle
                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 30000);
                } catch (err) {
                    connection.destroy();
                    return interaction.editReply({
                        content: '❌ Ses kanalına bağlanılamadı (30 saniye zaman aşımı).',
                    });
                }

                // ─── Sessiz ses kaynağı (bağlantıyı canlı tutar) ─────
                // Discord 1-2 dakika sonra ses vermeyen botu kanaldan atabilir.
                // Bu yüzden sürekli sessiz (silent) PCM akışı gönderiyoruz.
                const player = createAudioPlayer({
                    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
                });
                connection.subscribe(player);

                startSilentAudio(player);

                // Bağlantı koptuğunda tekrar bağlan
                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                        // Yeniden bağlanıyor, bir şey yapma
                    } catch {
                        // Gerçekten koptu — temizle
                        try { connection.destroy(); } catch (_) {}
                        console.log(`[sesafk] Bağlantı koptu — ${guild.name}`);
                    }
                });

                connection.on(VoiceConnectionStatus.Destroyed, () => {
                    try { player.stop(); } catch (_) {}
                });

                console.log(`[sesafk] AFK açıldı — ${guild.name} | #${kanal.name} | ${interaction.user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🟢 Ses AFK Açıldı')
                    .setDescription(`Bot **${kanal.name}** kanalında AFK moduna geçti.`)
                    .addFields(
                        { name: '🔊 Kanal', value: `<#${kanal.id}>`, inline: true },
                        { name: '👤 Kullanan', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '📝 Not', value: 'Bot bağlantıyı canlı tutmak için sessiz ses gönderiyor. Kapatmak için `/sesafk durum:Kapat` yaz.', inline: false },
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
};

// ─────────────────────────────────────────────────────────────────
//  SESSİZ SES KAYNAĞI
//  Discord, ses vermeyen botu bir süre sonra kanaldan atar.
//  Bu fonksiyon sürekli sessiz PCM verisi göndererek bağlantıyı
//  canlı tutar.
// ─────────────────────────────────────────────────────────────────
function startSilentAudio(player) {
    // 20ms'lik sessiz PCM frame'i oluştur (48kHz, stereo, s16le)
    // 48000 Hz * 0.02 saniye = 960 örnek * 2 kanal * 2 byte = 3840 byte
    const silentFrame = Buffer.alloc(3840, 0);

    // Sonsuz bir stream oluştur
    const silenceStream = new Readable({
        read() {
            // Her read'de sessiz frame gönder
            this.push(silentFrame);
        },
    });

    // Ses kaynağı oluştur
    const resource = createAudioResource(silenceStream, {
        inputType: StreamType.Raw,
    });

    // Çal
    player.play(resource);

    // Player durursa (beklenmedik şekilde), yeniden başlat
    player.on(AudioPlayerStatus.Idle, () => {
        try { startSilentAudio(player); } catch (_) {}
    });

    player.on('error', (err) => {
        if (err.message && err.message.includes('Premature close')) return;
        console.error('[sesafk] Ses player hatası:', err.message);
    });
}
