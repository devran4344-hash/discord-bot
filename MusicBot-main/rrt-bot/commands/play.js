'use strict';

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const pool = require('../agentPool');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Müzik çal — boş bir ajan bot otomatik seçilir')
        .addStringOption(o => o
            .setName('sorgu')
            .setDescription('Şarkı adı, YouTube/SoundCloud linki')
            .setRequired(true)
        )
        .addChannelOption(o => o
            .setName('kanal')
            .setDescription('Ses kanalı (boş = şu an bulunduğun kanal)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const query = interaction.options.getString('sorgu');

        // Ses kanalını belirle
        const voiceChannel =
            interaction.options.getChannel('kanal') ||
            interaction.member.voice?.channel;

        if (!voiceChannel) {
            return interaction.editReply({
                embeds: [errEmbed('Önce bir ses kanalına gir veya kanal parametresi belirt.')],
            });
        }

        // En uygun ajanı seç
        const agent = await pool.pickBestAgent(interaction.guildId);

        if (!agent) {
            return interaction.editReply({
                embeds: [errEmbed('Tüm müzik botları şu an çevrimdışı. Lütfen daha sonra tekrar dene.')],
            });
        }

        // Ajana play isteği gönder
        let result;
        try {
            result = await pool.requestPlay(agent, {
                guildId:        interaction.guildId,
                voiceChannelId: voiceChannel.id,
                textChannelId:  interaction.channelId,
                query,
                requestedBy:    `${interaction.user.username}#${interaction.user.discriminator}`,
            });
        } catch (err) {
            return interaction.editReply({
                embeds: [errEmbed(`${agent.name} ile bağlantı kurulamadı: \`${err.message}\``)],
            });
        }

        // Hata dönüşü
        if (result.status !== 200) {
            return interaction.editReply({
                embeds: [errEmbed(result.body?.error || 'Şarkı eklenemedi.')],
            });
        }

        // Başarı embed'i
        const body       = result.body;
        const tracks     = body.tracks || [];
        const firstTrack = tracks[0];

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({
                name: `${agent.name} tarafından çalınıyor`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (body.async) {
            // Async mod — şarkı arka planda işleniyor
            embed
                .setTitle('🎵 İstek Gönderildi')
                .setDescription(
                    `> 🔍 **${query}** aranıyor...\n` +
                    `> 🔊 Kanal: ${voiceChannel}\n` +
                    `> 🤖 Bot: **${agent.name}**`
                );
        } else if (body.isPlaylist) {
            embed
                .setTitle('📋 Playlist Eklendi')
                .setDescription(
                    `**${tracks.length}** şarkı sıraya eklendi\n` +
                    `> 🔊 Kanal: ${voiceChannel}\n` +
                    `> 🤖 Bot: **${agent.name}**`
                );
        } else if (firstTrack) {
            embed
                .setTitle('🎵 Sıraya Eklendi')
                .setDescription(
                    `**${firstTrack.title}**` +
                    (firstTrack.artist ? `\n> 👤 ${firstTrack.artist}` : '') +
                    `\n> 🔊 Kanal: ${voiceChannel}` +
                    `\n> 🤖 Bot: **${agent.name}**` +
                    (body.position > 0 ? `\n> 📌 Sıra: #${body.position + 1}` : '\n> ▶️ Şimdi çalıyor')
                );
        } else {
            embed
                .setTitle('✅ İstek Gönderildi')
                .setDescription(`🤖 **${agent.name}** isteği işliyor...`);
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

function errEmbed(msg) {
    return new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${msg}`);
}
