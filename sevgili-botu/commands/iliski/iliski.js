const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, iliskiDurumu } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder().setName('iliski').setDescription('Iliskinizin durumunu goster'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) return interaction.reply({ embeds: [error('Once karakter olustur!')], ephemeral: true });
        return interaction.reply({ embeds: [iliskiDurumu(user.karakter, user.iliski, user.istatistik || {})] });
    }
};
