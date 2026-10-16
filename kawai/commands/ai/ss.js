const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { analyzeScreenshot } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ss')
        .setDescription('Oyun ici ekran goruntusu at, taktik al')
        .addAttachmentOption(opt =>
            opt.setName('foto')
                .setDescription('RSS ekran goruntusu')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('not')
                .setDescription('Ekstra not (opsiyonel)')
                .setRequired(false)
                .setMaxLength(300)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const attachment = interaction.options.getAttachment('foto');
        const not = interaction.options.getString('not') || 'Bu pozisyonu analiz et';

        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            return interaction.editReply({
                embeds: [errorEmbed('Sadece fotograf atabilirsin kanka!')]
            });
        }

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;

        if (limits.screenshot_used >= levelData.visionLimit) {
            return interaction.editReply({
                embeds: [errorEmbed(`Bugunluk SS analiz hakkın bitti! (**${limits.screenshot_used}/${levelData.visionLimit}**)\nYarin tekrar dene.`)]
            });
        }

        try {
            const analiz = await analyzeScreenshot(attachment.url, not);

            await db.incrementUsage(userId, 'vision');
            await db.incrementStat(userId, 'screenshot');
            await db.addXp(userId, config.xp.screenshotXp);

            const embed = successEmbed('Taktiksel Analiz', analiz + `\n\n📸 Kalan hak: **${levelData.visionLimit - limits.screenshot_used - 1}**`);
            embed.setImage(attachment.url);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('ss hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Fotografi analiz edemedim kanka, tekrar dener misin?')]
            });
        }
    }
};
