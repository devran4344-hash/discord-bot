const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-foto')
        .setDescription('[OWNER] Ilk X fotograf bizden kampanyasi baslat')
        .addIntegerOption(opt =>
            opt.setName('sayi')
                .setDescription('Kac kisi bedava foto uretsin')
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

        const sayi = interaction.options.getInteger('sayi');

        try {
            await db.setCampaign('bedava_foto', sayi, interaction.user.id);
            await interaction.editReply({
                embeds: [ownerEmbed('Kampanya Basladi', `🎁 **Bugun ilk ${sayi} fotografiniz Kawai den hediye!**\n\nHadi herkes /resim denesin! 🌸`)]
            });
        } catch (err) {
            console.error('owner-foto hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Kampanya baslatilamadi.')]
            });
        }
    }
};
