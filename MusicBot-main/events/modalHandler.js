'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const config          = require('../config');
const LanguageManager = require('../src/LanguageManager');
const MusicEmbedManager = require('../src/MusicEmbedManager');

const { buildVolumeBar, platformColor } = MusicEmbedManager;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild  = interaction.guild;
        const member = interaction.member;

        try {
            // ── Select menus ────────────────────────────────────────────────
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('autoplay_genre:')) {
                    return this._handleAutoplayGenre(interaction, client);
                }
                return;
            }

            // ── Modals ──────────────────────────────────────────────────────
            switch (interaction.customId) {
                case 'volume_modal':
                    return this._handleVolume(interaction, client);

                default:
                    return interaction.reply({
                        content: '❓ Unknown modal.',
                        ephemeral: true,
                    });
            }
        } catch (err) {
            console.error('modalHandler:', err);
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply({
                    embeds: [MusicEmbedManager.error('Error', 'Something went wrong.')],
                    ephemeral: true,
                }).catch(() => {});
            }
        }
    },

    // ── Volume modal submit ───────────────────────────────────────────────────
    async _handleVolume(interaction, client) {
        const guild  = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Voice Channel Required', 'You need to be in a voice channel.')],
                ephemeral: true,
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Nothing Playing', 'There is no active player.')],
                ephemeral: true,
            });
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Wrong Channel', `I'm playing in <#${player.voiceChannel?.id}>. Join that channel first.`)],
                ephemeral: true,
            });
        }

        const raw    = interaction.fields.getTextInputValue('volume_input');
        const volume = parseInt(raw, 10);

        if (isNaN(volume) || volume < 0 || volume > 100) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Invalid Volume', 'Please enter a number between **0** and **100**.')],
                ephemeral: true,
            });
        }

        const ok = player.setVolume(volume);
        if (!ok) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Failed', 'Could not set volume. Is a track playing?')],
                ephemeral: true,
            });
        }

        const color   = platformColor(player.currentTrack?.platform);
        const volIcon = volume >= 70 ? '🔊' : volume >= 30 ? '🔉' : volume > 0 ? '🔈' : '🔇';
        const bar     = buildVolumeBar(volume);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `${volIcon}  Volume Changed`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Volume set to **${volume}%**.`)
            .addFields(
                { name: `${volIcon} Level`,   value: bar,                         inline: false },
                { name: '🙋 Changed by', value: `<@${member.id}>`,            inline: true  },
            )
            .setTimestamp();

        if (player.currentTrack?.thumbnail) embed.setThumbnail(player.currentTrack.thumbnail);

        await interaction.reply({ embeds: [embed], ephemeral: true });
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Autoplay genre select ─────────────────────────────────────────────────
    async _handleAutoplayGenre(interaction, client) {
        const guild  = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Voice Channel Required', 'You need to be in a voice channel.')],
                flags: [1 << 6],
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Nothing Playing', 'There is no active player.')],
                flags: [1 << 6],
            });
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Wrong Channel', `I'm playing in <#${player.voiceChannel?.id}>.`)],
                flags: [1 << 6],
            });
        }

        const genre = interaction.values[0];
        player.autoplay = genre;

        const genreLabels = {
            pop: 'Pop', rock: 'Rock', hiphop: 'Hip-Hop',
            electronic: 'Electronic', jazz: 'Jazz', classical: 'Classical',
            metal: 'Metal', country: 'Country', rnb: 'R&B',
            indie: 'Indie', latin: 'Latin', kpop: 'K-Pop',
            anime: 'Anime', lofi: 'Lo-Fi', random: 'Random',
        };
        const genreName = genreLabels[genre] || genre;

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setAuthor({ name: '🎲  Autoplay Enabled', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Autoplay is now **on** with genre **${genreName}**.\nThe bot will automatically queue matching tracks when the queue is empty.`)
            .addFields({ name: '🎲 Enabled by', value: `<@${member.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },
};
