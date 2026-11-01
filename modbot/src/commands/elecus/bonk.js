const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'bonk',
    data: new SlashCommandBuilder()
        .setName('bonk')
        .setDescription('Birine bonk vurursun 🔨')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Bonk atacağın kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            const res  = await fetch('https://nekos.best/api/v2/bonk');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const gif  = data.results[0];

            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🔨 BONK!')
                .setDescription(`**${sender.username}** → **${target.username}**'a bonk attı! Horny jail'e git! 😤`)
                .setImage(gif.url)
                .setFooter({ text: `Anime: ${gif.anime_name || 'Bilinmiyor'} • nekos.best` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez.' });
        }
    },
};
