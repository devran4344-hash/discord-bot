const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'cry',
    data: new SlashCommandBuilder()
        .setName('cry')
        .setDescription('Ağlama GIF\'i gösterir 😭')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Ağlayan kullanıcı (boş = sen)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const user = interaction.options.getUser('kullanici') || interaction.user;

            const res  = await fetch('https://nekos.best/api/v2/cry');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const gif  = data.results[0];

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('😭 Ağlıyor...')
                .setDescription(`**${user.username}** ağlıyor... birileri sarılsın 🥺`)
                .setImage(gif.url)
                .setFooter({ text: `Anime: ${gif.anime_name || 'Bilinmiyor'} • nekos.best` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez.' });
        }
    },
};
