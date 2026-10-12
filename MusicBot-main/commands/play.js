'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config         = require('../config');
const MusicPlayer    = require('../src/MusicPlayer');
const MusicEmbedManager = require('../src/MusicEmbedManager');
const LanguageManager   = require('../src/LanguageManager');
const ErrorHandler      = require('../src/ErrorHandler');

// ─── Platform detection ──────────────────────────────────────────────────────

function detectPlatform(query) {
    const q = query.toLowerCase();
    if (q.includes('youtube.com') || q.includes('youtu.be'))  return 'youtube';
    if (q.includes('spotify.com'))                             return 'spotify';
    if (q.includes('soundcloud.com'))                          return 'soundcloud';
    if (q.startsWith('http') && /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus|webm|mp4)(\?|$)/i.test(q))
        return 'direct';
    return 'youtube'; // default: YouTube text search
}

// ─── Searching embed ─────────────────────────────────────────────────────────

function buildSearchingEmbed(platform, query, clientUser) {
    const badge = {
        youtube:    { label: '🔴 YouTube',    color: config.bot.colors.youtube    },
        spotify:    { label: '🟢 Spotify',    color: config.bot.colors.spotify    },
        soundcloud: { label: '🟠 SoundCloud', color: config.bot.colors.soundcloud },
        direct:     { label: '🔗 Direct Link',color: config.bot.colors.direct     },
    }[platform] || { label: '🎵 Music', color: config.bot.colors.default };

    return new EmbedBuilder()
        .setColor(badge.color)
        .setAuthor({
            name: `${badge.label}  ·  Searching…`,
            iconURL: clientUser.displayAvatarURL(),
        })
        .setDescription(`> 🔍  **${query}**`)
        .setFooter({ text: 'This may take a moment for playlists…' })
        .setTimestamp();
}

// ─── Playlist / type info embed ──────────────────────────────────────────────

function buildPlaylistInfoEmbed(platform, type, name, count, url, thumbnail, clientUser) {
    const colors = {
        youtube:    config.bot.colors.youtube,
        spotify:    config.bot.colors.spotify,
        soundcloud: config.bot.colors.soundcloud,
    };
    const typeLabel = {
        playlist: '📋 Playlist',
        album:    '💿 Album',
        artist:   '🎤 Artist Top Tracks',
        track:    '🎵 Track',
    }[type] || '🎵 Music';

    const embed = new EmbedBuilder()
        .setColor(colors[platform] || config.bot.colors.default)
        .setAuthor({
            name: `${typeLabel}  ·  Loaded`,
            iconURL: clientUser.displayAvatarURL(),
        })
        .setTitle(name || 'Unknown')
        .setURL(url || null)
        .setDescription(`**${count}** tracks added to the queue.`)
        .setTimestamp()
        .setFooter({ text: 'Use /nowplaying to see the current track.' });

    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
}

