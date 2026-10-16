const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { getTactic } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taktik')
        .setDescription('Anlik taktik onerisi al')
        .addStringOption(opt =>
            opt.setName('durum')
                .setDescription('Mac durumunu anlat (skor, pozisyon vs.)')
                .setRequired(true)
                .setMaxLength(400)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const durum = interaction.options.getString('durum');

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;
        const bonus = limits.bonus_ai || 0;
        const totalLimit = levelData.aiLimit + bonus;

        if (limits.ai_chat_used >= totalLimit) {
            return interaction.editReply({
                embeds: [errorEmbed('Bugunluk taktik hakkin doldu kanka, yarin gel!')]
            });
        }

        try {
            const cevap = await getTactic(durum);
            await db.incrementUsage(userId, 'ai');
            await db.incrementStat(userId, 'question');

            await interaction.editReply({
                embeds: [successEmbed('Taktik Onerisi', cevap)]
            });
        } catch (err) {
            console.error('taktik hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Taktik uretemedim kanka, tekrar dener misin?')]
            });
        }
    }
};
