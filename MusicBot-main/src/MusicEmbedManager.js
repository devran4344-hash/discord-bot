'use strict';

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config   = require('../config');
const LanguageManager = require('./LanguageManager');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Platform → brand colour */
function platformColor(platform) {
    const map = {
        youtube:    config.bot.colors.youtube,
        spotify:    config.bot.colors.spotify,
        soundcloud: config.bot.colors.soundcloud,
        direct:     config.bot.colors.direct,
    };
    return map[(platform || '').toLowerCase()] || config.bot.colors.default;
}

/** Platform → badge string */
function platformBadge(platform) {
    const map = {
        youtube:    '🔴 YouTube',
        spotify:    '🟢 Spotify',
        soundcloud: '🟠 SoundCloud',
        direct:     '🔗 Direct Link',
    };
    return map[(platform || '').toLowerCase()] || '🎵 Unknown';
}

/** Seconds → human-readable duration */
function fmtDuration(sec) {
    const s = Math.floor(Number(sec) || 0);
    if (s <= 0) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${m}:${String(ss).padStart(2,'0')}`;
}

/** ms → human-readable */
function fmtMs(ms) { return fmtDuration(Math.floor((ms || 0) / 1000)); }

/**
 * Sleek Unicode progress bar
 * e.g.  ━━━━━━━━●────────────  3:12 / 7:45
 */
function buildProgressBar(currentMs, totalSec, barLen = 18) {
    const totalMs = (totalSec || 0) * 1000;
    const pct     = totalMs > 0 ? Math.min(currentMs / totalMs, 1) : 0;
    const filled  = Math.round(pct * barLen);
    const bar     = '━'.repeat(filled) + '●' + '─'.repeat(barLen - filled);
    return `\`${bar}\`  \`${fmtMs(currentMs)} / ${fmtDuration(totalSec)}\``;
}

/** Volume bar  ▰▰▰▰▰▱▱▱▱▱  50% */
function buildVolumeBar(vol, len = 10) {
    const filled = Math.round((vol / 100) * len);
    return `${'▰'.repeat(filled)}${'▱'.repeat(len - filled)}  **${vol}%**`;
}

// ─── Main class ──────────────────────────────────────────────────────────────

class MusicEmbedManager {
    constructor(client) {
        this.client = client;
        /** Serialises concurrent handleMusicData calls per guild */
        this.processingQueue = new Map(); // guildId → Promise
    }

    // ── public entry ─────────────────────────────────────────────────────────

    async handleMusicData(guildId, trackData, member, interaction = null) {
        if (this.processingQueue.has(guildId)) {
            await this.processingQueue.get(guildId);
        }
        const p = this._processMusic(guildId, trackData, member, interaction);
        this.processingQueue.set(guildId, p);
        try   { return await p; }
        finally { this.processingQueue.delete(guildId); }
    }

    // ── internal orchestration ────────────────────────────────────────────────

    async _processMusic(guildId, trackData, member, interaction) {
        const player = this.client.players.get(guildId);
        if (!player) return { success: false, message: 'No player found' };

        const { tracks, isPlaylist = false } = trackData;
        const wasIdle = !player.currentTrack && player.queue.length === 0;

        try {
            let firstResult = null;

            for (let i = 0; i < tracks.length; i++) {
                const track = { ...tracks[i], requestedBy: member, addedAt: Date.now() };

                if (i === 0 && wasIdle) {
                    player.currentTrack = track;
                    try {
                        if (!player.connection) await player.connect();
                        await player.play();
                        firstResult = await this._sendNowPlayingEmbed(player, track, member, interaction);
                    } catch (err) {
                        console.error('▶ play error:', err.message);
                        player.currentTrack = null;
                        player.queue.push(track);
                    }
                } else {
                    player.queue.push(track);
                }
            }

            // Background preload — non-blocking
            this._sequentialPreload(player, player.queue.slice()).catch(() => {});

            if (firstResult && tracks.length > 1) {
                await this._sendQueueAddedMsg(player, tracks.slice(1), member, interaction, isPlaylist);
                await this.updateNowPlayingEmbed(player);
                return firstResult;
            }

            if (!firstResult && tracks.length > 0) {
                return await this._handleQueueAddition(player, tracks, member, interaction, isPlaylist);
            }

            return firstResult || { success: true };
        } catch (err) {
            console.error('_processMusic error:', err);
            return { success: false, message: 'Error processing music' };
        }
    }

