const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot gecikmesini goster'),

    async execute(interaction, client) {
        const sent = await interaction.reply({
            content: '🌸 Olculuyor...',
            fetchReply: true
        });

        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const ws = client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🌸 Kawai Ping')
            .addFields(
                { name: '📡 Roundtrip', value: `\`${roundtrip}ms\``, inline: true },
                { name: '💓 WebSocket', value: `\`${ws}ms\``, inline: true }
            )
            .setFooter({ text: config.footerText })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
