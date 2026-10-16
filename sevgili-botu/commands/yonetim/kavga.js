const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kavga')
        .setDescription('Sevgilinle kavga et (test icin)')
        .addStringOption(opt =>
            opt.setName('sebep').setDescription('Kavga sebebi').setRequired(false).setMaxLength(200)
        ),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });
        if (user.iliski.kavgaSebebi) return interaction.reply({ embeds: [error('Zaten kavgali degil misiniz? 😅')], ephemeral: true });

        const sebep = interaction.options.getString('sebep') || 'Sebepsiz kavga';

        await db.setKavga(interaction.user.id, sebep);
        await db.addSevgi(interaction.user.id, config.sevgi.kavga);
        await db.istatistikArttir(interaction.user.id, 'kavga');
        await db.ekleGecmis(interaction.user.id, 'assistant', `Kizgin! Sebep: ${sebep}`);

        const embed = baseEmbed(config.colors.error)
            .setTitle(`😤 ${user.karakter.isim} Sana Kizdi!`)
            .setDescription(`**Sebep:** ${sebep}\n\n*${user.karakter.isim} kollarini kavusturdu ve suratini asti*\n\n"Sen boyle yapinca cok uzuluyorum..."\n\nOzur dilemek icin: \`/ozur\``);

        return interaction.reply({ embeds: [embed] });
    }
};
