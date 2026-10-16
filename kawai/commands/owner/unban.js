const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-unban')
        .setDescription('[OWNER] Bir kullanicinin yasagini kaldir')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Yasagi kaldirilacak kullanici')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Bu komutu kullanma yetkin yok kanka.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const target = interaction.options.getUser('kullanici');

        try {
            await db.unbanUser(target.id);
            await interaction.editReply({
                embeds: [ownerEmbed('Yasak Kaldirildi', `<@${target.id}> artik Kawai yi tekrar kullanabilir.`)]
            });
        } catch (err) {
            console.error('owner-unban hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Yasak kaldirilamadi.')]
            });
        }
    }
};
