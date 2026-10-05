const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const LanguageManager = require('./LanguageManager');

class MusicEmbedManager {
    constructor(client) {
        this.client = client;
        // Çakışma önleme için işlem kuyruğu
        this.processingQueue = new Map(); // guildId -> Promise
    }

    /**
     * Queue'daki track'leri sırayla preload eder (donmayı önler)
     */
    async sequentialPreload(player, tracks) {
        for (const track of tracks) {
            // Eğer bu track zaten preload edilmişse veya preload sırasındaysa atla
            if (player.preloadedStreams.has(track.url) || player.preloadingQueue.includes(track.url)) {
                continue;
            }

            try {
                await player.preloadTrack(track);
                // Her preload arasında kısa bekleme (sistem yükünü azaltmak için)
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error(`❌ Preload error for ${track.title}:`, err.message);
                // Hata olsa bile devam et
            }
        }
    }

    /**
     * Müzik verilerini işler ve uygun embed'i gönderir/günceller
     */
    async handleMusicData(guildId, trackData, member, interaction = null) {
        // Çakışma önleme - aynı guild için aynı anda sadece bir işlem
        if (this.processingQueue.has(guildId)) {
            await this.processingQueue.get(guildId);
        }

        const processingPromise = this._processMusic(guildId, trackData, member, interaction);
        this.processingQueue.set(guildId, processingPromise);

        try {
            const result = await processingPromise;
            return result;
        } finally {
            this.processingQueue.delete(guildId);
        }
    }

    async _processMusic(guildId, trackData, member, interaction) {
        const player = this.client.players.get(guildId);
        if (!player) return { success: false, message: 'No player found' };

        const wasPlayingBefore = player.currentTrack !== null;
        const isPlaylist = trackData.isPlaylist || false;
        const tracks = trackData.tracks;

        try {
            let firstTrackResult = null;
            const wasIdle = (!player.currentTrack && player.queue.length === 0);

            // Tüm track'leri player'a ekle (preload'ı tetikleyecek)
            for (let i = 0; i < tracks.length; i++) {
                const track = { ...tracks[i] };
                track.requestedBy = member;
                track.addedAt = Date.now();

                // İlk track ve player boşsa
                if (i === 0 && wasIdle) {
                    player.currentTrack = track;

                    // Ses kanalına bağlan ve çalmaya başla
                    try {
                        if (!player.connection) {
                            await player.connect();
                        }
                        await player.play();

                        // Yeni embed oluştur
                        firstTrackResult = await this.createNewMusicEmbed(player, track, member, interaction);
                    } catch (playError) {
                        console.error('Error in play process:', playError);
                        // Hata durumunda track'i sıraya ekle
                        player.currentTrack = null;
                        player.queue.push(track);
                    }
                } else {
                    // Kuyruğa ekle
                    player.queue.push(track);
                }
            }

            // Preload'ı tetikle - queue'daki track'leri sırayla preload et (donmayı önlemek için)
            this.sequentialPreload(player, player.queue.slice()).catch(err =>
                console.error('❌ Sequential preload error:', err.message)
            );

            // Eğer ilk şarkıyı çalmaya başladıysak ve playlist'te başka şarkılar varsa
            if (firstTrackResult && tracks.length > 1) {
                // Playlist'teki kalan şarkıları sıraya eklediğimizi bildiren mesaj göster
                await this.showPlaylistAdditionMessage(player, tracks, member, interaction, isPlaylist);
                // Kuyruk bilgisi güncellendi, embed'i de güncelle
                await this.updateNowPlayingEmbed(player);
                return firstTrackResult;
            }

            // Eğer sadece kuyruğa ekleme yaptıysak (zaten müzik çalıyordu)
            if (wasPlayingBefore || (!firstTrackResult && tracks.length > 0)) {
                return await this.handleQueueAddition(player, tracks, member, interaction, isPlaylist);
            }

            // Tek şarkı çalmaya başladıysak
            if (firstTrackResult) {
                return firstTrackResult;
            }

            return { success: true, message: 'Track processed successfully' };
        } catch (error) {
            return { success: false, message: 'Error processing music' };
        }
    }

