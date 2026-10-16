const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-bedava')
        .setDescription('[OWNER] Ilk X soru bizden kampanyasi baslat')
        .addIntegerOption(opt =>
            opt.setName('sayi')
                .setDescription('Kac kisi bedava sorsun')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction, client) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komutu kullanma yetkin yok kanka.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const sayi = interaction.options.getInteger('sayi');

        try {
            await db.setCampaign('bedava_soru', sayi, interaction.user.id);
            await interaction.editReply({
                embeds: [ownerEmbed('Kampanya Basladi', `🎁 **Bugun ilk ${sayi} sorunuz Kawai den hediye!**\n\nHadi herkes soru sormaya! 🌸`)]
            });
        } catch (err) {
            console.error('owner-bedava hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Kampanya baslatilamadi.')]
            });
        }
    }
};
