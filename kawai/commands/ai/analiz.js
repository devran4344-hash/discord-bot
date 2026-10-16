const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { analyzeMatch } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('analiz')
        .setDescription('Mac istatistiklerini yorumlat')
        .addStringOption(opt =>
            opt.setName('istatistik')
                .setDescription('Mac istatistiklerini yaz (gol, asist, sut vs.)')
                .setRequired(true)
                .setMaxLength(500)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const stats = interaction.options.getString('istatistik');

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;
        const bonus = limits.bonus_ai || 0;
        const totalLimit = levelData.aiLimit + bonus;

        if (limits.ai_chat_used >= totalLimit) {
            return interaction.editReply({
                embeds: [errorEmbed('Bugunluk analiz hakkin doldu kanka, yarin gel!')]
            });
        }

        try {
            const cevap = await analyzeMatch(stats);
            await db.incrementUsage(userId, 'ai');
            await db.incrementStat(userId, 'question');

            await interaction.editReply({
                embeds: [successEmbed('Mac Analizi', cevap)]
            });
        } catch (err) {
            console.error('analiz hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Analiz yapamadim kanka, tekrar dener misin?')]
            });
        }
    }
};
