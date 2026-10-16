const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, baseEmbed } = require('../../utils/embeds');
const { getIliskiSeviyesi, getSonrakiSeviye, createSevgiBar } = require('../../utils/sevgi');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('seviye').setDescription('Sevgi puanini ve seviyeni goster'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });

        const seviye = getIliskiSeviyesi(user.iliski.sevgiPuani);
        const sonraki = getSonrakiSeviye(user.iliski.sevgiPuani);
        const bar = createSevgiBar(user.iliski.sevgiPuani, seviye.minSevgi, sonraki ? sonraki.minSevgi : null);

        const embed = baseEmbed(config.colors.ask)
            .setTitle('💕 Sevgi Durumu')
            .setDescription(`**Seviye:** ${seviye.seviye} - ${seviye.isim}\n\n${bar}`)
            .setFooter({ text: sonraki ? `Sonraki seviye: ${sonraki.isim} (${sonraki.minSevgi} puan)` : 'Maksimum seviyedesin!' });

        return interaction.reply({ embeds: [embed] });
    }
};
