const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'pat',
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Birinin kafasını okşarsın 🥺')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Okşayacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '🥺 Kendi kafanı okşayamazsın!' });
            }

            const res = await fetch('https://api.some-random-api.com/animu/pat');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle('🥺 Kafa Okşama!')
                .setDescription(`**${sender.username}** → **${target.username}**'ın kafasını okşadı!`)
                .setImage(data.link)
                .setFooter({ text: 'some-random-api • animu/pat' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
