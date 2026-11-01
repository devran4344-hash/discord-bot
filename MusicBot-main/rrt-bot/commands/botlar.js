'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../agentPool');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botlar')
        .setDescription('Tüm ajan botların durumunu gösterir'),

    async execute(interaction) {
        await interaction.deferReply();

        const statuses = await pool.getAllStatuses();

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🤖 RRT Müzik Botları — Durum')
            .setTimestamp()
            .setFooter({ text: 'Her /play komutu otomatik olarak en uygun bota yönlendirilir.' });

        for (const agent of statuses) {
            if (!agent.online) {
                embed.addFields({
                    name: `${agent.name}`,
                    value: '🔴 Çevrimdışı',
                    inline: true,
                });
                continue;
            }

            const sessions     = agent.status?.sessions || [];
            const activeCount  = agent.status?.activeSessions || 0;
            const guilds       = agent.status?.guilds || 0;

            let sessionLines = '';
            if (sessions.length > 0) {
                sessionLines = sessions.map(s =>
                    `> 🎵 **${s.track}**\n` +
                    `> 👤 ${s.artist || '?'}  •  🔊 ${s.voiceChannel}\n` +
                    `> ${s.paused ? '⏸️ Duraklatılmış' : '▶️ Çalıyor'}  •  Kuyruk: ${s.queueLength}`
                ).join('\n\n');
            }

            embed.addFields({
                name: `🟢 ${agent.name}`,
                value:
                    `> Sunucu: **${guilds}**  •  Aktif oturum: **${activeCount}**\n` +
                    (sessionLines || '> Boşta — hazır'),
                inline: false,
            });
        }

        // Özet
        const onlineCount = statuses.filter(s => s.online).length;
        const busyCount   = statuses.filter(s => s.online && (s.status?.activeSessions || 0) > 0).length;
        embed.setDescription(
            `**${onlineCount}/${statuses.length}** bot çevrimiçi  •  **${busyCount}** bot aktif`
        );

        return interaction.editReply({ embeds: [embed] });
    },
};
