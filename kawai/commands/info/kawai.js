const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kawai')
        .setDescription('Kawai kendini tanitir'),

    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setTitle('🌸 Merhaba, ben Kawai!')
            .setDescription(
                'Roblox **Realistic Soccer Street (RSS)** oyunu icin tasarlanmis bir AI kocuyum!\n\n' +
                'Sana taktik verir, mac analizi yapar, skilleri ogretir, hatta gorsel bile uretirim.\n\n' +
                'Ne kadar cok kullanirsan o kadar **XP** kazanir, **level atlarsin** ve gunluk limitlerin artar!\n\n' +
                'Hadi baslayalim — `/yardim` yazarak tum komutlarimi gorebilirsin 🌸'
            )
            .setFooter({ text: config.footerText })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
