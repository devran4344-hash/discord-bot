'use strict';

const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

const config          = require('../config');
const LanguageManager = require('../src/LanguageManager');
const MusicPlayer     = require('../src/MusicPlayer');
const MusicEmbedManager = require('../src/MusicEmbedManager');

const { platformColor, platformBadge, buildProgressBar, fmtDuration } = MusicEmbedManager;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _isAuthorized(interaction, requesterId) {
    const m = interaction.member;
    if (m.permissions.has('ManageGuild')) return true;
    if (m.roles.cache.some(r => r.name.toLowerCase().includes('dj'))) return true;
    if (m.id === requesterId) return true;
    return false;
}

function _ephemeral(embed) {
    return { embeds: [embed], flags: [1 << 6] };
}

// ─── Module ──────────────────────────────────────────────────────────────────

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isButton()) return;

        const client = interaction.client;
        const guild  = interaction.guild;
        const member = interaction.member;

        // ── Search buttons ──────────────────────────────────────────────────
        if (interaction.customId.startsWith('search_')) {
            return this._handleSearch(interaction, client);
        }

        // ── Language buttons ────────────────────────────────────────────────
        if (interaction.customId.startsWith('language_')) {
            const langCmd = require('../commands/language.js');
            return langCmd.handleLanguageButton(interaction);
        }

        // ── Help refresh ────────────────────────────────────────────────────
        if (interaction.customId === 'help_refresh') {
            return this._handleHelpRefresh(interaction, client);
        }

        // ── Music controls — require voice channel ──────────────────────────
        if (!member.voice.channel) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Voice Channel Required', 'You need to be in a voice channel to use music controls.')
            ));
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Nothing Playing', 'There is no active music player in this server.')
            ));
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Wrong Channel', `I'm playing in <#${player.voiceChannel?.id}>. Join that channel first.`)
            ));
        }

        // ── Session validation ──────────────────────────────────────────────
        const [btnType, requesterId, sessionId] = interaction.customId.split(':');
        if (sessionId && player.sessionId && sessionId !== player.sessionId) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Session Expired', 'These controls belong to a previous session. Use `/nowplaying` for fresh controls.')
            ));
        }

        try {
            switch (btnType) {
                case 'music_pause':    return this._handlePause(interaction, player, requesterId);
                case 'music_skip':     return this._handleSkip(interaction, player, requesterId);
                case 'music_stop':     return this._handleStop(interaction, player, client, requesterId);
                case 'music_queue':    return this._handleQueue(interaction, player);
                case 'music_shuffle':  return this._handleShuffle(interaction, player, requesterId);
                case 'music_volume':   return this._handleVolumeModal(interaction, player, requesterId);
                case 'music_loop':     return this._handleLoop(interaction, player, requesterId);
                case 'music_autoplay': return this._handleAutoplay(interaction, player, requesterId);
                case 'music_lyrics':   return this._handleLyrics(interaction, player);
                default:
                    return interaction.reply(_ephemeral(
                        MusicEmbedManager.error('Unknown Action', 'This button is not recognised.')
                    ));
            }
        } catch (err) {
            console.error('buttonHandler:', err);
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply(_ephemeral(
                    MusicEmbedManager.error('Error', 'Something went wrong while processing that action.')
                )).catch(() => {});
            }
        }
    },

    // ── Pause / Resume ────────────────────────────────────────────────────────
    async _handlePause(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can do that.')
            ));
        }
        if (!player.currentTrack) {
            return interaction.reply(_ephemeral(MusicEmbedManager.error('Nothing Playing', 'There is no track to pause/resume.')));
        }

        const wasPaused = player.paused;
        if (wasPaused) { player.resume(); } else { player.pause(); }

        const color   = platformColor(player.currentTrack?.platform);
        const icon    = wasPaused ? '▶️' : '⏸️';
        const action  = wasPaused ? 'Resumed' : 'Paused';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `${icon}  ${action}`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**[${player.currentTrack.title}](${player.currentTrack.url})**`)
            .addFields({ name: `${icon} Action by`, value: `${member_mention(interaction)}`, inline: true })
            .setTimestamp();

        if (player.currentTrack.thumbnail) embed.setThumbnail(player.currentTrack.thumbnail);

        await interaction.reply(_ephemeral(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Skip ─────────────────────────────────────────────────────────────────
    async _handleSkip(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can skip.')
            ));
        }
        if (!player.currentTrack) {
            return interaction.reply(_ephemeral(MusicEmbedManager.error('Nothing Playing', 'There is no track to skip.')));
        }
        if (!player.queue?.length) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Queue Empty', 'There are no more tracks in the queue to skip to.')
            ));
        }

        const skipped = player.currentTrack;
        player.skip();

        const color = platformColor(skipped.platform);
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: '⏭️  Skipped', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`~~${skipped.title}~~`)
            .addFields(
                { name: '⏭ Skipped by', value: member_mention(interaction), inline: true },
            )
            .setTimestamp();

        if (player.queue?.length > 0) {
            const next = player.queue[0];
            embed.addFields({
                name: '🎵 Up Next',
                value: `**[${next.title}](${next.url})**  ·  \`${fmtDuration(next.duration)}\``,
                inline: false,
            });
            embed.setFooter({ text: `${player.queue.length} track${player.queue.length !== 1 ? 's' : ''} remaining` });
        }

        if (skipped.thumbnail) embed.setThumbnail(skipped.thumbnail);

        await interaction.reply(_ephemeral(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Stop ──────────────────────────────────────────────────────────────────
    async _handleStop(interaction, player, client, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can stop.')
            ));
        }

        const track    = player.currentTrack;
        const queueLen = player.queue?.length ?? 0;
        player.stop();
        client.players.delete(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.error)
            .setAuthor({ name: '⏹️  Stopped', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(
                track
                    ? `Stopped **[${track.title}](${track.url})** and cleared the queue.`
                    : 'Stopped playback and cleared the queue.'
            )
            .addFields(
                { name: '⏹ Stopped by',    value: member_mention(interaction), inline: true },
                { name: '🗑 Tracks cleared', value: `\`${queueLen + (track ? 1 : 0)}\``,    inline: true },
            )
            .setTimestamp();

        if (track?.thumbnail) embed.setThumbnail(track.thumbnail);

        await interaction.reply(_ephemeral(embed));
        await client.musicEmbedManager?.handlePlaybackEnd(player);
    },

    // ── Queue ─────────────────────────────────────────────────────────────────
    async _handleQueue(interaction, player) {
        const current  = player.currentTrack;
        const queue    = player.queue ?? [];

        if (!current && !queue.length) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Queue Empty', 'Nothing is playing and the queue is empty.')
            ));
        }

        const color    = platformColor(current?.platform);
        const currentMs = player.currentTime ?? player.position ?? 0;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: '📋  Queue', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        if (current) {
            const progress = buildProgressBar(currentMs, current.duration ?? 0);
            embed.addFields({
                name: `${player.paused ? '⏸' : '▶️'}  Now Playing`,
                value: `**[${current.title}](${current.url})**\n${progress}`,
                inline: false,
            });
        }

        if (queue.length) {
            const shown = queue.slice(0, 10);
            const lines = shown.map((t, i) =>
                `\`${String(i + 1).padStart(2, ' ')}.\` **[${t.title}](${t.url})**  ·  \`${fmtDuration(t.duration)}\``
            ).join('\n');

            embed.addFields({
                name: `📋  Up Next  (${queue.length} track${queue.length !== 1 ? 's' : ''})`,
                value: lines + (queue.length > 10 ? `\n*…and ${queue.length - 10} more*` : ''),
                inline: false,
            });
        }

        embed.setFooter({
            text: `Total: ${queue.length + (current ? 1 : 0)} track${queue.length + (current ? 1 : 0) !== 1 ? 's' : ''}`,
        });

        await interaction.reply(_ephemeral(embed));
    },

    // ── Shuffle ───────────────────────────────────────────────────────────────
    async _handleShuffle(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can shuffle.')
            ));
        }
        if ((player.queue?.length ?? 0) < 2) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Enough Tracks', 'You need at least 2 tracks in the queue to shuffle.')
            ));
        }

        player.shuffleQueue?.();

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setAuthor({ name: '🔀  Queue Shuffled', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**${player.queue.length}** tracks have been shuffled.`)
            .addFields(
                { name: '🔀 Shuffled by', value: member_mention(interaction), inline: true },
            );

        if (player.queue.length > 0) {
            embed.addFields({
                name: '🎵 New First Three',
                value: player.queue.slice(0, 3)
                    .map((t, i) => `\`${i + 1}.\` **${t.title}**`)
                    .join('\n'),
                inline: false,
            });
        }

        embed.setTimestamp();

        await interaction.reply(_ephemeral(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Volume modal ──────────────────────────────────────────────────────────
    async _handleVolumeModal(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can change volume.')
            ));
        }

        const modal = new ModalBuilder()
            .setCustomId('volume_modal')
            .setTitle('🔊  Set Volume');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('volume_input')
                    .setLabel(`Current: ${player.volume ?? 80}%  —  Enter new value (0–100)`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(1)
                    .setMaxLength(3)
                    .setPlaceholder('e.g. 75')
                    .setRequired(true)
            )
        );

        await interaction.showModal(modal);
    },

    // ── Loop ──────────────────────────────────────────────────────────────────
    async _handleLoop(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can change loop mode.')
            ));
        }
        if (!player.currentTrack) {
            return interaction.reply(_ephemeral(MusicEmbedManager.error('Nothing Playing', 'No track is playing.')));
        }

        // Cycle: off → track → queue → off
        let newMode, icon, label;
        if (!player.loop || player.loop === 'off' || player.loop === false) {
            newMode = 'track'; icon = '🔂'; label = 'Loop: Track';
        } else if (player.loop === 'track') {
            newMode = 'queue'; icon = '🔁'; label = 'Loop: Queue';
        } else {
            newMode = false;   icon = '➡️'; label = 'Loop: Off';
        }
        player.loop = newMode;

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.info)
            .setAuthor({ name: `${icon}  Loop Mode Changed`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Loop mode set to **${label}**.`)
            .addFields({ name: `${icon} Changed by`, value: member_mention(interaction), inline: true })
            .setTimestamp();

        if (player.currentTrack?.thumbnail) embed.setThumbnail(player.currentTrack.thumbnail);

        await interaction.reply(_ephemeral(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Autoplay ──────────────────────────────────────────────────────────────
    async _handleAutoplay(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_ephemeral(
                MusicEmbedManager.error('Not Authorised', 'Only the DJ, someone with Manage Server, or the person who started the music can change autoplay.')
            ));
        }

        // If already on → turn off
        if (player.autoplay) {
            player.autoplay = false;
            const embed = new EmbedBuilder()
                .setColor(config.bot.colors.warning)
                .setAuthor({ name: '🎲  Autoplay Disabled', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription('Autoplay has been turned **off**. The bot will stop when the queue is empty.')
                .setTimestamp();

            await interaction.reply(_ephemeral(embed));
            await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
            return;
        }

        // Show genre picker
        const genres = [
            { label: 'Pop',        value: 'pop',        emoji: '🎤' },
            { label: 'Rock',       value: 'rock',       emoji: '🎸' },
            { label: 'Hip-Hop',    value: 'hiphop',     emoji: '🎧' },
            { label: 'Electronic', value: 'electronic', emoji: '🎛️' },
            { label: 'Jazz',       value: 'jazz',       emoji: '🎷' },
            { label: 'Classical',  value: 'classical',  emoji: '🎻' },
            { label: 'Metal',      value: 'metal',      emoji: '🤘' },
            { label: 'Country',    value: 'country',    emoji: '🤠' },
            { label: 'R&B',        value: 'rnb',        emoji: '💃' },
            { label: 'Indie',      value: 'indie',      emoji: '🌿' },
            { label: 'Latin',      value: 'latin',      emoji: '🪇' },
            { label: 'K-Pop',      value: 'kpop',       emoji: '🇰🇷' },
            { label: 'Anime',      value: 'anime',      emoji: '🎌' },
            { label: 'Lo-Fi',      value: 'lofi',       emoji: '🌙' },
            { label: 'Random',     value: 'random',     emoji: '🎲' },
        ];

        const select = new StringSelectMenuBuilder()
            .setCustomId(`autoplay_genre:${requesterId}:${player.sessionId}`)
            .setPlaceholder('Choose a genre for autoplay…')
            .addOptions(genres.map(g =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(g.label)
                    .setValue(g.value)
                    .setEmoji(g.emoji)
            ));

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.default)
            .setAuthor({ name: '🎲  Autoplay — Genre Select', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Pick a genre. Once the queue is empty the bot will automatically queue matching tracks.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)], flags: [1 << 6] });
    },

    // ── Lyrics ────────────────────────────────────────────────────────────────
    async _handleLyrics(interaction, player) {
        if (!player.currentTrack) {
            return interaction.reply(_ephemeral(MusicEmbedManager.error('Nothing Playing', 'No track is currently playing.')));
        }

        await interaction.deferReply({ flags: [1 << 6] });

        const lyrics = player.currentLyrics;
        if (!lyrics?.pages?.length) {
            return interaction.editReply({ embeds: [MusicEmbedManager.error('No Lyrics', `Could not find lyrics for **${player.currentTrack.title}**.`)] });
        }

        const buildPage = (i) => new EmbedBuilder()
            .setColor(platformColor(player.currentTrack?.platform))
            .setAuthor({ name: '🎤  Lyrics', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(player.currentTrack.title)
            .setURL(player.currentTrack.url || null)
            .setDescription(lyrics.pages[i])
            .setFooter({ text: `Page ${i + 1} / ${lyrics.pages.length}  ·  Source: ${lyrics.source || 'Unknown'}` })
            .setTimestamp();

        let page = 0;
        const msg = await interaction.editReply({ embeds: [buildPage(page)], components: _lyricsRow(page, lyrics.pages.length) });

        if (lyrics.pages.length <= 1) return;

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 5 * 60_000 });
        collector.on('collect', async i => {
            if (i.customId === 'lyrics_prev') page = Math.max(0, page - 1);
            if (i.customId === 'lyrics_next') page = Math.min(lyrics.pages.length - 1, page + 1);
            await i.update({ embeds: [buildPage(page)], components: _lyricsRow(page, lyrics.pages.length) });
        });
        collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    },

    // ── Search interaction ────────────────────────────────────────────────────
    async _handleSearch(interaction, client) {
        if (interaction.customId === 'search_cancel') {
            global.searchResults?.delete(interaction.user.id);
            return interaction.update({
                embeds: [MusicEmbedManager.info('🚫  Cancelled', 'Search cancelled.', config.bot.colors.warning)],
                components: [],
            });
        }

        const idx     = parseInt(interaction.customId.replace('search_select_', ''), 10);
        const stored  = global.searchResults?.get(interaction.user.id);

        if (!stored?.results?.length) {
            return interaction.update({
                embeds: [MusicEmbedManager.error('Expired', 'Search results have expired. Run `/search` again.')],
                components: [],
            });
        }

        const track  = stored.results[idx];
        if (!track) {
            return interaction.update({
                embeds: [MusicEmbedManager.error('Invalid', 'Could not find that result. Run `/search` again.')],
                components: [],
            });
        }

        global.searchResults.delete(interaction.user.id);

        // ── Validate voice ──
        const member = interaction.member;
        const guild  = interaction.guild;

        if (!member.voice.channel) {
            return interaction.update({
                embeds: [MusicEmbedManager.error('Voice Channel Required', 'Join a voice channel first.')],
                components: [],
            });
        }

        const { PermissionFlagsBits } = require('discord.js');
        const perms = member.voice.channel.permissionsFor(guild.members.me);
        if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
            return interaction.update({
                embeds: [MusicEmbedManager.error('Missing Permissions', 'I need Connect and Speak permissions.')],
                components: [],
            });
        }

        // ── Show selected ──
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.bot.colors.youtube)
                    .setAuthor({ name: '🔴 YouTube  ·  Selected', iconURL: client.user.displayAvatarURL() })
                    .setTitle(track.title || 'Unknown')
                    .setURL(track.url || null)
                    .setDescription(`**Duration:** \`${fmtDuration(track.duration)}\`\n**Artist:** \`${track.artist || track.author || 'Unknown'}\``)
                    .setFooter({ text: 'Adding to queue…' })
                    .setTimestamp(),
            ],
            components: [],
        });

        // ── Queue it ──
        let player = client.players.get(guild.id);
        if (!player) {
            const MusicPlayer = require('../src/MusicPlayer');
            player = new MusicPlayer(guild, interaction.channel, member.voice.channel);
            client.players.set(guild.id, player);
        }
        player.voiceChannel = member.voice.channel;
        player.textChannel  = interaction.channel;

        if (!client.musicEmbedManager) {
            client.musicEmbedManager = new MusicEmbedManager(client);
        }

        await client.musicEmbedManager.handleMusicData(
            guild.id,
            { tracks: [track], isPlaylist: false },
            member,
            null,
        );
    },

    // ── Help refresh ──────────────────────────────────────────────────────────
    async _handleHelpRefresh(interaction, client) {
        await interaction.deferUpdate();
        const helpCmd = require('../commands/help.js');
        const embed   = await helpCmd._buildEmbed(client, interaction.guild.id);
        const row     = helpCmd._buildButtons();
        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function member_mention(interaction) {
    return `<@${interaction.member.id}>`;
}

function _lyricsRow(page, total) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lyrics_prev')
                .setLabel('Previous')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('lyrics_next')
                .setLabel('Next')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === total - 1),
        ),
    ];
}
