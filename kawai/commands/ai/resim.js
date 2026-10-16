const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { generateImage } = require('../../utils/ai');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resim')
        .setDescription('AI ile gorsel uret')
        .addStringOption(opt =>
            opt.setName('prompt')
                .setDescription('Ne cizmek istersin?')
                .setRequired(true)
                .setMaxLength(400)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        if (!config.ai.imageEnabled) {
            return interaction.editReply({
                embeds: [errorEmbed('Gorsel uretme su an devre disi kanka.')]
            });
        }

        const userId = interaction.user.id;
        const prompt = interaction.options.getString('prompt');

        const userData = await db.getUser(userId);
        const levelData = getUserLevel(userData.xp);
        const limits = userData.daily_limits;

        // Kampanya kontrolu
        const campaign = await db.getCampaign();
        let bedava = false;
        if (campaign && campaign.type === 'bedava_foto' && campaign.used < campaign.count) {
            bedava = true;
            await db.useCampaign();
        }

        if (!bedava && limits.image_gen_used >= levelData.imageLimit) {
            return interaction.editReply({
                embeds: [errorEmbed(`Bugunluk fotograf uretme hakkın doldu! (**${limits.image_gen_used}/${levelData.imageLimit}**)\nYarin gel ya da level atla 😎`)]
            });
        }

        try {
            const imageUrl = await generateImage(prompt);

            if (!bedava) {
                await db.incrementUsage(userId, 'image');
            }
            await db.incrementStat(userId, 'image');

            const usedNow = bedava ? limits.image_gen_used : limits.image_gen_used + 1;
            const footer = bedava ? '\n\n🎁 **Bu fotograf Kawai den hediye!**' : `\n\n🖼️ Kalan hak: **${levelData.imageLimit - usedNow}**`;

            const embed = successEmbed('Iste Senin Icin Cizdim', `**Istek:** ${prompt}${footer}`);
            embed.setImage(imageUrl);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('resim hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Fircam takildi kanka, tekrar dener misin?')]
            });
        }
    }
};
