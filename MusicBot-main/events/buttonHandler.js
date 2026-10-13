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

const config            = require('../config');
const MusicEmbedManager = require('../src/MusicEmbedManager');

const { platformColor, platformBadge, fmtDuration, buildVolumeBar } = MusicEmbedManager;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _isAuthorized(interaction, requesterId) {
    const m = interaction.member;
    if (m.permissions.has('ManageGuild')) return true;
    if (m.roles.cache.some(r => r.name.toLowerCase().includes('dj'))) return true;
    if (m.id === requesterId) return true;
    return false;
}

function _eph(embed) { return { embeds: [embed], flags: [1 << 6] }; }

function _fmtDur(sec) {
    const s = Math.floor(Number(sec) || 0);
    if (!s) return '?:??';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${m}:${String(ss).padStart(2,'0')}`;
}

// ─── Module ───────────────────────────────────────────────────────────────────

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Hem buton hem de select menu buradan geçer
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild  = interaction.guild;
        const member = interaction.member;
        const cid    = interaction.customId;

        // ── Dual search ──────────────────────────────────────────────────────
        if (cid.startsWith('dual_'))       return this._handleDualSelect(interaction, client);

        // ── Normal search ────────────────────────────────────────────────────
        if (cid.startsWith('search_'))     return this._handleSearch(interaction, client);

        // ── Language ─────────────────────────────────────────────────────────
        if (cid.startsWith('language_')) {
            const langCmd = require('../commands/language.js');
            return langCmd.handleLanguageButton(interaction);
        }

        // ── Help refresh ──────────────────────────────────────────────────────
        if (cid === 'help_refresh')        return this._handleHelpRefresh(interaction, client);

        // ── Kontrol Paneli dropdown'ları (cp_volume / cp_speed / cp_eq / cp_bass) ──
        if (cid.startsWith('cp_volume:') || cid.startsWith('cp_speed:') ||
            cid.startsWith('cp_eq:')     || cid.startsWith('cp_bass:'))  {
            return this._handleCPDropdown(interaction, client);
        }

        // ── Kontrol Paneli transport butonları (cp_prev / cp_pause / ...) ────
        if (cid.startsWith('cp_'))         return this._handleCPButton(interaction, client);

        // ── Müzik kontrol butonları — ses kanalı gerekli ─────────────────────
        if (!member.voice.channel) {
            return interaction.reply(_eph(
                MusicEmbedManager.error('Ses Kanalı Gerekli', 'Müzik kontrollerini kullanmak için bir ses kanalında olman gerekiyor.')
            ));
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return interaction.reply(_eph(
                MusicEmbedManager.error('Çalan Müzik Yok', 'Bu sunucuda aktif bir müzik oynatıcısı yok.')
            ));
        }

        if (player.voiceChannel?.id !== member.voice.channel.id) {
            return interaction.reply(_eph(
                MusicEmbedManager.error('Yanlış Kanal', `Bot şu an <#${player.voiceChannel?.id}> kanalında. O kanala katıl.`)
            ));
        }

        // Session doğrulama
        const parts = cid.split(':');
        const [btnType, requesterId, sessionId] = parts;
        if (sessionId && player.sessionId && sessionId !== player.sessionId) {
            return interaction.reply(_eph(
                MusicEmbedManager.error('Süresi Doldu', 'Bu kontroller eski bir oturuma ait. `/nowplaying` ile yeni kontroller aç.')
            ));
        }

        try {
            switch (btnType) {
                case 'music_pause':    return this._handlePause(interaction, player, requesterId);
                case 'music_prev':     return this._handlePrev(interaction, player, requesterId);
                case 'music_skip':     return this._handleSkip(interaction, player, requesterId);
                case 'music_stop':     return this._handleStop(interaction, player, client, requesterId);
                case 'music_queue':    return this._handleQueue(interaction, player);
                case 'music_shuffle':  return this._handleShuffle(interaction, player, requesterId);
                case 'music_loop':     return this._handleLoop(interaction, player, requesterId);
                case 'music_autoplay': return this._handleAutoplay(interaction, player, requesterId);
                case 'music_like':     return this._handleLike(interaction, player);
                case 'music_panel':    return this._handlePanel(interaction, player, client);
                case 'music_lyrics':   return this._handleLyrics(interaction, player);
                default:
                    return interaction.reply(_eph(MusicEmbedManager.error('Bilinmeyen Buton', 'Bu buton tanınmıyor.')));
            }
        } catch (err) {
            console.error('buttonHandler:', err);
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply(_eph(MusicEmbedManager.error('Hata', 'İşlem sırasında bir hata oluştu.'))).catch(() => {});
            }
        }
    },

    // ── Pause / Resume ────────────────────────────────────────────────────────

    async _handlePause(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }
        if (!player.currentTrack) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Duraklatılacak şarkı yok.')));
        }
        const wasPaused = player.paused;
        wasPaused ? player.resume() : player.pause();

        const embed = new EmbedBuilder()
            .setColor(platformColor(player.currentTrack?.platform))
            .setAuthor({ name: wasPaused ? '▶️  Devam Ettiriliyor' : '⏸️  Duraklatıldı', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**[${player.currentTrack.title}](${player.currentTrack.url})**`)
            .addFields({ name: 'İşlemi yapan', value: `<@${interaction.member.id}>`, inline: true })
            .setTimestamp();
        if (player.currentTrack.thumbnail) embed.setThumbnail(player.currentTrack.thumbnail);

        await interaction.reply(_eph(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Previous ──────────────────────────────────────────────────────────────

    async _handlePrev(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }
        if (!player.previousTracks?.length) {
            return interaction.reply(_eph(MusicEmbedManager.error('Önceki Şarkı Yok', 'Geçmişte çalınan şarkı bulunamadı.')));
        }
        player.previous?.();
        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.info)
            .setAuthor({ name: '⏮️  Önceki Şarkıya Geçildi', iconURL: interaction.client.user.displayAvatarURL() })
            .addFields({ name: 'İşlemi yapan', value: `<@${interaction.member.id}>`, inline: true })
            .setTimestamp();
        await interaction.reply(_eph(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Skip ──────────────────────────────────────────────────────────────────

    async _handleSkip(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }
        if (!player.currentTrack) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Atlanacak şarkı yok.')));
        }
        if (!player.queue?.length) {
            return interaction.reply(_eph(MusicEmbedManager.error('Kuyruk Boş', 'Sırada başka şarkı yok.')));
        }
        const skipped = player.currentTrack;
        player.skip();

        const embed = new EmbedBuilder()
            .setColor(platformColor(skipped.platform))
            .setAuthor({ name: '⏭️  Şarkı Atlandı', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`~~${skipped.title}~~`)
            .addFields({ name: 'Atlayan', value: `<@${interaction.member.id}>`, inline: true })
            .setTimestamp();

        if (player.queue?.length) {
            const next = player.queue[0];
            embed.addFields({ name: '🎵 Sıradaki', value: `**[${next.title}](${next.url})**  ·  \`${_fmtDur(next.duration)}\``, inline: false });
        }
        if (skipped.thumbnail) embed.setThumbnail(skipped.thumbnail);

        await interaction.reply(_eph(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Stop ──────────────────────────────────────────────────────────────────

    async _handleStop(interaction, player, client, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }
        const track    = player.currentTrack;
        const queueLen = player.queue?.length ?? 0;
        player.stop();
        client.players.delete(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.error)
            .setAuthor({ name: '⏹️  Durduruldu', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(track ? `**[${track.title}](${track.url})** durduruldu ve kuyruk temizlendi.` : 'Çalma durduruldu.')
            .addFields(
                { name: 'Durduran', value: `<@${interaction.member.id}>`, inline: true },
                { name: '🗑 Silinen', value: `\`${queueLen + (track ? 1 : 0)} şarkı\``, inline: true },
            ).setTimestamp();
        if (track?.thumbnail) embed.setThumbnail(track.thumbnail);

        await interaction.reply(_eph(embed));
        await client.musicEmbedManager?.handlePlaybackEnd(player);
    },

    // ── Queue ─────────────────────────────────────────────────────────────────

    async _handleQueue(interaction, player) {
        const current = player.currentTrack;
        const queue   = player.queue ?? [];

        if (!current && !queue.length) {
            return interaction.reply(_eph(MusicEmbedManager.error('Kuyruk Boş', 'Çalınan şarkı yok ve kuyruk boş.')));
        }

        const embed = new EmbedBuilder()
            .setColor(platformColor(current?.platform))
            .setAuthor({ name: '📋  Kuyruk', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        if (current) {
            const ms  = player.currentTime ?? 0;
            const bar = MusicEmbedManager.buildProgressBar(ms, current.duration ?? 0, 16);
            embed.addFields({ name: `${player.paused ? '⏸️' : '▶️'}  Şu An Çalıyor`, value: `**[${current.title}](${current.url})**\n${bar}`, inline: false });
        }

        if (queue.length) {
            const lines = queue.slice(0, 10)
                .map((t, i) => `\`${String(i+1).padStart(2,' ')}.\` **[${t.title}](${t.url})**  ·  \`${_fmtDur(t.duration)}\``)
                .join('\n');
            embed.addFields({
                name: `📋  Sıradakiler  (${queue.length} şarkı)`,
                value: lines + (queue.length > 10 ? `\n*…ve ${queue.length-10} şarkı daha*` : ''),
                inline: false,
            });
        }

        embed.setFooter({ text: `Toplam: ${queue.length + (current ? 1 : 0)} şarkı` });
        await interaction.reply(_eph(embed));
    },

    // ── Shuffle ───────────────────────────────────────────────────────────────

    async _handleShuffle(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }
        if ((player.queue?.length ?? 0) < 2) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetersiz Şarkı', 'Karıştırmak için en az 2 şarkı gerekli.')));
        }
        player.shuffleQueue?.();

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setAuthor({ name: '🔀  Kuyruk Karıştırıldı', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**${player.queue.length}** şarkı karıştırıldı.`)
            .addFields({ name: 'Karıştıran', value: `<@${interaction.member.id}>`, inline: true })
            .setTimestamp();

        if (player.queue.length > 0) {
            embed.addFields({
                name: '🎵 Yeni Sıralama (ilk 3)',
                value: player.queue.slice(0,3).map((t,i) => `\`${i+1}.\` **${t.title}**`).join('\n'),
                inline: false,
            });
        }

        await interaction.reply(_eph(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Loop ──────────────────────────────────────────────────────────────────

    async _handleLoop(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }

        let newMode, icon, label;
        if (!player.loop || player.loop === false || player.loop === 'off') {
            newMode = 'track'; icon = '🔂'; label = 'Şarkı Döngüsü';
        } else if (player.loop === 'track') {
            newMode = 'queue'; icon = '🔁'; label = 'Kuyruk Döngüsü';
        } else {
            newMode = false;   icon = '➡️'; label = 'Döngü Kapalı';
        }
        player.loop = newMode;

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.info)
            .setAuthor({ name: `${icon}  Döngü Modu Değiştirildi`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Döngü modu: **${label}**`)
            .addFields({ name: 'Değiştiren', value: `<@${interaction.member.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply(_eph(embed));
        await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
    },

    // ── Autoplay ──────────────────────────────────────────────────────────────

    async _handleAutoplay(interaction, player, requesterId) {
        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }

        if (player.autoplay) {
            player.autoplay = false;
            const embed = new EmbedBuilder()
                .setColor(config.bot.colors.warning)
                .setAuthor({ name: '🎲  Autoplay Kapatıldı', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription('Kuyruk bittiğinde bot duracak.')
                .setTimestamp();
            await interaction.reply(_eph(embed));
            await interaction.client.musicEmbedManager?.updateNowPlayingEmbed(player);
            return;
        }

        const genres = [
            { label: 'Pop',        value: 'pop',        emoji: '🎤' },
            { label: 'Rock',       value: 'rock',       emoji: '🎸' },
            { label: 'Hip-Hop',    value: 'hiphop',     emoji: '🎧' },
            { label: 'Elektronik', value: 'electronic', emoji: '🎛️' },
            { label: 'Caz',        value: 'jazz',       emoji: '🎷' },
            { label: 'Klasik',     value: 'classical',  emoji: '🎻' },
            { label: 'Metal',      value: 'metal',      emoji: '🤘' },
            { label: 'Country',    value: 'country',    emoji: '🤠' },
            { label: 'R&B',        value: 'rnb',        emoji: '💃' },
            { label: 'K-Pop',      value: 'kpop',       emoji: '🇰🇷' },
            { label: 'Anime',      value: 'anime',      emoji: '🎌' },
            { label: 'Lo-Fi',      value: 'lofi',       emoji: '🌙' },
            { label: 'Rastgele',   value: 'random',     emoji: '🎲' },
        ];

        const select = new StringSelectMenuBuilder()
            .setCustomId(`autoplay_genre:${requesterId}:${player.sessionId}`)
            .setPlaceholder('Bir tür seç…')
            .addOptions(genres.map(g =>
                new StringSelectMenuOptionBuilder().setLabel(g.label).setValue(g.value).setEmoji(g.emoji)
            ));

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.default)
            .setAuthor({ name: '🎲  Autoplay — Tür Seç', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Bir tür seç. Kuyruk bitince bot o türden şarkılar koyacak.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)], flags: [1 << 6] });
    },

    // ── Like / Beğen ──────────────────────────────────────────────────────────

    async _handleLike(interaction, player) {
        if (!player.currentTrack) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Beğenilecek şarkı yok.')));
        }
        const t = player.currentTrack;
        const embed = new EmbedBuilder()
            .setColor('#FF6B9D')
            .setAuthor({ name: '❤️  Şarkı Beğenildi', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`**[${t.title}](${t.url})** beğenildi!`)
            .addFields({ name: 'Sanatçı', value: `\`${t.artist || t.author || '?'}\``, inline: true })
            .setTimestamp();
        if (t.thumbnail) embed.setThumbnail(t.thumbnail);
        await interaction.reply(_eph(embed));
    },

    // ── Kontrol Paneli ────────────────────────────────────────────────────────

    async _handlePanel(interaction, player, client) {
        if (!player.currentTrack) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Kontrol paneli için şarkı çalıyor olmalı.')));
        }

        const embed = client.musicEmbedManager.buildControlPanelEmbed(player, player.currentTrack);
        const rows  = client.musicEmbedManager.buildControlPanelRows(player);

        const msg = await interaction.reply({ embeds: [embed], components: rows, flags: [1 << 6] });

        // 5 dakika sonra paneli kapat
        setTimeout(async () => {
            try {
                await interaction.editReply({ components: [] });
            } catch { /* süresi doldu */ }
        }, 5 * 60_000);
    },

    // ── Kontrol Paneli Transport Butonları (cp_) ──────────────────────────────

    async _handleCPButton(interaction, client) {
        const parts      = interaction.customId.split(':');
        const btnType    = parts[0]; // cp_pause, cp_skip vb.
        const requesterId = parts[1];
        const sessionId  = parts[2];

        const player = client.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Aktif oynatıcı yok.')));
        }

        if (sessionId && player.sessionId && sessionId !== player.sessionId) {
            return interaction.reply(_eph(MusicEmbedManager.error('Süresi Doldu', 'Bu panel eski bir oturuma ait.')));
        }

        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }

        switch (btnType) {
            case 'cp_prev':  player.previous?.(); break;
            case 'cp_pause': player.paused ? player.resume() : player.pause(); break;
            case 'cp_skip':  player.skip?.(); break;
            case 'cp_loop': {
                if (!player.loop || player.loop === false) player.loop = 'track';
                else if (player.loop === 'track') player.loop = 'queue';
                else player.loop = false;
                break;
            }
            case 'cp_stop': {
                player.stop();
                client.players.delete(interaction.guild.id);
                await client.musicEmbedManager?.handlePlaybackEnd(player);
                break;
            }
        }

        // Paneli güncelle
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);

        const embed = client.musicEmbedManager.buildControlPanelEmbed(player, player.currentTrack);
        const rows  = client.musicEmbedManager.buildControlPanelRows(player);
        await interaction.update({ embeds: [embed], components: rows });
    },

    // ── Kontrol Paneli Dropdown Handler ───────────────────────────────────────

    async _handleCPDropdown(interaction, client) {
        const parts      = interaction.customId.split(':');
        const menuType   = parts[0]; // cp_volume, cp_speed, cp_eq, cp_bass
        const requesterId = parts[1];
        const sessionId  = parts[2];

        const player = client.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Aktif oynatıcı yok.')));
        }

        if (sessionId && player.sessionId && sessionId !== player.sessionId) {
            return interaction.reply(_eph(MusicEmbedManager.error('Süresi Doldu', 'Bu panel eski bir oturuma ait.')));
        }

        if (!_isAuthorized(interaction, requesterId)) {
            return interaction.reply(_eph(MusicEmbedManager.error('Yetkisiz', 'Bu işlemi yapmaya yetkin yok.')));
        }

        const value = interaction.values[0];
        await interaction.deferUpdate();

        switch (menuType) {
            case 'cp_volume': {
                const vol = parseInt(value, 10);
                player.setVolume(vol);
                break;
            }
            case 'cp_speed': {
                await player.setSpeed(value);
                break;
            }
            case 'cp_eq': {
                await player.setEQ(value);
                break;
            }
            case 'cp_bass': {
                await player.setBass(value);
                break;
            }
        }

        // Paneli ve now-playing'i güncelle
        await client.musicEmbedManager?.updateNowPlayingEmbed(player);

        const embed = client.musicEmbedManager.buildControlPanelEmbed(player, player.currentTrack);
        const rows  = client.musicEmbedManager.buildControlPanelRows(player);
        await interaction.editReply({ embeds: [embed], components: rows });
    },

    // ── Lyrics ────────────────────────────────────────────────────────────────

    async _handleLyrics(interaction, player) {
        if (!player.currentTrack) {
            return interaction.reply(_eph(MusicEmbedManager.error('Şarkı Yok', 'Şarkı sözleri için şarkı çalıyor olmalı.')));
        }
        await interaction.deferReply({ flags: [1 << 6] });

        const lyrics = player.currentLyrics;
        if (!lyrics?.pages?.length) {
            return interaction.editReply({ embeds: [MusicEmbedManager.error('Sözler Bulunamadı', `**${player.currentTrack.title}** için söz bulunamadı.`)] });
        }

        const buildPage = (i) => new EmbedBuilder()
            .setColor(platformColor(player.currentTrack?.platform))
            .setAuthor({ name: '🎤  Şarkı Sözleri', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(player.currentTrack.title)
            .setURL(player.currentTrack.url || null)
            .setDescription(lyrics.pages[i])
            .setFooter({ text: `Sayfa ${i+1} / ${lyrics.pages.length}  ·  Kaynak: ${lyrics.source || '?'}` })
            .setTimestamp();

        let page = 0;
        const msg = await interaction.editReply({
            embeds: [buildPage(page)],
            components: lyrics.pages.length > 1 ? [_lyricsRow(page, lyrics.pages.length)] : [],
        });

        if (lyrics.pages.length <= 1) return;

        const col = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 5*60_000 });
        col.on('collect', async i => {
            if (i.customId === 'lyrics_prev') page = Math.max(0, page - 1);
            if (i.customId === 'lyrics_next') page = Math.min(lyrics.pages.length - 1, page + 1);
            await i.update({ embeds: [buildPage(page)], components: [_lyricsRow(page, lyrics.pages.length)] });
        });
        col.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    },

    // ── Dual arama seçimi ─────────────────────────────────────────────────────

    async _handleDualSelect(interaction, client) {
        const parts    = interaction.customId.split('_');
        if (parts[1] === 'cancel') {
            const userId = parts.slice(2).join('_');
            global.dualResults?.delete(userId);
            return interaction.update({
                embeds: [MusicEmbedManager.info('✖️  İptal', 'Arama iptal edildi.', config.bot.colors.warning)],
                components: [],
            });
        }

        const platform = parts[1];
        const idx      = parseInt(parts[2], 10);
        const userId   = parts.slice(3).join('_');
        const stored   = global.dualResults?.get(userId);

        if (!stored) {
            return interaction.update({
                embeds: [MusicEmbedManager.error('Süresi Doldu', 'Sonuçlar süresi doldu. `/play` ile tekrar ara.')],
                components: [],
            });
        }

        const track = platform === 'sc' ? stored.scResults[idx] : stored.spResults[idx];
        if (!track) {
            return interaction.update({ embeds: [MusicEmbedManager.error('Hata', 'Şarkı bulunamadı.')], components: [] });
        }
        global.dualResults.delete(userId);

        const member = interaction.member;
        const guild  = interaction.guild;

        if (!member.voice.channel) {
            return interaction.update({ embeds: [MusicEmbedManager.error('Ses Kanalı Gerekli', 'Önce bir ses kanalına gir!')], components: [] });
        }

        const pLabel = platform === 'sc' ? '🟠 SoundCloud' : '🟢 Spotify';
        const pColor = platform === 'sc' ? config.bot.colors.soundcloud : config.bot.colors.spotify;

        const selEmbed = new EmbedBuilder()
            .setColor(pColor)
            .setAuthor({ name: `${pLabel}  ·  Seçildi`, iconURL: client.user.displayAvatarURL() })
            .setTitle(track.title || 'Bilinmeyen')
            .setURL(track.url || null)
            .setDescription(`**👤 Sanatçı:** \`${track.artist || track.author || '?'}\`\n**⏱ Süre:** \`${_fmtDur(track.duration)}\``)
            .setFooter({ text: 'Sıraya ekleniyor…' })
            .setTimestamp();
        if (track.thumbnail) selEmbed.setThumbnail(track.thumbnail);

        await interaction.update({ embeds: [selEmbed], components: [] });

        let player = client.players.get(guild.id);
        if (!player) {
            const MP = require('../src/MusicPlayer');
            player = new MP(guild, interaction.channel, member.voice.channel);
            client.players.set(guild.id, player);
        }
        player.voiceChannel = member.voice.channel;
        player.textChannel  = interaction.channel;

        if (!client.musicEmbedManager) {
            client.musicEmbedManager = new MusicEmbedManager(client);
        }

        await client.musicEmbedManager.handleMusicData(guild.id, { tracks: [track], isPlaylist: false }, member, null);
    },

    // ── Search seçimi ─────────────────────────────────────────────────────────

    async _handleSearch(interaction, client) {
        if (interaction.customId === 'search_cancel') {
            global.searchResults?.delete(interaction.user.id);
            return interaction.update({
                embeds: [MusicEmbedManager.info('✖️  İptal', 'Arama iptal edildi.', config.bot.colors.warning)],
                components: [],
            });
        }

        const idx    = parseInt(interaction.customId.replace('search_select_', ''), 10);
        const stored = global.searchResults?.get(interaction.user.id);

        if (!stored?.results?.length) {
            return interaction.update({ embeds: [MusicEmbedManager.error('Süresi Doldu', 'Sonuçlar süresi doldu.')], components: [] });
        }

        const track = stored.results[idx];
        if (!track) {
            return interaction.update({ embeds: [MusicEmbedManager.error('Hata', 'Şarkı bulunamadı.')], components: [] });
        }
        global.searchResults.delete(interaction.user.id);

        const member = interaction.member;
        const guild  = interaction.guild;

        if (!member.voice.channel) {
            return interaction.update({ embeds: [MusicEmbedManager.error('Ses Kanalı Gerekli', 'Önce bir ses kanalına gir!')], components: [] });
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.bot.colors.soundcloud)
                    .setAuthor({ name: '🟠 SoundCloud  ·  Seçildi', iconURL: client.user.displayAvatarURL() })
                    .setTitle(track.title || 'Bilinmeyen')
                    .setURL(track.url || null)
                    .setDescription(`**👤** \`${track.artist || track.author || '?'}\`  ·  **⏱** \`${_fmtDur(track.duration)}\``)
                    .setFooter({ text: 'Sıraya ekleniyor…' })
                    .setTimestamp(),
            ],
            components: [],
        });

        let player = client.players.get(guild.id);
        if (!player) {
            const MP = require('../src/MusicPlayer');
            player = new MP(guild, interaction.channel, member.voice.channel);
            client.players.set(guild.id, player);
        }
        player.voiceChannel = member.voice.channel;
        player.textChannel  = interaction.channel;

        if (!client.musicEmbedManager) client.musicEmbedManager = new MusicEmbedManager(client);
        await client.musicEmbedManager.handleMusicData(guild.id, { tracks: [track], isPlaylist: false }, member, null);
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

function _lyricsRow(page, total) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lyrics_prev').setLabel('Önceki').setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('lyrics_next').setLabel('Sonraki').setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary).setDisabled(page === total - 1),
    );
}
