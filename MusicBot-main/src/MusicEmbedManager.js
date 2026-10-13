'use strict';

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');
const config = require('../config');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function platformColor(platform) {
    const map = {
        youtube:    config.bot.colors.youtube,
        spotify:    config.bot.colors.spotify,
        soundcloud: config.bot.colors.soundcloud,
        direct:     config.bot.colors.direct,
    };
    return map[(platform || '').toLowerCase()] || config.bot.colors.default;
}

function platformBadge(platform) {
    const map = {
        youtube:    '🔴 YouTube',
        spotify:    '🟢 Spotify',
        soundcloud: '🟠 SoundCloud',
        direct:     '🔗 Direct',
    };
    return map[(platform || '').toLowerCase()] || '🎵 Music';
}

function fmtDuration(sec) {
    const s = Math.floor(Number(sec) || 0);
    if (s <= 0) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${m}:${String(ss).padStart(2,'0')}`;
}

function fmtMs(ms) { return fmtDuration(Math.floor((ms || 0) / 1000)); }

function buildProgressBar(currentMs, totalSec, barLen = 20) {
    const totalMs = (totalSec || 0) * 1000;
    const pct     = totalMs > 0 ? Math.min(currentMs / totalMs, 1) : 0;
    const filled  = Math.round(pct * barLen);
    const empty   = barLen - filled;
    const bar     = '▬'.repeat(filled) + '🔘' + '▬'.repeat(empty);
    return `${bar}\n\`${fmtMs(currentMs)}\` **/** \`${fmtDuration(totalSec)}\``;
}

function buildVolumeBar(vol, len = 10) {
    const pct    = Math.min(Math.max(vol, 0), 200) / 200;
    const filled = Math.min(Math.round(pct * len), len);
    const empty  = Math.max(len - filled, 0);
    return `${'▰'.repeat(filled)}${'▱'.repeat(empty)}  **${vol}%**`;
}

// ─── MusicEmbedManager ───────────────────────────────────────────────────────

class MusicEmbedManager {
    constructor(client) {
        this.client = client;
        this.processingQueue = new Map();
    }

    // ── Public entry ──────────────────────────────────────────────────────────

    async handleMusicData(guildId, trackData, member, interaction = null) {
        if (this.processingQueue.has(guildId)) {
            await this.processingQueue.get(guildId);
        }
        const p = this._processMusic(guildId, trackData, member, interaction);
        this.processingQueue.set(guildId, p);
        try   { return await p; }
        finally { this.processingQueue.delete(guildId); }
    }

    // ── Orchestration ─────────────────────────────────────────────────────────

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

            this._sequentialPreload(player, player.queue.slice()).catch(() => {});

