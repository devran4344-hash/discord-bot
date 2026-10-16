const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-kota')
        .setDescription('[OWNER] Herkese gunluk +X soru hakki ver')
        .addIntegerOption(opt =>
            opt.setName('miktar')
                .setDescription('Kac soru eklenecek')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50)
        ),

    async execute(interaction, client) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komutu kullanma yetkin yok kanka.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const miktar = interaction.options.getInteger('miktar');

        try {
            await db.addGlobalBonus(miktar, interaction.user.id);
            await interaction.editReply({
                embeds: [ownerEmbed('Global Kota Artirildi', `Tum oyunculara bugun icin **+${miktar}** soru hakki eklendi! 🎁`)]
            });
        } catch (err) {
            console.error('owner-kota hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Kota artirilamadi.')]
            });
        }
    }
};
