'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../agentPool');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Müziği duraklatır / devam ettirir'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const agent = await pool.findAgentForGuild(interaction.guildId);
        if (!agent) {
            return interaction.editReply({ embeds: [err('Bu sunucuda çalan müzik yok.')] });
        }

        try {
            const sessions = agent.status?.sessions || [];
            const session  = sessions.find(s => s.guildId === interaction.guildId);
            const isPaused = session?.paused ?? false;
            const cmd      = isPaused ? 'resume' : 'pause';

            await pool.sendCommand(agent.id, cmd, { guildId: interaction.guildId });

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xfee75c)
                    .setDescription(isPaused
                        ? `▶️ **${agent.name}** müziği devam ettirdi.`
                        : `⏸️ **${agent.name}** müziği duraklatı.`
                    )],
            });
        } catch (e) {
            return interaction.editReply({ embeds: [err(e.message)] });
        }
    },
};

function err(msg) {
    return new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${msg}`);
}
