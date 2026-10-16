const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { webSearch } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ara')
        .setDescription('Internet uzerinde arastirma yap')
        .addStringOption(opt =>
            opt.setName('konu')
                .setDescription('Ne arastirmak istersin?')
                .setRequired(true)
                .setMaxLength(300)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const konu = interaction.options.getString('konu');

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;
        const bonus = limits.bonus_ai || 0;
        const totalLimit = levelData.aiLimit + bonus;

        if (limits.ai_chat_used >= totalLimit) {
            return interaction.editReply({
                embeds: [errorEmbed('Bugunluk arama hakkin doldu kanka, yarin gel!')]
            });
        }

        try {
            const cevap = await webSearch(konu);
            await db.incrementUsage(userId, 'ai');
            await db.incrementStat(userId, 'question');

            await interaction.editReply({
                embeds: [successEmbed(`Arastirma — ${konu}`, cevap)]
            });
        } catch (err) {
            console.error('ara hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Arastirma yapamadim kanka, tekrar dener misin?')]
            });
        }
    }
};
