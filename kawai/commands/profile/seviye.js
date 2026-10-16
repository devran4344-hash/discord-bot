const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const { errorEmbed } = require('../../utils/embeds');
const { getUserLevel, getNextLevel, createXpBar } = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seviye')
        .setDescription('Sadece level ve XP barini goster'),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const userData = await db.getUser(interaction.user.id);
            const levelData = getUserLevel(userData.xp);
            const nextLevel = getNextLevel(userData.xp);

            const bar = createXpBar(
                userData.xp,
                levelData.minXp,
                nextLevel ? nextLevel.minXp : null
            );

            const embed = new EmbedBuilder()
                .setColor(config.colors.main)
                .setTitle('🌸 Seviye Bilgin')
                .setDescription(`**Level ${levelData.level}** — ${levelData.name}\n${bar}`)
                .setFooter({ text: config.footerText })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('seviye hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Seviye bilgisi getirilemedi.')]
            });
        }
    }
};
