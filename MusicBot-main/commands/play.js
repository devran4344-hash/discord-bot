'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const config            = require('../config');
const MusicPlayer       = require('../src/MusicPlayer');
const MusicEmbedManager = require('../src/MusicEmbedManager');
const LanguageManager   = require('../src/LanguageManager');
const ErrorHandler      = require('../src/ErrorHandler');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDirectLink(q) {
    return q.startsWith('http') &&
        /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus|webm|mp4)(\?|$)/i.test(q);
}

function isURL(q) {
    return q.startsWith('http') || q.includes('spotify.com') ||
        q.includes('soundcloud.com');
}

function fmtDur(sec) {
    const s = Math.floor(Number(sec) || 0);
    if (!s) return '?:??';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${m}:${String(ss).padStart(2, '0')}`;
}

// ─── Dual-platform search embed ───────────────────────────────────────────────
// Gösterim: SoundCloud 1-5 sol, Spotify 1-5 sağ, butonlar aşağıda

function buildDualEmbed(query, scResults, spResults, clientUser) {
    const embed = new EmbedBuilder()
        .setColor(config.bot.colors.soundcloud)
        .setAuthor({
            name: '🎵  Arama Sonuçları  —  Bir şarkı seç',
            iconURL: clientUser.displayAvatarURL(),
        })
        .setTitle(`🔍  "${query}"`)
        .setFooter({
            text: 'Numara butonuna bas → şarkıyı sıraya ekle',
            iconURL: clientUser.displayAvatarURL(),
        })
        .setTimestamp();

    // SoundCloud bölümü
    if (scResults.length) {
        const lines = scResults.map((t, i) =>
            `\`${i + 1}.\` **${t.title}**\n` +
            `> 👤 ${t.artist || t.author || '?'}  ·  ⏱ \`${fmtDur(t.duration)}\``
        ).join('\n');
        embed.addFields({
            name: '🟠  SoundCloud',
            value: lines,
            inline: true,
        });
    } else {
        embed.addFields({
            name: '🟠  SoundCloud',
            value: '*Sonuç bulunamadı*',
            inline: true,
        });
    }

    // Spotify bölümü
    if (spResults.length) {
        const lines = spResults.map((t, i) =>
            `\`${i + 1}.\` **${t.title}**\n` +
            `> 👤 ${t.artist || '?'}  ·  ⏱ \`${fmtDur(t.duration)}\``
        ).join('\n');
        embed.addFields({
            name: '🟢  Spotify',
            value: lines,
            inline: true,
        });
    } else {
        embed.addFields({
            name: '🟢  Spotify',
            value: '*Sonuç bulunamadı*',
            inline: true,
        });
    }

    return embed;
}

