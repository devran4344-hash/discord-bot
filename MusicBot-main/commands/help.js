'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all commands, features and bot statistics'),

    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            const embed = await this._buildEmbed(client, interaction.guild.id);
            const row   = this._buildButtons();
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('help.execute:', err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ Could not load help page.' });
                } else {
                    await interaction.reply({ content: '❌ Could not load help page.', ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },

    async _buildEmbed(client, guildId) {
        // ── Live stats ──
        let guilds, users, activePlayers;
        try {
            if (client.shard) {
                const gc = await client.shard.fetchClientValues('guilds.cache.size');
                guilds   = gc.reduce((a, b) => a + b, 0);
                const mc = await client.shard.broadcastEval(c =>
                    c.guilds.cache.reduce((a, g) => a + g.memberCount, 0)
                );
                users    = mc.reduce((a, b) => a + b, 0);
                const ap = await client.shard.broadcastEval(c => c.players.size);
                activePlayers = ap.reduce((a, b) => a + b, 0);
            } else {
                guilds        = client.guilds.cache.size;
                users         = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
                activePlayers = client.players.size;
            }
        } catch {
            guilds        = client.guilds.cache.size;
            users         = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
            activePlayers = client.players.size;
        }

        return new EmbedBuilder()
            .setColor(config.bot.colors.default)
            .setAuthor({
                name: `${client.user.username}  ·  Music Bot`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('🎵  Command Reference & Features')
            .setDescription(
                '> A powerful music bot supporting **YouTube**, **Spotify** and **SoundCloud**.\n' +
                '> Playlists, albums, artist top tracks, autoplay and more — all in one bot.'
            )
            .addFields(
                {
                    name: '📖  Commands',
                    value: [
                        '`/play <query>`   — Play from YouTube, Spotify, SoundCloud or a direct link',
                        '`/search <query>` — Search YouTube and pick from 9 results',
                        '`/nowplaying`     — Detailed info about the current track',
                        '`/language`       — Change the bot language for this server',
                        '`/help`           — You\'re reading it right now!',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🎮  Player Controls',
                    value: [
                        '`⏸ Pause / ▶️ Resume`   — Toggle playback',
                        '`⏭ Skip`                — Skip to next track',
                        '`⏹ Stop`                — Stop and clear queue',
                        '`📋 Queue`              — View the queue',
                        '`🔀 Shuffle`            — Shuffle the queue',
                        '`🔊 Volume`             — Set volume (0–100%)',
                        '`➡️ / 🔂 / 🔁 Loop`    — Off / Track / Queue',
                        '`🎲 Autoplay`           — Genre-based infinite radio',
                        '`🎤 Lyrics`             — Fetch song lyrics',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🌐  Supported Platforms',
                    value: [
                        '🔴 **YouTube** — Videos, playlists, text search',
                        '🟢 **Spotify** — Tracks, albums, playlists, artist top tracks',
                        '🟠 **SoundCloud** — Tracks, sets, user profiles, text search',
                        '🔗 **Direct Link** — mp3, wav, ogg, flac, opus, m4a and more',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '✨  Highlights',
                    value: [
                        '⚡ Audio cache — instant replay, no re-download',
                        '🔄 Session restore — resumes after bot restart',
                        '👤 Pause reasons — pauses when alone or server-muted',
                        '🌍 23 languages supported',
                        '🏗 Sharding-ready for large servers',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📊  Live Statistics',
                    value: [
                        `🏠 Servers:       **${guilds.toLocaleString()}**`,
                        `👥 Users:         **${users.toLocaleString()}**`,
                        `🎵 Active players: **${activePlayers}**`,
                        `⏱ Uptime:        **${_uptime(process.uptime())}**`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🔗  Links',
                    value: [
                        `[🌐 Website](${config.bot.website})`,
                        `[💬 Support Server](${config.bot.supportServer})`,
                        `[📄 Invite Bot](${config.bot.invite})`,
                    ].join('\n'),
                    inline: true,
                },
            )
            .setFooter({
                text: `${client.user.username}  ·  Use /language to change bot language`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();
    },

    _buildButtons() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Website')
                .setEmoji('🌐')
                .setURL(config.bot.website)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Support')
                .setEmoji('💬')
                .setURL(config.bot.supportServer)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Invite')
                .setEmoji('📄')
                .setURL(config.bot.invite)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setCustomId('help_refresh')
                .setLabel('Refresh Stats')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
        );
    },
};

function _uptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
