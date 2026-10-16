const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gorevler')
        .setDescription('Gunluk gorevlerini goster'),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const userData = await db.getUser(interaction.user.id);
            const tasks = userData.daily_tasks || {};

            const lines = config.dailyTasks.map(t => {
                const done = tasks[t.id] ? '✅' : '⬜';
                return `${done} **${t.text}** — +${t.xp} XP`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🌸 Gunluk Gorevler')
                .setDescription(lines || 'Gorev yok.')
                .setFooter({ text: config.footerText })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('gorevler hatasi:', err);
            await interaction.editReply({
                embeds: [errorEmbed('Gorevler getirilemedi kanka.')]
            });
        }
    }
};