    /**
     * Playlist ekleme mesajını gösterir (ilk şarkı çalıyorken kalan şarkıların eklendiğini bildirir)
     */
    async showPlaylistAdditionMessage(player, tracks, member, interaction, isPlaylist) {
        // Bilgi mesajı gönder (ilk şarkı hariç kalan şarkıları bildir)
        const remainingTracks = tracks.slice(1); // İlk şarkı hariç
        const messageText = await this.createQueueAdditionMessage(remainingTracks, member.guild.id, isPlaylist);

        // Mesajı text channel'a gönder (interaction değil)
        let infoMessage;
        try {
            infoMessage = await player.textChannel.send({ content: messageText });

            // Bilgi mesajını 10 saniye sonra sil
            setTimeout(async () => {
                try {
                    await infoMessage.delete();
                } catch (error) {
                    // Mesaj silinmiş olabilir
                }
            }, 10000);
        } catch (error) {
            console.error('Error sending playlist addition message:', error);
        }
    }

    /**
     * Yeni müzik embed'i oluşturur (çalan müzik yokken)
     */
    async createNewMusicEmbed(player, track, member, interaction) {
        const embed = await this.createNowPlayingEmbed(player, track, member.guild.id);
        const buttons = await this.createControlButtons(player);

        let message;
        if (interaction) {
            if (interaction.deferred || interaction.replied) {
                message = await interaction.editReply({ content: null, embeds: [embed], components: buttons });
            } else {
                message = await interaction.reply({ embeds: [embed], components: buttons });
            }
        } else {
            message = await player.textChannel.send({ embeds: [embed], components: buttons });
        }

        player.nowPlayingMessage = message;
        player.requesterId = member.id;

        return { success: true, message: 'Now playing', isNewEmbed: true };
    }

    /**
     * Kuyruğa şarkı eklenmesi durumunu yönetir
     */
    async handleQueueAddition(player, tracks, member, interaction, isPlaylist) {
        // Mevcut embed'i güncelle
        if (player.nowPlayingMessage && player.currentTrack) {
            await this.updateNowPlayingEmbed(player);
        }

        // Bilgi mesajı gönder
        const messageText = await this.createQueueAdditionMessage(tracks, member.guild.id, isPlaylist);

        let infoMessage;
        if (interaction) {
            if (interaction.deferred || interaction.replied) {
                infoMessage = await interaction.editReply({ content: messageText, embeds: [], components: [] });
            } else {
                infoMessage = await interaction.reply({ content: messageText, flags: [1 << 6] });
            }
        } else {
            infoMessage = await player.textChannel.send({ content: messageText });
        }

        // Bilgi mesajını 10 saniye sonra sil
        setTimeout(async () => {
            try {
                await infoMessage.delete();
            } catch (error) {
                // Mesaj silinmiş olabilir
            }
        }, 10000);

        return { success: true, message: 'Added to queue', isNewEmbed: false };
    }

    /**
     * Now Playing embed'ini oluşturur (image_5e34a1.png tasarımına uygun)
     */
    async createNowPlayingEmbed(player, track, guildId) {
        // Verilerin güvenli biçimde çekilmesi ve fallback atanması
        const authorName = track.artist || track.author || 'Bilinmiyor';
        const requesterString = track.requestedBy?.toString() || 'Bilinmiyor';
        const currentVolume = player.volume !== undefined ? player.volume : 50;
        const currentFilter = player.filter || 'Normal';
        const autoplayStatus = player.autoplay ? 'Aktif' : 'Devre Dışı';
        const totalDuration = this.formatDuration(track.duration);
        
        // Oynatıcıdan anlık sürenin okunması
        const rawPosition = player.currentTime || player.position || 0;
        const currentPos = this.formatDuration(rawPosition);

        // İlerleme çubuğu tasarımı
        const customProgressBar = '🔴 | 🎵 ─────────────────────────';

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Şarkı Çalmaya Başladı...' })
            .setDescription(`**[${track.title}](${track.url})**`)
            .setColor(config.bot?.embedColor || '#FF6B6B')
            .addFields(
                { name: 'Yükleyici:', value: `${authorName}`, inline: true },
                { name: 'Şarkıyı isteyen:', value: `${requesterString}`, inline: true },
                { name: 'Ses Seviyesi:', value: `%${currentVolume}`, inline: true },
                { name: 'Filtre:', value: `${currentFilter}`, inline: true },
                { name: 'Autoplay:', value: `${autoplayStatus}`, inline: true },
                { name: 'Toplam Süre:', value: `${totalDuration}`, inline: true },
                { name: 'Şuanki Süre:', value: `\`[${currentPos} / ${totalDuration}]\``, inline: false },
                { name: '\u200B', value: customProgressBar, inline: false }
            )
            .setTimestamp();

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        // Altyapıdaki izin ve kuyruk bilgileri alt bilgi alanında korunur
        const footerParts = [];
        const permissionInfo = await LanguageManager.getTranslation(guildId, 'musicmanager.control_permission_info');
        footerParts.push(permissionInfo);
        
        if (player.queue && player.queue.length > 0) {
            const queueInfo = await LanguageManager.getTranslation(guildId, 'commands.play.more_songs_in_queue', { count: player.queue.length });
            footerParts.push(queueInfo);
        }
        
        if (footerParts.length > 0) {
            embed.setFooter({ text: footerParts.join(' • ') });
        }

        return embed;
    }

