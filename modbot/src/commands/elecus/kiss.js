const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kiss',
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Birine öpücük verirsin 💋')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Öpücük vereceğin kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const target = interaction.options.getUser('kullanici');
            const sender = interaction.user;

            if (target.id === sender.id) {
                return interaction.editReply({ content: '💋 Kendini öpemezsin!' });
            }

            const res = await fetch('https://api.some-random-api.com/animu/kiss');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setTitle('💋 Öpücük!')
                .setDescription(`**${sender.username}** → **${target.username}**'a öpücük verdi! 😘`)
                .setImage(data.link)
                .setFooter({ text: 'some-random-api • animu/kiss' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply({ content: '❌ GIF yüklenemedi. API geçici olarak erişilemez olabilir.' });
        }
    },
};
