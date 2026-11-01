const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'punch',
    data: new SlashCommandBuilder()
        .setName('punch')
        .setDescription('Birine yumruk atarsın 👊')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Yumruk atacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '👊 Kendine yumruk atamazsın!' });
            }

            const res  = await fetch('https://nekos.best/api/v2/punch');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const gif  = data.results[0];

            const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle('👊 YUMRUK!')
                .setDescription(`**${sender.username}** → **${target.username}**'a yumruk attı! 💢`)
                .setImage(gif.url)
                .setFooter({ text: `Anime: ${gif.anime_name || 'Bilinmiyor'} • nekos.best` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez.' });
        }
    },
};
