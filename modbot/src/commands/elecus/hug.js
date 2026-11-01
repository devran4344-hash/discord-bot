const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'hug',
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Birine sarılırsın 🤗')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Sarılacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '🤗 Kendine sarılamazsın! Birini seç.' });
            }

            const res = await fetch('https://api.some-random-api.com/animu/hug');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0xfb6f92)
                .setTitle('🤗 Sarılma!')
                .setDescription(`**${sender.username}** → **${target.username}**'a sarıldı!`)
                .setImage(data.link)
                .setFooter({ text: 'some-random-api • animu/hug' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
