const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resim')
        .setDescription('AI ile gorsel uret (su an devre disi)')
        .addStringOption(opt =>
            opt.setName('prompt')
                .setDescription('Ne cizmek istersin?')
                .setRequired(true)
                .setMaxLength(400)
        ),

    async execute(interaction, client) {
        await interaction.reply({
            embeds: [errorEmbed('Gorsel uretme su an devre disi kanka. Yakin zamanda aktif olacak!')],
            ephemeral: true
        });
    }
};
