const { SlashCommandBuilder } = require('discord.js');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-duyuru')
        .setDescription('[OWNER] Kanala Kawai tarzi duyuru at')
        .addStringOption(opt =>
            opt.setName('mesaj')
                .setDescription('Duyuru metni')
                .setRequired(true)
                .setMaxLength(1500)
        ),

    async execute(interaction, client) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komutu kullanma yetkin yok kanka.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const mesaj = interaction.options.getString('mesaj');

        try {
            await interaction.channel.send({
                embeds: [ownerEmbed('Duyuru', mesaj)]
            });
            await interaction.editReply({
                embeds: [errorEmbed('Duyuru gonderildi.')]
            });
        } catch (err) {
            console.error('owner-duyuru hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Duyuru gonderilemedi.')]
            });
        }
    }
};
