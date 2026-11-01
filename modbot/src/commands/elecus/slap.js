const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'slap',
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Birine tokat atarsın 👋')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Tokat atacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '👋 Kendine tokat atamazsın! Birisini seç.' });
            }

            const res = await fetch('https://api.some-random-api.com/animu/slap');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle('👋 TOKAT!')
                .setDescription(`**${sender.username}** → **${target.username}**'a tokat attı! 😤`)
                .setImage(data.link)
                .setFooter({ text: 'some-random-api • animu/slap' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
