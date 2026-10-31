const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getUser, saveUser } = require('../services/algorithmService');
const { getRandomVideos, getVideoById } = require('../services/videoService');
const { downloadVideo, deleteTempFile } = require('../services/downloadService');
const { autoFetchVideos } = require('../services/autoFetchService');
const { ACTIVE_QUEUE_SIZE } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder().setName('reels').setDescription('Kisisel video akisini acar'),
  async execute(i){
    await i.deferReply();
    const uid = i.user.id; 
    
    console.log(`[DEBUG] --- YENI REELS ISTEGI ---`);
    console.log(`[DEBUG] Kullanici ID: ${uid}`);
    
    // 1. PROFIL KONTROLU (Yoksa saniyesinde acar)
    const u = await getUser(uid);
    console.log(`[DEBUG] Profil kontrol edildi. Kuyruk boyutu: ${u.videoQueue.length}`);

    // 2. KUYRUK BOSSA OTOMATIK VIDEO CEK
    if(u.videoQueue.length < ACTIVE_QUEUE_SIZE){
      console.log(`[DEBUG] Kuyruk bos, AutoFetch tetikleniyor...`);
      await i.editReply({ content: '⏳ Sistem baslatiliyor, ilk videolar hazirlaniyor. Lutfen bekle...' });
      
      await autoFetchVideos(); // Videolar yoksa Firebase'e ekler
      
      const vids = await getRandomVideos(ACTIVE_QUEUE_SIZE);
      u.videoQueue = vids.map(v => v.id);
      await saveUser(uid, { videoQueue: u.videoQueue });
      console.log(`[DEBUG] Yeni kuyruk olusturuldu. Video sayisi: ${u.videoQueue.length}`);
    }
    
    // 3. VIDEOYU INDIR
    const videoId = u.videoQueue[0];
    if (!videoId) {
      return i.editReply({ content: '❌ Hata: Veritabaninda video bulunamadi ve otomatik ekleme basarisiz oldu.' });
    }

    const video = await getVideoById(videoId);
    if(!video) {
      return i.editReply({ content: '❌ Hata: Video ID bulundu ama veritabani kaydi silinmis.' });
    }

    try {
      await i.editReply({ content: `⏳ Video indiriliyor: **${video.title}**` });
      console.log(`[DEBUG] Indirme basliyor: ${video.url}`);
      
      const filePath = await downloadVideo(video.url);
      console.log(`[DEBUG] Indirme basarili! Dosya yolu: ${filePath}`);
      
      const attachment = new AttachmentBuilder(filePath, { name: 'reels.mp4' });

      const e = new EmbedBuilder()
        .setTitle(video.title || 'ReelsCord')
        .setDescription(video.description || 'Video')
        .setColor('#E1306C')
        .setFooter({ text: `Kategori: ${video.category || 'diger'}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`like_${video.id}`).setLabel('Begen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`skip_${video.id}`).setLabel('Gec').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`repost_${video.id}`).setLabel('Repostla').setStyle(ButtonStyle.Primary)
      );

      u.videoQueue.shift(); 
      await saveUser(uid, { videoQueue: u.videoQueue });
      
      await i.editReply({ content: '', embeds: [e], components: [row], files: [attachment] });
      console.log(`[DEBUG] Video basariyla Discord'a gonderildi.`);
      
      setTimeout(() => deleteTempFile(filePath), 30000);

    } catch (err) {
      console.error('[HATA] Indirme sirasinda coktu:', err);
      await i.editReply({ content: '❌ Video indirilemedi. Link bozuk veya Instagram engelledi.' });
    }
  }
};