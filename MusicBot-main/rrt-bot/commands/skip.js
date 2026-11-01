'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../agentPool');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Şu an çalan şarkıyı atla'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const agent = await pool.findAgentForGuild(interaction.guildId);
        if (!agent) {
            return interaction.editReply({ embeds: [err('Bu sunucuda çalan müzik yok.')] });
        }

        try {
            await pool.sendCommand(agent.id, 'skip', { guildId: interaction.guildId });
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`⏭️ **${agent.name}** şarkıyı atladı.`)],
            });
        } catch (e) {
            return interaction.editReply({ embeds: [err(e.message)] });
        }
    },
};

function err(msg) {
    return new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${msg}`);
}
