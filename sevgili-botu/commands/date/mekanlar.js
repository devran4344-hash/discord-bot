const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { baseEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('mekanlar').setDescription('Tum date mekanlarini goster'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        const seviye = user?.iliski?.seviye || 1;

        let liste = '';
        for (const m of config.mekanlar) {
            const acik = m.minSeviye <= seviye;
            liste += `${acik ? '✅' : '🔒'} ${m.emoji} **${m.isim}** - ${m.fiyat === 0 ? 'Ucretsiz' : m.fiyat + ' 💎'} (Seviye ${m.minSeviye}+)\n`;
        }

        const embed = baseEmbed(config.colors.date)
            .setTitle('🗺️ Mekanlar')
            .setDescription(liste)
            .setFooter({ text: `Senin seviyen: ${seviye}` });

        return interaction.reply({ embeds: [embed] });
    }
};
