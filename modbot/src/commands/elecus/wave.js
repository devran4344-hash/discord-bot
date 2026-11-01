const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'selam',
    data: new SlashCommandBuilder()
        .setName('selam')
        .setDescription('El sallarsın 👋')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('El sallayacağın kullanıcı (boş = herkese)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            const res  = await fetch('https://nekos.best/api/v2/wave');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const gif  = data.results[0];

            const desc = target
                ? `**${sender.username}** → **${target.username}**'a el salladı! 👋`
                : `**${sender.username}** herkese el salladı! 👋`;

            const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('👋 Selam!')
                .setDescription(desc)
                .setImage(gif.url)
                .setFooter({ text: `Anime: ${gif.anime_name || 'Bilinmiyor'} • nekos.best` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez.' });
        }
    },
};
