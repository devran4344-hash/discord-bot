const { SlashCommandBuilder } = require('discord.js');
const { error } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karakter_duzenle')
        .setDescription('Karakterini duzenle (sifirlayip yeniden olustur)'),

    async execute(interaction) {
        return interaction.reply({ embeds: [error('Duzenlemek icin once `/karakter sifirla` yazip yeniden olustur.')], ephemeral: true });
    }
};
