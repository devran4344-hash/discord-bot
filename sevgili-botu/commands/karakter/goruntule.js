const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { karakterProfil, error } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karakter-goruntule')
        .setDescription('Karakterini goruntule'),

    async execute(interaction) {
        const user = await db.getUser(interaction.user.id);
        if (!user || !user.karakter) {
            return interaction.reply({ embeds: [error('Once karakter olustur! `/karakter olustur`')], ephemeral: true });
        }
        return interaction.reply({ embeds: [karakterProfil(user.karakter, user.iliski)] });
    }
};
