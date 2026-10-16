const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { profileEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Kawai profilini goster')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Baskasinin profilini gormek icin')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const target = interaction.options.getUser('kullanici') || interaction.user;

        try {
            const userData = await db.getUser(target.id);
            await interaction.editReply({
                embeds: [profileEmbed(userData, target)]
            });
        } catch (err) {
            console.error('profil hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Profil getirilemedi kanka.')]
            });
        }
    }
};
