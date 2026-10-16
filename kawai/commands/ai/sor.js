const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { askAI } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sor')
        .setDescription('Kawai ye RSS hakkinda soru sor')
        .addStringOption(opt =>
            opt.setName('soru')
                .setDescription('Sorunu yaz')
                .setRequired(true)
                .setMaxLength(500)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const soru = interaction.options.getString('soru');

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;
        const bonus = limits.bonus_ai || 0;
        const totalLimit = levelData.aiLimit + bonus;

        // Kampanya kontrolu (bedava soru)
        const campaign = await db.getCampaign();
        let bedava = false;
        if (campaign && campaign.type === 'bedava_soru' && campaign.used < campaign.count) {
            bedava = true;
            await db.useCampaign();
        }

        // Kota kontrolu
        if (!bedava && limits.ai_chat_used >= totalLimit) {
            return interaction.editReply({
                embeds: [errorEmbed(`Kanka bugunluk soru sorma hakkın doldu! (**${limits.ai_chat_used}/${totalLimit}**)\nYarin gel ya da level atla 😎`)]
            });
        }

        try {
            const cevap = await askAI(soru, userData.memory_summary);

            if (!bedava) {
                await db.incrementUsage(userId, 'ai');
            }
            await db.incrementStat(userId, 'question');
            await db.addXp(userId, config.xp.questionXp);

            const usedNow = bedava ? limits.ai_chat_used : limits.ai_chat_used + 1;
            const footer = bedava ? '\n\n🎁 **Bu soru Kawai den hediye!**' : `\n\n📊 Kalan hak: **${totalLimit - usedNow}**`;

            await interaction.editReply({
                embeds: [successEmbed('RSS Kocu Cevapliyor', cevap + footer)]
            });
        } catch (err) {
            console.error('sor hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Sunucularda yogunluk var kanka, birazdan tekrar dener misin?')]
            });
        }
    }
};
