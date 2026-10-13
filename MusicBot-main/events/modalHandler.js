'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const config            = require('../config');
const MusicEmbedManager = require('../src/MusicEmbedManager');

const { platformColor, buildVolumeBar } = MusicEmbedManager;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Modal submit + String select menu ikisi de buradan geçer
        if (!interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild  = interaction.guild;
        const member = interaction.member;

        try {
            // ── Select menu'lar ──────────────────────────────────────────────
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('autoplay_genre:')) {
                    return this._handleAutoplayGenre(interaction, client);
                }
                return;
            }

            // ── Modal submit'ler ─────────────────────────────────────────────
            switch (interaction.customId) {
                case 'volume_modal':
                    return this._handleVolume(interaction, client);
                default:
                    return interaction.reply({ content: '❓ Bilinmeyen form.', ephemeral: true });
            }
        } catch (err) {
            console.error('modalHandler:', err);
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply({
                    embeds: [MusicEmbedManager.error('Hata', 'İşlem sırasında bir şeyler ters gitti.')],
                    ephemeral: true,
                }).catch(() => {});
            }
        }
    },

    // ── Volume modal ─────────────────────────────────────────────────────────

    async _handleVolume(interaction, client) {
        const guild  = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Ses Kanalı Gerekli', 'Ses değiştirmek için ses kanalında olman gerekiyor.')],
                ephemeral: true,
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Şarkı Yok', 'Aktif oynatıcı yok.')],
                ephemeral: true,
            });
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Yanlış Kanal', `Bot <#${player.voiceChannel?.id}> kanalında. O kanala katıl.`)],
                ephemeral: true,
            });
        }

        const raw    = interaction.fields.getTextInputValue('volume_input');
        const volume = parseInt(raw, 10);

        if (isNaN(volume) || volume < 0 || volume > 200) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Geçersiz Değer', '**0** ile **200** arasında bir sayı gir.')],
                ephemeral: true,
            });
        }

        player.setVolume(volume);

        const color   = platformColor(player.currentTrack?.platform);
        const volIcon = volume >= 150 ? '📣' : volume >= 70 ? '🔊' : volume >= 30 ? '🔉' : volume > 0 ? '🔈' : '🔇';
        const bar     = buildVolumeBar(Math.min(volume, 100)); // bar 0-100 gösterir

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `${volIcon}  Ses Değiştirildi`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Ses seviyesi **${volume}%** olarak ayarlandı.`)
            .addFields(
                { name: `${volIcon} Seviye`, value: bar,                         inline: false },
                { name: '🙋 Değiştiren',     value: `<@${member.id}>`,           inline: true  },
            )
            .setTimestamp();

        if (player.currentTrack?.thumbnail) embed.setThumbnail(player.currentTrack.thumbnail);

        await interaction.reply({ embeds: [embed], ephemeral: true });
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Autoplay genre ────────────────────────────────────────────────────────

    async _handleAutoplayGenre(interaction, client) {
        const guild  = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Ses Kanalı Gerekli', 'Ses kanalında olman gerekiyor.')],
                flags: [1 << 6],
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Şarkı Yok', 'Aktif oynatıcı yok.')],
                flags: [1 << 6],
            });
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply({
                embeds: [MusicEmbedManager.error('Yanlış Kanal', `Bot <#${player.voiceChannel?.id}> kanalında.`)],
                flags: [1 << 6],
            });
        }

        const genre = interaction.values[0];
        player.autoplay = genre;

        const genreLabels = {
            pop: 'Pop', rock: 'Rock', hiphop: 'Hip-Hop',
            electronic: 'Elektronik', jazz: 'Caz', classical: 'Klasik',
            metal: 'Metal', country: 'Country', rnb: 'R&B',
            indie: 'Indie', latin: 'Latin', kpop: 'K-Pop',
            anime: 'Anime', lofi: 'Lo-Fi', random: 'Rastgele',
        };
        const genreName = genreLabels[genre] || genre;

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setAuthor({ name: '🎲  Autoplay Açıldı', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Autoplay **${genreName}** türü ile açıldı.\nKuyruk bitince bu türden şarkılar otomatik kuyruğa eklenecek.`)
            .addFields({ name: '🎲 Açan', value: `<@${member.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },
};
