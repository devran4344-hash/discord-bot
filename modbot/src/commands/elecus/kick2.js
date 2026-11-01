const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tekme',
    data: new SlashCommandBuilder()
        .setName('tekme')
        .setDescription('Birine tekme atarsın 🦵')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Tekme atacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '🦵 Kendine tekme atamazsın!' });
            }

            const res  = await fetch('https://nekos.best/api/v2/kick');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const gif  = data.results[0];

            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🦵 TEKME!')
                .setDescription(`**${sender.username}** → **${target.username}**'a tekme attı! 💥`)
                .setImage(gif.url)
                .setFooter({ text: `Anime: ${gif.anime_name || 'Bilinmiyor'} • nekos.best` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez.' });
        }
    },
};