// ─── Command ─────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube, Spotify, SoundCloud or a direct link')
        .addStringOption(opt =>
            opt.setName('query')
               .setDescription('Song name, artist, URL (YouTube / Spotify / SoundCloud) or direct audio link')
               .setRequired(true)
        ),

    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

            const query  = interaction.options.getString('query');
            const member = interaction.member;
            const guild  = interaction.guild;
            const channel = interaction.channel;

            // ── Validation ──
            const val = await this._validate(interaction, member, guild);
            if (!val.ok) return interaction.editReply({ content: val.msg, embeds: [], components: [] });

            // ── Show searching embed immediately ──
            const platform = detectPlatform(query);
            await interaction.editReply({
                embeds: [buildSearchingEmbed(platform, query, client.user)],
                components: [],
            });

            // ── Ensure player exists ──
            let player = client.players.get(guild.id);
            if (!player) {
                player = new MusicPlayer(guild, channel, member.voice.channel);
                client.players.set(guild.id, player);
            }
            player.voiceChannel = member.voice.channel;
            player.textChannel  = channel;

            // ── Fetch track data ──
            const trackData = await this._fetchTracks(query, platform, guild.id);
            if (!trackData.success) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error('Nothing found', trackData.message || 'No results found for that query.')],
                    components: [],
                });
            }

            // ── If playlist/album/etc, show info embed first ──
            if (trackData.isPlaylist && trackData.tracks.length > 0) {
                const meta = trackData.meta || {};
                await interaction.editReply({
                    embeds: [buildPlaylistInfoEmbed(
                        platform,
                        meta.type || 'playlist',
                        meta.name || query,
                        trackData.tracks.length,
                        meta.url  || null,
                        meta.thumbnail || null,
                        client.user,
                    )],
                    components: [],
                });
            }

            // ── Hand off to embed manager ──
            if (!client.musicEmbedManager) {
                client.musicEmbedManager = new MusicEmbedManager(client);
            }

            const result = await client.musicEmbedManager.handleMusicData(guild.id, trackData, member, interaction);
            if (!result?.success) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error('Playback Error', result?.message || 'Could not start playback.')],
                    components: [],
                });
            }

        } catch (err) {
            const msg = await ErrorHandler.handle(err, interaction.guild?.id, 'play.execute');
            try {
                const errEmbed = MusicEmbedManager.error('Unexpected Error', msg);
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({ embeds: [errEmbed], components: [] });
                } else if (!interaction.replied) {
                    await interaction.reply({ embeds: [errEmbed], ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },

    // ── Internal helpers ──────────────────────────────────────────────────────

    async _validate(interaction, member, guild) {
        if (!member.voice.channel) {
            const msg = await LanguageManager.getTranslation(guild.id, 'commands.play.voice_channel_required')
                .catch(() => '❌ You must be in a voice channel!');
            return { ok: false, msg };
        }

        const perms = member.voice.channel.permissionsFor(guild.members.me);
        if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
            const msg = await LanguageManager.getTranslation(guild.id, 'commands.play.no_permissions')
                .catch(() => '❌ I need **Connect** and **Speak** permissions in your voice channel!');
            return { ok: false, msg };
        }

        const botVC = guild.members.me.voice.channel;
        if (botVC && botVC.id !== member.voice.channel.id) {
            const msg = await LanguageManager.getTranslation(guild.id, 'commands.play.same_channel_required')
                .catch(() => `❌ I'm already in <#${botVC.id}>. Join that channel or stop the bot first.`);
            return { ok: false, msg };
        }

        return { ok: true };
    },

    async _fetchTracks(query, platform, guildId) {
        const YouTube   = require('../src/YouTube');
        const Spotify   = require('../src/Spotify');
        const SoundCloud = require('../src/SoundCloud');
        const DirectLink = require('../src/DirectLink');

        try {
            let tracks = [], isPlaylist = false, meta = {};

            switch (platform) {

                // ── YouTube ──────────────────────────────────────────────
                case 'youtube': {
                    const isYTPlaylist = typeof YouTube.isPlaylist === 'function' && YouTube.isPlaylist(query);
                    if (isYTPlaylist) {
                        const data = await YouTube.getPlaylist(query, guildId);
                        if (data?.tracks?.length) {
                            tracks     = data.tracks;
                            isPlaylist = true;
                            meta       = { type: 'playlist', name: data.title || 'YouTube Playlist', url: query, thumbnail: data.thumbnail };
                        } else {
                            tracks = await YouTube.search(query, 1, guildId);
                        }
                    } else {
                        tracks = await YouTube.search(query, 1, guildId);
                    }
                    break;
                }

                // ── Spotify ──────────────────────────────────────────────
                case 'spotify': {
                    if (Spotify.isSpotifyURL(query)) {
                        const { type } = Spotify.parseSpotifyURL(query);
                        const data     = await Spotify.getFromURL(query, guildId);
                        tracks         = Array.isArray(data) ? data : (data ? [data] : []);
                        isPlaylist     = ['playlist', 'album', 'artist'].includes(type);
                        meta           = {
                            type,
                            name:      data?.playlistName || data?.albumName || data?.artistName || query,
                            url:       query,
                            thumbnail: data?.thumbnail || tracks[0]?.thumbnail,
                        };
                    } else {
                        const data = await Spotify.search(query, 1, 'track', guildId);
                        tracks     = Array.isArray(data) ? data : (data ? [data] : []);
                    }
                    break;
                }

                // ── SoundCloud ───────────────────────────────────────────
                case 'soundcloud': {
                    if (query.includes('soundcloud.com')) {
                        // Direct SC URL — could be a set/playlist
                        const data = await SoundCloud.search(query, 1, guildId);
                        tracks     = Array.isArray(data) ? data : (data ? [data] : []);
                        // If multiple tracks returned it's a set
                        if (tracks.length > 1) {
                            isPlaylist = true;
                            meta       = { type: 'playlist', name: 'SoundCloud Set', url: query, thumbnail: tracks[0]?.thumbnail };
                        }
                    } else {
                        const data = await SoundCloud.search(query, 1, guildId);
                        tracks     = Array.isArray(data) ? data : (data ? [data] : []);
                    }
                    break;
                }

                // ── Direct Link ──────────────────────────────────────────
                case 'direct': {
                    const data = await DirectLink.getInfo(query);
                    tracks     = Array.isArray(data) ? data : (data ? [data] : []);
                    break;
                }

                default:
                    tracks = await YouTube.search(query, 1, guildId);
            }

            if (!tracks.length) {
                const noResult = await LanguageManager.getTranslation(guildId, 'musicplayer.no_results_found')
                    .catch(() => 'No results found.');
                return { success: false, message: noResult };
            }

            return { success: true, tracks, isPlaylist, meta };

        } catch (err) {
            const msg = await ErrorHandler.handle(err, guildId, 'play._fetchTracks');
            return { success: false, message: msg };
        }
    },
};
