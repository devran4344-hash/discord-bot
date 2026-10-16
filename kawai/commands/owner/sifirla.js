const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { ownerEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-sifirla')
        .setDescription('[OWNER] Bir kullanicinin gunluk kotasini sifirla')
        .addUserOption(opt =>
            opt.setName('kullanici')
                .setDescription('Kimi sifirlayacaksin')
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
            await db.saveUser(target.id, {
                'daily_limits.ai_chat_used': 0,
                'daily_limits.screenshot_used': 0,
                'daily_limits.image_gen_used': 0,
                'daily_limits.bonus_ai': 0
            });
            await interaction.editReply({
                embeds: [ownerEmbed('Kota Sifirlandi', `<@${target.id}> kullanicisinin tum gunluk kotasi sifirlandi.`)]
            });
        } catch (err) {
            console.error('owner-sifirla hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Sifirlanamadi.')]
            });
        }
    }
};