            if (firstResult && tracks.length > 1) {
                await this._sendQueueAddedMsg(player, tracks.slice(1), member, isPlaylist);
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
            } catch { /* devam */ }
        }
    }

    // ── Now Playing Embed ─────────────────────────────────────────────────────

    async createNowPlayingEmbed(player, track, guildId) {
        const color     = platformColor(track.platform);
        const badge     = platformBadge(track.platform);
        const currentMs = player.currentTime ?? player.position ?? 0;
        const progress  = buildProgressBar(currentMs, track.duration);

        // Status ikonları
        const loopLabel  = player.loop === 'track' ? '🔂 Şarkı' : player.loop === 'queue' ? '🔁 Kuyruk' : '➡️ Kapalı';
        const shuffleLabel = player.shuffle ? '🔀 Açık' : '🔀 Kapalı';
        const volIcon    = (player.volume ?? 80) >= 70 ? '🔊' : (player.volume ?? 80) >= 30 ? '🔉' : '🔈';
        const statusIcon = player.paused ? '⏸️' : '▶️';
        const speedLabel = player.speed ? `${player.speed}x` : '1x';
        const eqLabel    = player.eq || 'Normal';
        const bassLabel  = player.bass || 'Kapalı';
        const queueLen   = player.queue?.length ?? 0;

        const requester = track.requestedBy
            ? `<@${track.requestedBy.id}>`
            : '`Bilinmiyor`';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `${statusIcon}  Şu An Çalıyor  •  ${badge}`,
                iconURL: this.client.user.displayAvatarURL(),
            })
            .setTitle(track.title || 'Bilinmeyen Şarkı')
            .setURL(track.url || null)
            .setDescription(
                `> 👤  **${track.artist || track.author || 'Bilinmiyor'}**\n\n` +
                progress
            )
            .addFields(
                { name: '🙋 Ekleyen',      value: requester,                   inline: true },
                { name: `${volIcon} Ses`,  value: `\`${player.volume ?? 80}%\``, inline: true },
                { name: '🔄 Döngü',        value: `\`${loopLabel}\``,           inline: true },
                { name: '🔀 Karıştır',     value: `\`${shuffleLabel}\``,        inline: true },
                { name: '⚡ Hız',          value: `\`${speedLabel}\``,          inline: true },
                { name: '🎛️ EQ',          value: `\`${eqLabel}\``,             inline: true },
                { name: '🎸 Bas',          value: `\`${bassLabel}\``,           inline: true },
                { name: '📋 Kuyruk',
                  value: queueLen > 0 ? `\`${queueLen} şarkı\`` : '`Boş`',
                  inline: true },
                { name: '🎲 Autoplay',
                  value: player.autoplay ? `\`${typeof player.autoplay === 'string' ? player.autoplay : 'Açık'}\`` : '`Kapalı`',
                  inline: true },
            )
            .setTimestamp();

        if (track.thumbnail) embed.setImage(track.thumbnail);

        if (queueLen > 0) {
            const next = player.queue[0];
            embed.setFooter({
                text: `Sıradaki: ${next.title}  •  ${queueLen} şarkı bekliyor`,
                iconURL: next.thumbnail || undefined,
            });
        } else {
            embed.setFooter({
                text: 'Kuyruk boş — /play ile şarkı ekle',
                iconURL: this.client.user.displayAvatarURL(),
            });
        }

        return embed;
    }

    async _sendNowPlayingEmbed(player, track, member, interaction) {
        const embed    = await this.createNowPlayingEmbed(player, track, member.guild.id);
        const rows     = this._buildMainButtons(player);
        let msg;

        if (interaction) {
            if (interaction.deferred || interaction.replied) {
                msg = await interaction.editReply({ content: null, embeds: [embed], components: rows });
            } else {
                msg = await interaction.reply({ embeds: [embed], components: rows });
            }
        } else {
            msg = await player.textChannel.send({ embeds: [embed], components: rows });
        }

        player.nowPlayingMessage = msg;
        player.requesterId       = member.id;
        return { success: true, isNewEmbed: true };
    }

    async updateNowPlayingEmbed(player) {
        if (!player.nowPlayingMessage || !player.currentTrack) return;
        try {
            const embed = await this.createNowPlayingEmbed(player, player.currentTrack, player.guild.id);
            const rows  = this._buildMainButtons(player);
            await player.nowPlayingMessage.edit({ embeds: [embed], components: rows });
        } catch (err) {
            if (err.code !== 10008) console.error('updateNowPlayingEmbed:', err.message);
        }
    }

    // ── Main control buttons (now-playing mesajı altında) ─────────────────────
    // ⏮  ⏸/▶  ⏭  🔁  |  ❤️  ➕  🎛️

    _buildMainButtons(player, disabled = false) {
        const sid   = player.sessionId;
        const rid   = player.requesterId;
        const id    = n => `${n}:${rid}:${sid}`;
        const paused = player.paused;
        const loopEmoji = player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '🔁';
        const loopStyle = (player.loop === 'track' || player.loop === 'queue') ? ButtonStyle.Success : ButtonStyle.Secondary;

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(id('music_prev'))
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_pause'))
                .setEmoji(paused ? '▶️' : '⏸️')
                .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_skip'))
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || !(player.queue?.length)),
            new ButtonBuilder()
                .setCustomId(id('music_loop'))
                .setEmoji(loopEmoji)
                .setStyle(loopStyle)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_stop'))
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(id('music_like'))
                .setEmoji('❤️')
                .setLabel('Beğen')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_queue'))
                .setEmoji('📋')
                .setLabel('Kuyruk')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(false),
            new ButtonBuilder()
                .setCustomId(id('music_panel'))
                .setEmoji('🎛️')
                .setLabel('Kontrol Paneli')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_shuffle'))
                .setEmoji('🔀')
                .setLabel('Karıştır')
                .setStyle(player.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(id('music_autoplay'))
                .setEmoji('🎲')
                .setLabel(player.autoplay ? 'Auto: Açık' : 'Autoplay')
                .setStyle(player.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled),
        );

        return [row1, row2];
    }

    // ── Kontrol Paneli embed + dropdown'lar ───────────────────────────────────

    buildControlPanelEmbed(player, track) {
        const color = platformColor(track?.platform);
        const volBar = buildVolumeBar(player.volume ?? 80);

        return new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: '🎛️  Kontrol Paneli',
                iconURL: this.client.user.displayAvatarURL(),
            })
            .setTitle(track?.title || 'Bilinmeyen Şarkı')
            .setDescription(
                '> Aşağıdaki menülerden ses, hız, EQ ve bas ayarlarını değiştirebilirsin.'
            )
            .addFields(
                { name: '🔊 Ses',   value: volBar,                                        inline: false },
                { name: '⚡ Hız',   value: `\`${player.speed || '1'}x\``,                inline: true  },
                { name: '🎛️ EQ',   value: `\`${player.eq   || 'Normal'}\``,             inline: true  },
                { name: '🎸 Bas',   value: `\`${player.bass || 'Kapalı'}\``,             inline: true  },
            )
            .setTimestamp()
            .setFooter({ text: '5 dakika sonra otomatik kapanır', iconURL: this.client.user.displayAvatarURL() });
    }

    buildControlPanelRows(player) {
        const sid = player.sessionId;
        const rid = player.requesterId;
        const id  = n => `${n}:${rid}:${sid}`;

        // ── Transport row ──
        const transport = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id('cp_prev')).setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id('cp_pause')).setEmoji(player.paused ? '▶️' : '⏸️')
                .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id('cp_skip')).setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id('cp_loop')).setEmoji(
                player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '➡️'
            ).setStyle(
                (player.loop === 'track' || player.loop === 'queue') ? ButtonStyle.Success : ButtonStyle.Secondary
            ),
            new ButtonBuilder().setCustomId(id('cp_stop')).setEmoji('⏹️').setStyle(ButtonStyle.Danger),
        );

        // ── Ses dropdown ──
        const volMenu = new StringSelectMenuBuilder()
            .setCustomId(id('cp_volume'))
            .setPlaceholder(`🔊 Ses — şu an: ${player.volume ?? 80}%`)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('10%').setValue('10').setEmoji('🔇'),
                new StringSelectMenuOptionBuilder().setLabel('25%').setValue('25').setEmoji('🔈'),
                new StringSelectMenuOptionBuilder().setLabel('50%').setValue('50').setEmoji('🔉'),
                new StringSelectMenuOptionBuilder().setLabel('75%').setValue('75').setEmoji('🔉'),
                new StringSelectMenuOptionBuilder().setLabel('80%').setValue('80').setEmoji('🔊').setDefault((player.volume ?? 80) === 80),
                new StringSelectMenuOptionBuilder().setLabel('100%').setValue('100').setEmoji('🔊'),
                new StringSelectMenuOptionBuilder().setLabel('125%').setValue('125').setEmoji('📢'),
                new StringSelectMenuOptionBuilder().setLabel('150%').setValue('150').setEmoji('📢'),
                new StringSelectMenuOptionBuilder().setLabel('175%').setValue('175').setEmoji('📣'),
                new StringSelectMenuOptionBuilder().setLabel('200%').setValue('200').setEmoji('📣'),
            );

        // ── Hız dropdown ──
        const speedMenu = new StringSelectMenuBuilder()
            .setCustomId(id('cp_speed'))
            .setPlaceholder(`⚡ Hız — şu an: ${player.speed || '1'}x`)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('0.5x — Çok Yavaş').setValue('0.5').setEmoji('🐢'),
                new StringSelectMenuOptionBuilder().setLabel('0.75x — Yavaş').setValue('0.75').setEmoji('🚶'),
                new StringSelectMenuOptionBuilder().setLabel('1x — Normal').setValue('1').setEmoji('🚶').setDefault(!player.speed || player.speed === '1'),
                new StringSelectMenuOptionBuilder().setLabel('1.25x — Hızlı').setValue('1.25').setEmoji('🏃'),
                new StringSelectMenuOptionBuilder().setLabel('1.5x — Daha Hızlı').setValue('1.5').setEmoji('🏃'),
                new StringSelectMenuOptionBuilder().setLabel('2x — Çift Hız').setValue('2').setEmoji('🚀'),
                new StringSelectMenuOptionBuilder().setLabel('3x — Süper Hız').setValue('3').setEmoji('⚡'),
            );

        // ── EQ dropdown ──
        const eqMenu = new StringSelectMenuBuilder()
            .setCustomId(id('cp_eq'))
            .setPlaceholder(`🎛️ EQ — şu an: ${player.eq || 'Normal'}`)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Normal').setValue('normal').setEmoji('🎵').setDefault(!player.eq || player.eq === 'normal'),
                new StringSelectMenuOptionBuilder().setLabel('Elektronik').setValue('electronic').setEmoji('🎛️'),
                new StringSelectMenuOptionBuilder().setLabel('Hip-Hop').setValue('hiphop').setEmoji('🎧'),
                new StringSelectMenuOptionBuilder().setLabel('Caz').setValue('jazz').setEmoji('🎷'),
                new StringSelectMenuOptionBuilder().setLabel('Ses Şiddeti').setValue('loudness').setEmoji('📢'),
                new StringSelectMenuOptionBuilder().setLabel('Pop').setValue('pop').setEmoji('🎤'),
                new StringSelectMenuOptionBuilder().setLabel('Rock').setValue('rock').setEmoji('🎸'),
                new StringSelectMenuOptionBuilder().setLabel('Klasik').setValue('classical').setEmoji('🎻'),
                new StringSelectMenuOptionBuilder().setLabel('Nightcore').setValue('nightcore').setEmoji('🌙'),
                new StringSelectMenuOptionBuilder().setLabel('Lo-Fi').setValue('lofi').setEmoji('☕'),
                new StringSelectMenuOptionBuilder().setLabel('8D Ses').setValue('8d').setEmoji('🎧'),
            );

        // ── Bas dropdown ──
        const bassMenu = new StringSelectMenuBuilder()
            .setCustomId(id('cp_bass'))
            .setPlaceholder(`🎸 Bas — şu an: ${player.bass || 'Kapalı'}`)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Kapalı').setValue('off').setEmoji('🔇').setDefault(!player.bass || player.bass === 'off'),
                new StringSelectMenuOptionBuilder().setLabel('Hafif').setValue('light').setEmoji('🔈'),
                new StringSelectMenuOptionBuilder().setLabel('Orta').setValue('medium').setEmoji('🔉'),
                new StringSelectMenuOptionBuilder().setLabel('Güçlü').setValue('strong').setEmoji('🔊'),
                new StringSelectMenuOptionBuilder().setLabel('Aşırı').setValue('extreme').setEmoji('💥'),
            );

        return [
            transport,
            new ActionRowBuilder().addComponents(volMenu),
            new ActionRowBuilder().addComponents(speedMenu),
            new ActionRowBuilder().addComponents(eqMenu),
            new ActionRowBuilder().addComponents(bassMenu),
        ];
    }

    // ── Kuyruk ekleme mesajı ─────────────────────────────────────────────────

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
        if (msg && !interaction?.flags) {
            setTimeout(() => msg.delete().catch(() => {}), 12_000);
        }
        return { success: true, isNewEmbed: false };
    }

    async _sendQueueAddedMsg(player, tracks, member, isPlaylist) {
        const embed = this._buildQueueAddedEmbed(tracks, member, isPlaylist);
        try {
            const msg = await player.textChannel.send({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => {}), 12_000);
        } catch { /* channel gone */ }
    }

    _buildQueueAddedEmbed(tracks, member, isPlaylist) {
        const color  = platformColor(tracks[0]?.platform);
        const isMulti = isPlaylist || tracks.length > 1;
        const embed  = new EmbedBuilder().setColor(color).setTimestamp();

        if (isMulti) {
            embed
                .setAuthor({ name: '📋  Kuyruğa Eklendi' })
                .setTitle(`${tracks.length} şarkı eklendi`)
                .setDescription(
                    tracks.slice(0, 5).map((t, i) => `\`${i + 1}.\` **[${t.title}](${t.url})**`).join('\n') +
                    (tracks.length > 5 ? `\n*…ve ${tracks.length - 5} şarkı daha*` : '')
                )
                .setFooter({ text: `Ekleyen: ${member.displayName || member.user?.username}` });
        } else {
            const t = tracks[0];
            embed
                .setAuthor({ name: `${platformBadge(t?.platform)}  ·  Kuyruğa Eklendi` })
                .setTitle(t?.title || 'Bilinmeyen')
                .setURL(t?.url || null)
                .setDescription(
                    `**Süre:** \`${fmtDuration(t?.duration)}\`\n` +
                    `**Sanatçı:** \`${t?.artist || t?.author || '?'}\``
                )
                .setFooter({ text: `Ekleyen: ${member.displayName || member.user?.username}` });
            if (t?.thumbnail) embed.setThumbnail(t.thumbnail);
        }
        return embed;
    }

    // ── Oynatma bitti ─────────────────────────────────────────────────────────

    async handlePlaybackEnd(player) {
        if (player.nowPlayingMessage) {
            try {
                const rows = this._buildMainButtons(player, true);
                await player.nowPlayingMessage.edit({ components: rows });
            } catch { /* silindi */ }
        }

        const embed = new EmbedBuilder()
            .setColor(config.bot.colors.info)
            .setAuthor({ name: '⏹️  Çalma Bitti', iconURL: this.client.user.displayAvatarURL() })
            .setDescription('> Kuyruk boşaldı.\n> Yeni şarkı eklemek için `/play` kullan! 🎉')
            .setTimestamp()
            .setFooter({ text: this.client.user.username, iconURL: this.client.user.displayAvatarURL() });

        try { await player.textChannel?.send({ embeds: [embed] }); } catch { /* channel gone */ }

        player.currentTrack     = null;
        player.nowPlayingMessage = null;
    }

    // ── Eski uyumluluk — createControlButtons hâlâ çalışsın ─────────────────

    async createControlButtons(player, disabled = false) {
        return this._buildMainButtons(player, disabled);
    }

    // ── Static helpers ────────────────────────────────────────────────────────

    static error(title, description) {
        return new EmbedBuilder()
            .setColor(config.bot.colors.error)
            .setTitle(`❌  ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static success(title, description, thumbnail) {
        const e = new EmbedBuilder()
            .setColor(config.bot.colors.success)
            .setTitle(`✅  ${title}`)
            .setDescription(description)
            .setTimestamp();
        if (thumbnail) e.setThumbnail(thumbnail);
        return e;
    }

    static info(title, description, color) {
        return new EmbedBuilder()
            .setColor(color || config.bot.colors.info)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static fmtDuration     = fmtDuration;
    static fmtMs           = fmtMs;
    static buildProgressBar = buildProgressBar;
    static buildVolumeBar   = buildVolumeBar;
    static platformColor    = platformColor;
    static platformBadge    = platformBadge;
}

module.exports = MusicEmbedManager;