    /**
     * Mevcut müzik embed'ini günceller
     */
    async updateNowPlayingEmbed(player) {
        if (!player.nowPlayingMessage || !player.currentTrack) return;

        try {
            const embed = await this.createNowPlayingEmbed(player, player.currentTrack, player.guild.id);
            const buttons = await this.createControlButtons(player);

            await player.nowPlayingMessage.edit({
                embeds: [embed],
                components: buttons
            });
        } catch (error) {
            console.error('Error updating now playing embed:', error);
        }
    }

    /**
     * Şarkı bittiğinde çağrılır
     */
    async handleTrackEnd(player) {
        if (player.queue.length > 0) {
            // Sıradaki şarkıya geç
            const nextTrack = player.queue.shift();
            player.currentTrack = nextTrack;

            await player.play();
            await this.updateNowPlayingEmbed(player);
        } else {
            // Tüm şarkılar bitti
            await this.handlePlaybackEnd(player);
        }
    }

    /**
     * Tüm müzikler bittiğinde çağrılır
     */
    async handlePlaybackEnd(player) {
        // Butonları devre dışı bırak
        if (player.nowPlayingMessage) {
            try {
                const disabledButtons = await this.createControlButtons(player, true);
                await player.nowPlayingMessage.edit({
                    components: disabledButtons
                });
            } catch (error) {
                console.error('Error disabling buttons:', error);
            }
        }

        let endEmbed = null;
        const guildId = player.guild?.id;

        try {
            const title = guildId
                ? await LanguageManager.getTranslation(guildId, 'musicmanager.playback_ended')
                : 'Playback Ended';
            const description = guildId
                ? await LanguageManager.getTranslation(guildId, 'musicmanager.queue_empty')
                : 'Queue is now empty.';

            endEmbed = new EmbedBuilder()
                .setTitle(`🎵 ${title}`)
                .setDescription(description)
                .setColor('#FF6B6B')
                .setTimestamp();
        } catch (error) {
            console.error('Error preparing playback end embed:', error);
        }

        if (!endEmbed) {
            endEmbed = new EmbedBuilder()
                .setDescription('🎵 Playback ended')
                .setColor('#FF6B6B')
                .setTimestamp();
        }

        const textChannel = player.textChannel;
        if (textChannel && typeof textChannel.send === 'function') {
            try {
                await textChannel.send({ embeds: [endEmbed] });
            } catch (error) {
                // Suppress errors when channel is unavailable or permissions are missing
            }
        }

        // Player'ı temizle
        player.currentTrack = null;
        player.nowPlayingMessage = null;
    }