    async _sequentialPreload(player, tracks) {
        for (const t of tracks) {
            if (player.preloadedStreams?.has(t.url) || player.preloadingQueue?.includes(t.url)) continue;
            try {
                await player.preloadTrack?.(t);
                await new Promise(r => setTimeout(r, 100));
            } catch { /* continue */ }
        }
    }

    // ── Now-playing embed ─────────────────────────────────────────────────────

    /**
     * Builds the rich "Now Playing" embed.
     * Used both for fresh sends and live updates.
     */
    async createNowPlayingEmbed(player, track, guildId) {
        const color    = platformColor(track.platform);
        const badge    = platformBadge(track.platform);
        const currentMs = player.currentTime ?? player.position ?? 0;
        const progress  = buildProgressBar(currentMs, track.duration);

        const loopIcon = player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '➡️';
        const shuffleIcon = player.shuffle ? '🔀 On' : '🔀 Off';
        const autoplayIcon = player.autoplay ? `🎲 ${player.autoplay}` : '🎲 Off';
        const volIcon = player.volume >= 70 ? '🔊' : player.volume >= 30 ? '🔉' : '🔈';

        const queueLen = player.queue?.length ?? 0;

        // ── Requester display ──
        const requester = track.requestedBy
            ? `<@${track.requestedBy.id}>`
            : (track.requestedBy?.toString() ?? 'Unknown');

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `${badge}  ·  Now Playing`,
                iconURL: this.client.user.displayAvatarURL(),
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
                    name: '📀 Album',
                    value: `\`${track.album || '—'}\``,
                    inline: true,
                },
                {
                    name: '🙋 Requested by',
                    value: requester,
                    inline: true,
                },
                {
                    name: `${volIcon} Volume`,
                    value: `\`${player.volume ?? 80}%\``,
                    inline: true,
                },
                {
                    name: '🔄 Loop',
                    value: `\`${loopIcon}\``,
                    inline: true,
                },
                {
                    name: '🔀 Shuffle',
                    value: `\`${shuffleIcon}\``,
                    inline: true,
                },
                {
                    name: '📋 Queue',
                    value: queueLen > 0
                        ? `\`${queueLen} track${queueLen !== 1 ? 's' : ''} remaining\``
                        : `\`Empty\``,
                    inline: true,
                },
                {
                    name: '🎲 Autoplay',
                    value: `\`${autoplayIcon}\``,
                    inline: true,
                },
                {
                    name: player.paused ? '⏸ Status' : '▶️ Status',
                    value: player.paused ? '`Paused`' : '`Playing`',
                    inline: true,
                },
            )
            .setTimestamp();

        if (track.thumbnail) embed.setThumbnail(track.thumbnail);

        // Next track hint
        if (queueLen > 0) {
            const next = player.queue[0];
            embed.setFooter({
                text: `Up next: ${next.title}  ·  ${queueLen} in queue`,
                iconURL: next.thumbnail || undefined,
            });
        } else {
            embed.setFooter({
                text: 'Queue is empty — add more songs with /play',
                iconURL: this.client.user.displayAvatarURL(),
            });
        }

        return embed;
    }

    async _sendNowPlayingEmbed(player, track, member, interaction) {
        const embed   = await this.createNowPlayingEmbed(player, track, member.guild.id);
        const buttons = await this.createControlButtons(player);
        let msg;

        if (interaction) {
            if (interaction.deferred || interaction.replied) {
                msg = await interaction.editReply({ content: null, embeds: [embed], components: buttons });
            } else {
                msg = await interaction.reply({ embeds: [embed], components: buttons });
            }
        } else {
            msg = await player.textChannel.send({ embeds: [embed], components: buttons });
        }

        player.nowPlayingMessage = msg;
        player.requesterId = member.id;
        return { success: true, isNewEmbed: true };
    }

    async updateNowPlayingEmbed(player) {
        if (!player.nowPlayingMessage || !player.currentTrack) return;
        try {
            const embed   = await this.createNowPlayingEmbed(player, player.currentTrack, player.guild.id);
            const buttons = await this.createControlButtons(player);
            await player.nowPlayingMessage.edit({ embeds: [embed], components: buttons });
        } catch (err) {
            if (err.code !== 10008) console.error('updateNowPlayingEmbed:', err.message);
        }
    }

    // ── Queue-addition message ────────────────────────────────────────────────

    async _handleQueueAddition(player, tracks, member, interaction, isPlaylist) {
        if (player.nowPlayingMessage && player.currentTrack) {
            await this.updateNowPlayingEmbed(player);
        }

        const embed = this._buildQueueAddedEmbed(tracks, member, isPlaylist);
        let msg;

        if (interaction) {
            if (interaction.deferred || interaction.replied) {
                msg = await interaction.editReply({ content: null, embeds: [embed], components: [] });
            } else {
                msg = await interaction.reply({ embeds: [embed], flags: [1 << 6] });
            }
        } else {
            msg = await player.textChannel.send({ embeds: [embed] });
        }

        // Auto-delete ephemeral-style confirmation
        if (msg && !interaction?.flags) {
            setTimeout(() => msg.delete().catch(() => {}), 12_000);
        }

        return { success: true, isNewEmbed: false };
    }

    async _sendQueueAddedMsg(player, tracks, member, interaction, isPlaylist) {
        const embed = this._buildQueueAddedEmbed(tracks, member, isPlaylist);
        let msg;
        try {
            msg = await player.textChannel.send({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => {}), 12_000);
        } catch { /* channel gone */ }
    }

    _buildQueueAddedEmbed(tracks, member, isPlaylist) {
        const color = platformColor(tracks[0]?.platform);
        const isMulti = isPlaylist || tracks.length > 1;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTimestamp();

        if (isMulti) {
            embed
                .setAuthor({ name: '📋  Added to Queue' })
                .setTitle(`${tracks.length} tracks added`)
                .setDescription(
                    tracks.slice(0, 5).map((t, i) =>
                        `\`${i + 1}.\` **[${t.title}](${t.url})**`
                    ).join('\n') +
                    (tracks.length > 5 ? `\n*…and ${tracks.length - 5} more*` : '')
                )
                .setFooter({ text: `Queued by ${member.displayName || member.user?.username}` });
        } else {
            const t = tracks[0];
            embed
                .setAuthor({ name: `${platformBadge(t?.platform)}  ·  Added to Queue` })
                .setTitle(t?.title || 'Unknown Track')
                .setURL(t?.url || null)
                .setDescription(
                    `**Duration:** \`${fmtDuration(t?.duration)}\`\n` +
                    `**Artist:** \`${t?.artist || t?.author || 'Unknown'}\``
                )
                .setFooter({ text: `Queued by ${member.displayName || member.user?.username}` });
            if (t?.thumbnail) embed.setThumbnail(t.thumbnail);
        }

        return embed;
    }

    // ── Playback end ──────────────────────────────────────────────────────────

    async handlePlaybackEnd(player) {
        // Disable all buttons on the now-playing message
        if (player.nowPlayingMessage) {
            try {
                const disabledRows = await this.createControlButtons(player, true);
                await player.nowPlayingMessage.edit({ components: disabledRows });
            } catch { /* message may be deleted */ }
        }

        const endEmbed = new EmbedBuilder()
            .setColor(config.bot.colors.info)
            .setAuthor({
                name: '⏹  Playback Ended',
                iconURL: this.client.user.displayAvatarURL(),
            })
            .setDescription(
                '> The queue is now empty.\n> Add more songs with `/play` to keep the party going! 🎉'
            )
            .setTimestamp()
            .setFooter({
                text: this.client.user.username,
                iconURL: this.client.user.displayAvatarURL(),
            });

        try {
            await player.textChannel?.send({ embeds: [endEmbed] });
        } catch { /* channel unavailable */ }

        player.currentTrack    = null;
        player.nowPlayingMessage = null;
    }

    // ── Control buttons ───────────────────────────────────────────────────────

    async createControlButtons(player, disabled = false) {
        const guildId    = player.guild.id;
        const sessionId  = player.sessionId;
        const reqId      = player.requesterId;
        const id         = (name) => `${name}:${reqId}:${sessionId}`;
        const paused     = player.paused;
        const queueEmpty = !player.queue?.length;
        const hasLyrics  = typeof player.hasLyrics === 'function' ? player.hasLyrics() : false;

        // ── Row 1: transport ──────────────────────────────────────────────
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(id('music_pause'))
                .setEmoji(paused ? '▶️' : '⏸️')
                .setLabel(paused ? 'Resume' : 'Pause')
                .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),

            new ButtonBuilder()
                .setCustomId(id('music_skip'))
                .setEmoji('⏭️')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || queueEmpty),

            new ButtonBuilder()
                .setCustomId(id('music_stop'))
                .setEmoji('⏹️')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),

            new ButtonBuilder()
                .setCustomId(id('music_queue'))
                .setEmoji('📋')
                .setLabel('Queue')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(false),

            new ButtonBuilder()
                .setCustomId(id('music_shuffle'))
                .setEmoji('🔀')
                .setLabel('Shuffle')
                .setStyle(player.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),
        );

        // ── Row 2: extras ─────────────────────────────────────────────────
        const loopStyle = player.loop === 'track' || player.loop === 'queue'
            ? ButtonStyle.Success : ButtonStyle.Secondary;
        const loopEmoji = player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '➡️';
        const loopLabel = player.loop === 'track' ? 'Loop: Track'
            : player.loop === 'queue' ? 'Loop: Queue' : 'Loop: Off';

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(id('music_volume'))
                .setEmoji('🔊')
                .setLabel('Volume')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),

            new ButtonBuilder()
                .setCustomId(id('music_loop'))
                .setEmoji(loopEmoji)
                .setLabel(loopLabel)
                .setStyle(loopStyle)
                .setDisabled(disabled),

            new ButtonBuilder()
                .setCustomId(id('music_autoplay'))
                .setEmoji('🎲')
                .setLabel(player.autoplay ? 'Autoplay: On' : 'Autoplay')
                .setStyle(player.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),

            new ButtonBuilder()
                .setCustomId(id('music_lyrics'))
                .setEmoji('🎤')
                .setLabel('Lyrics')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || !hasLyrics),
        );

        return [row1, row2];
    }

    // ── Generic embed builders (used by commands & handlers) ──────────────────

    /** Quick success embed */
    static success(title, description, thumbnail) {
        const e = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setTitle(`✅  ${title}`)
            .setDescription(description)
            .setTimestamp();
        if (thumbnail) e.setThumbnail(thumbnail);
        return e;
    }

    /** Quick error embed */
    static error(title, description) {
        return new EmbedBuilder()
            .setColor(config.bot.colors.error)
            .setTitle(`❌  ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /** Quick info embed */
    static info(title, description, color) {
        return new EmbedBuilder()
            .setColor(color || config.bot.colors.info)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    // ── Utility re-exports ────────────────────────────────────────────────────
    static fmtDuration = fmtDuration;
    static fmtMs       = fmtMs;
    static buildProgressBar  = buildProgressBar;
    static buildVolumeBar    = buildVolumeBar;
    static platformColor     = platformColor;
    static platformBadge     = platformBadge;
}

module.exports = MusicEmbedManager;
