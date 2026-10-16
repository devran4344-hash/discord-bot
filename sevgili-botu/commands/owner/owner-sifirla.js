const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { error, owner } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-sifirla')
        .setDescription('[OWNER] Kullanicinin tum verilerini sifirla')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef').setRequired(true)),

    async execute(interaction) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ embeds: [error('Yetkin yok.')], ephemeral: true });
        }

        await interaction.deferReply();
        const target = interaction.options.getUser('kullanici');
        await db.createUser(target.id, target.username);

        return interaction.editReply({
            embeds: [owner('Sifirlama Tamam', `<@${target.id}> kullanicisinin tum verileri sifirlandi.`)]
        });
    }
};
