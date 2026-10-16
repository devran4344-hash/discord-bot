const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const { errorEmbed } = require('../../utils/embeds');
const { getUserLevel } = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liderlik')
        .setDescription('Sunucudaki en yuksek levelli 10 kisi'),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const list = await db.getLeaderboard(10);

            if (!list.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('Henuz kimse XP kazanmamis kanka.')]
                });
            }

            const medals = ['🥇', '🥈', '🥉'];
            const lines = list.map((u, i) => {
                const levelData = getUserLevel(u.xp);
                const prefix = medals[i] || `**${i + 1}.**`;
                return `${prefix} <@${u.id}> — Lv. **${levelData.level}** (${levelData.name}) | **${u.xp} XP**`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.levelup)
                .setTitle('🏆 Liderlik Tablosu')
                .setDescription(lines)
                .setFooter({ text: config.footerText })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('liderlik hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Liderlik tablosu getirilemedi.')]
            });
        }
    }
};
