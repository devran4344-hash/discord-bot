const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-ban')
        .setDescription('[OWNER] Bir kullaniciyi bottan yasakla')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Yasaklanacak kullanici')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('sebep')
                .setDescription('Yasaklama sebebi')
                .setRequired(false)
                .setMaxLength(200)
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
        const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            await db.banUser(target.id, sebep, interaction.user.id);
            await interaction.editReply({
                embeds: [ownerEmbed('Kullanici Yasaklandi', `<@${target.id}> artik Kawai yi kullanamaz.\n**Sebep:** ${sebep}`)]
            });
        } catch (err) {
            console.error('owner-ban hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Yasaklama yapilamadi.')]
            });
        }
    }
};
