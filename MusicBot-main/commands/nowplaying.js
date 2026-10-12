'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config          = require('../config');
const MusicEmbedManager = require('../src/MusicEmbedManager');
const LanguageManager   = require('../src/LanguageManager');

const { platformColor, platformBadge, buildProgressBar, fmtDuration, buildVolumeBar } = MusicEmbedManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows detailed info about the currently playing song'),

    async execute(interaction, client) {
        try {
            const guild   = interaction.guild;
            const player  = client.players.get(guild.id);

            if (!player) {
                return interaction.reply({
                    embeds: [MusicEmbedManager.error(
                        'Nothing Playing',
                        'There is no music playing right now. Use `/play` to start!'
                    )],
                    ephemeral: true,
                });
            }

            if (!player.currentTrack) {
                return interaction.reply({
                    embeds: [MusicEmbedManager.error(
                        'Nothing Playing',
                        'The player is idle. Use `/play` to queue a song!'
                    )],
                    ephemeral: true,
                });
            }

            const track      = player.currentTrack;
            const currentMs  = player.getCurrentTime?.() ?? player.currentTime ?? 0;
            const status     = player.getStatus?.() ?? {};

            // ── Colours & badges ──
            const color = platformColor(track.platform);
            const badge = platformBadge(track.platform);

            // ── Progress ──
            const progress = buildProgressBar(currentMs, track.duration ?? 0);

            // ── Loop / shuffle / autoplay labels ──
            const loopLabel  = player.loop === 'track' ? '🔂 Track'
                : player.loop === 'queue' ? '🔁 Queue' : '➡️ Off';
            const shuffleLabel = player.shuffle ? '🔀 On' : '🔀 Off';
            const autoLabel    = player.autoplay
                ? `🎲 ${typeof player.autoplay === 'string' ? player.autoplay : 'On'}`
                : '🎲 Off';
            const statusLabel  = player.paused ? '⏸ Paused' : '▶️ Playing';
            const volBar       = buildVolumeBar(player.volume ?? 80);

            // ── Requester ──
            const requester = track.requestedBy
                ? `<@${track.requestedBy.id}>`
                : (track.requestedBy?.toString() ?? '`Unknown`');

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({
                    name: `${badge}  ·  Now Playing`,
                    iconURL: client.user.displayAvatarURL(),
                })
                .setTitle(track.title || 'Unknown Track')
                .setURL(track.url || null)
                .setDescription(progress)
                .addFields(
                    {
                        name: '👤 Artist',
                        value: `\`${track.artist || track.author || 'Unknown'}\``,
                        inline: true,
                    },
                    {
                        name: '💿 Album',
                        value: `\`${track.album || '—'}\``,
                        inline: true,
                    },
                    {
                        name: '🙋 Requested by',
                        value: requester,
                        inline: true,
                    },
                    {
                        name: '▶️ Status',
                        value: `\`${statusLabel}\``,
                        inline: true,
                    },
                    {
                        name: '🔄 Loop',
                        value: `\`${loopLabel}\``,
                        inline: true,
                    },
                    {
                        name: '🔀 Shuffle',
                        value: `\`${shuffleLabel}\``,
                        inline: true,
                    },
                    {
                        name: '🎲 Autoplay',
                        value: `\`${autoLabel}\``,
                        inline: true,
                    },
                    {
                        name: '🔊 Volume',
                        value: volBar,
                        inline: false,
                    },
                )
                .setTimestamp();

            if (track.thumbnail) embed.setThumbnail(track.thumbnail);

            // ── Queue footer ──
            if (player.queue?.length > 0) {
                const next = player.queue[0];
                embed.setFooter({
                    text: `Up next: ${next.title}  ·  ${player.queue.length} track${player.queue.length !== 1 ? 's' : ''} in queue`,
                    iconURL: next.thumbnail || undefined,
                });
                embed.addFields({
                    name: '⏭ Up Next',
                    value: `**[${next.title}](${next.url})**  ·  \`${fmtDuration(next.duration)}\``,
                    inline: false,
                });
            } else {
                embed.setFooter({
                    text: 'Queue is empty — add more with /play',
                    iconURL: client.user.displayAvatarURL(),
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error('nowplaying.execute:', err);
            try {
                const errEmbed = MusicEmbedManager.error('Error', 'Could not retrieve now-playing info.');
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errEmbed], ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },
};