    /**
     * Kontrol butonlarını oluşturur
     */
    async createControlButtons(player, disabled = false) {
        const guildId = player.guild.id;
        const sessionId = player.sessionId;
        const requesterId = player.requesterId;

        // Button labels
        const pauseLabel = player.paused ?
            await LanguageManager.getTranslation(guildId, 'buttons.resume') :
            await LanguageManager.getTranslation(guildId, 'buttons.pause');

        const skipLabel = await LanguageManager.getTranslation(guildId, 'buttons.skip');
        const stopLabel = await LanguageManager.getTranslation(guildId, 'buttons.stop');
        const queueLabel = await LanguageManager.getTranslation(guildId, 'buttons.queue');
        const shuffleLabel = await LanguageManager.getTranslation(guildId, 'buttons.shuffle');

        const pauseButton = new ButtonBuilder()
            .setCustomId(`music_pause:${requesterId}:${sessionId}`)
            .setLabel(pauseLabel)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(player.paused ? '▶️' : '⏸️')
            .setDisabled(disabled);

        const skipButton = new ButtonBuilder()
            .setCustomId(`music_skip:${requesterId}:${sessionId}`)
            .setLabel(skipLabel)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️')
            .setDisabled(disabled || player.queue.length === 0); // Sırada müzik yoksa disabled

        const stopButton = new ButtonBuilder()
            .setCustomId(`music_stop:${requesterId}:${sessionId}`)
            .setLabel(stopLabel)
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️')
            .setDisabled(disabled);

        const queueButton = new ButtonBuilder()
            .setCustomId(`music_queue:${requesterId}:${sessionId}`)
            .setLabel(queueLabel)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋')
            .setDisabled(false); // Queue butonu her zaman aktif

        const shuffleButton = new ButtonBuilder()
            .setCustomId(`music_shuffle:${requesterId}:${sessionId}`)
            .setLabel(shuffleLabel)
            .setStyle(player.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔀')
            .setDisabled(disabled);

        const volumeLabel = await LanguageManager.getTranslation(guildId, 'buttons.volume');
        const volumeButton = new ButtonBuilder()
            .setCustomId(`music_volume:${requesterId}:${sessionId}`)
            .setLabel(volumeLabel)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔊')
            .setDisabled(disabled);

        // Loop button - cycles through off -> track -> queue
        let loopLabel, loopEmoji, loopStyle;
        if (player.loop === 'track') {
            loopLabel = await LanguageManager.getTranslation(guildId, 'buttons.loop_track');
            loopEmoji = '🔂';
            loopStyle = ButtonStyle.Success;
        } else if (player.loop === 'queue') {
            loopLabel = await LanguageManager.getTranslation(guildId, 'buttons.loop_queue');
            loopEmoji = '🔁';
            loopStyle = ButtonStyle.Success;
        } else {
            loopLabel = await LanguageManager.getTranslation(guildId, 'buttons.loop_off');
            loopEmoji = '➡️';
            loopStyle = ButtonStyle.Secondary;
        }

        const loopButton = new ButtonBuilder()
            .setCustomId(`music_loop:${requesterId}:${sessionId}`)
            .setLabel(loopLabel)
            .setStyle(loopStyle)
            .setEmoji(loopEmoji)
            .setDisabled(disabled);

        // Autoplay button
        let autoplayLabel, autoplayEmoji, autoplayStyle;
        if (player.autoplay) {
            autoplayLabel = await LanguageManager.getTranslation(guildId, 'buttons.autoplay_on');
            autoplayEmoji = '🎲';
            autoplayStyle = ButtonStyle.Success;
        } else {
            autoplayLabel = await LanguageManager.getTranslation(guildId, 'buttons.autoplay_off');
            autoplayEmoji = '🎲';
            autoplayStyle = ButtonStyle.Secondary;
        }

        const autoplayButton = new ButtonBuilder()
            .setCustomId(`music_autoplay:${requesterId}:${sessionId}`)
            .setLabel(autoplayLabel)
            .setStyle(autoplayStyle)
            .setEmoji(autoplayEmoji)
            .setDisabled(disabled);

        // Lyrics button (only show if lyrics available)
        const lyricsLabel = await LanguageManager.getTranslation(guildId, 'buttons.lyrics') || 'Lyrics';
        const lyricsButton = new ButtonBuilder()
            .setCustomId(`music_lyrics:${requesterId}:${sessionId}`)
            .setLabel(lyricsLabel)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎤')
            .setDisabled(disabled || !player.hasLyrics());

        const row = new ActionRowBuilder()
            .addComponents(pauseButton, skipButton, stopButton, queueButton, shuffleButton);

        const row2 = new ActionRowBuilder()
            .addComponents(volumeButton, loopButton, autoplayButton, lyricsButton);

        return [row, row2];
    }

    /**
     * Kuyruk ekleme mesajı oluşturur
     */
    async createQueueAdditionMessage(tracks, guildId, isPlaylist) {
        if (isPlaylist) {
            return await LanguageManager.getTranslation(guildId, 'musicmanager.playlist_added_to_queue', {
                count: tracks.length
            });
        } else {
            const track = tracks[0];
            const title = track?.title || 'Unknown Track';
            return await LanguageManager.getTranslation(guildId, 'musicmanager.track_added_to_queue', {
                title: title
            });
        }
    }

    /**
     * Duration formatı
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';

        const totalSeconds = Math.floor(Number(seconds) || 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const remainingSeconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Platform emoji'si
     */
    getPlatformEmoji(platform) {
        const emojis = {
            youtube: '🔴',
            spotify: '🟢',
            soundcloud: '🟠',
            direct: '🔗'
        };
        return emojis[platform] || '🎵';
    }
}

module.exports = MusicEmbedManager;