function buildDualButtons(scResults, spResults, userId) {
    const rows = [];

    // Row 1 — SoundCloud numaraları
    if (scResults.length) {
        const row = new ActionRowBuilder();
        for (let i = 0; i < scResults.length; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`dual_sc_${i}_${userId}`)
                    .setLabel(`SC ${i + 1}`)
                    .setEmoji('🟠')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }

    // Row 2 — Spotify numaraları
    if (spResults.length) {
        const row = new ActionRowBuilder();
        for (let i = 0; i < spResults.length; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`dual_sp_${i}_${userId}`)
                    .setLabel(`SP ${i + 1}`)
                    .setEmoji('🟢')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }

    // Row 3 — İptal
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dual_cancel_${userId}`)
                .setLabel('İptal')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return rows;
}

// ─── Command ─────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Müzik çal — Spotify/SoundCloud arama veya direkt link')
        .addStringOption(opt =>
            opt.setName('query')
               .setDescription('Şarkı adı veya Spotify/SoundCloud linki')
               .setRequired(true)
        ),

    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

            const query   = interaction.options.getString('query').trim();
            const member  = interaction.member;
            const guild   = interaction.guild;
            const channel = interaction.channel;

            // ── Ses kanalı doğrulama ──
            const val = this._validate(interaction, member, guild);
            if (!val.ok) {
                return interaction.editReply({ embeds: [MusicEmbedManager.error('Hata', val.msg)], components: [] });
            }

            // ── Player hazırla ──
            let player = client.players.get(guild.id);
            if (!player) {
                player = new MusicPlayer(guild, channel, member.voice.channel);
                client.players.set(guild.id, player);
            }
            player.voiceChannel = member.voice.channel;
            player.textChannel  = channel;

            if (!client.musicEmbedManager) {
                client.musicEmbedManager = new MusicEmbedManager(client);
            }

            // ── Eğer direkt link ise direkt çal ──
            if (isDirectLink(query)) {
                return this._playDirect(interaction, client, player, query, member);
            }

            // ── Eğer URL ise (spotify/soundcloud linki) direkt çal ──
            if (isURL(query)) {
                return this._playURL(interaction, client, player, query, member, guild);
            }

            // ── Metin araması → dual platform arama göster ──
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.bot.colors.soundcloud)
                        .setAuthor({ name: '🎵  Aranıyor…', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`> 🔍  **${query}**`)
                        .setTimestamp(),
                ],
            });

            const SoundCloud = require('../src/SoundCloud');
            const Spotify    = require('../src/Spotify');

            // İki platformu paralel ara
            const [scRaw, spRaw] = await Promise.allSettled([
                SoundCloud.search(query, 5, guild.id),
                Spotify.search(query, 5, 'track', guild.id),
            ]);

            const scResults = scRaw.status === 'fulfilled' && Array.isArray(scRaw.value)
                ? scRaw.value.slice(0, 5) : [];
            const spResults = spRaw.status === 'fulfilled' && Array.isArray(spRaw.value)
                ? spRaw.value.slice(0, 5) : [];

            if (!scResults.length && !spResults.length) {
                return interaction.editReply({
                    embeds: [MusicEmbedManager.error(
                        'Sonuç Bulunamadı',
                        `**"${query}"** için hiçbir platformda sonuç bulunamadı.\nFarklı bir arama terimi dene.`
                    )],
                    components: [],
                });
            }

            // Sonuçları sakla
            if (!global.dualResults) global.dualResults = new Map();
            global.dualResults.set(interaction.user.id, {
                query, scResults, spResults,
                guildId: guild.id,
                timestamp: Date.now(),
            });
            setTimeout(() => global.dualResults?.delete(interaction.user.id), 5 * 60_000);

            const embed   = buildDualEmbed(query, scResults, spResults, client.user);
            const buttons = buildDualButtons(scResults, spResults, interaction.user.id);

            await interaction.editReply({ embeds: [embed], components: buttons });

        } catch (err) {
            const msg = await ErrorHandler.handle(err, interaction.guild?.id, 'play.execute');
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [MusicEmbedManager.error('Hata', msg)], components: [] });
                } else {
                    await interaction.reply({ embeds: [MusicEmbedManager.error('Hata', msg)], ephemeral: true });
                }
            } catch { /* already replied */ }
        }
    },

    // ── Direkt dosya linki çal ────────────────────────────────────────────────
    async _playDirect(interaction, client, player, url, member) {
        const DirectLink = require('../src/DirectLink');
        await interaction.editReply({
            embeds: [MusicEmbedManager.info('🔗  Direkt Link', `Yükleniyor: \`${url}\``, config.bot.colors.direct)],
            components: [],
        });
        const data   = await DirectLink.getInfo(url);
        const tracks = Array.isArray(data) ? data : (data ? [data] : []);
        if (!tracks.length) {
            return interaction.editReply({
                embeds: [MusicEmbedManager.error('Hata', 'Link yüklenemedi.')],
                components: [],
            });
        }
        await client.musicEmbedManager.handleMusicData(interaction.guild.id, { tracks, isPlaylist: false }, member, interaction);
    },

    // ── Spotify / SoundCloud URL çal ─────────────────────────────────────────
    async _playURL(interaction, client, player, url, member, guild) {
        const Spotify    = require('../src/Spotify');
        const SoundCloud = require('../src/SoundCloud');

        const q = url.toLowerCase();
        let tracks = [], isPlaylist = false, meta = {};
        let platform = 'soundcloud';

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(q.includes('spotify') ? config.bot.colors.spotify : config.bot.colors.soundcloud)
                    .setAuthor({ name: '🎵  Link yükleniyor…', iconURL: client.user.displayAvatarURL() })
                    .setDescription(`> 🔗  \`${url}\``)
                    .setTimestamp(),
            ],
            components: [],
        });

        if (q.includes('spotify.com')) {
            platform = 'spotify';
            const { type } = Spotify.parseSpotifyURL(url);
            const data = await Spotify.getFromURL(url, guild.id);
            tracks     = Array.isArray(data) ? data : (data ? [data] : []);
            isPlaylist = ['playlist', 'album', 'artist'].includes(type);
            meta       = { type, name: tracks[0]?.playlistName || url, url, thumbnail: tracks[0]?.thumbnail };
        } else if (q.includes('soundcloud.com')) {
            const data = await SoundCloud.search(url, 1, guild.id);
            tracks     = Array.isArray(data) ? data : (data ? [data] : []);
            if (tracks.length > 1) { isPlaylist = true; meta = { type: 'playlist', name: 'SoundCloud Set', url }; }
        }

        if (!tracks.length) {
            return interaction.editReply({
                embeds: [MusicEmbedManager.error('Bulunamadı', 'Bu linkten şarkı yüklenemedi.')],
                components: [],
            });
        }

        if (isPlaylist) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(platform === 'spotify' ? config.bot.colors.spotify : config.bot.colors.soundcloud)
                        .setAuthor({ name: `${platform === 'spotify' ? '🟢 Spotify' : '🟠 SoundCloud'}  ·  Playlist Yüklendi`, iconURL: client.user.displayAvatarURL() })
                        .setTitle(meta.name || 'Playlist')
                        .setDescription(`**${tracks.length}** şarkı sıraya eklendi.`)
                        .setTimestamp(),
                ],
                components: [],
            });
        }

        await client.musicEmbedManager.handleMusicData(guild.id, { tracks, isPlaylist, meta }, member, interaction);
    },

    // ── Doğrulama ─────────────────────────────────────────────────────────────
    _validate(interaction, member, guild) {
        if (!member.voice.channel) return { ok: false, msg: '❌ Bir ses kanalında olman gerekiyor!' };
        const perms = member.voice.channel.permissionsFor(guild.members.me);
        if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
            return { ok: false, msg: '❌ Ses kanalında **Bağlan** ve **Konuş** yetkilerim yok!' };
        }
        const botVC = guild.members.me.voice.channel;
        if (botVC && botVC.id !== member.voice.channel.id) {
            return { ok: false, msg: `❌ Zaten <#${botVC.id}> kanalındayım. O kanala katıl veya önce durdur.` };
        }
        return { ok: true };
    },
};
