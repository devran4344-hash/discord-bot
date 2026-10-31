const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getUser, saveUser } = require('../services/algorithmService');
const { getRandomVideos, getVideoById } = require('../services/videoService');
const { downloadVideo, deleteTempFile } = require('../services/downloadService');
const { autoFetchVideos } = require('../services/autoFetchService');

module.exports = {
  data: new SlashCommandBuilder().setName('reels').setDescription('Kisisel video akisini acar'),
  async execute(i){
    await i.deferReply();
    const uid = i.user.id; 
    
    console.log(`[DEBUG] --- YENI REELS ISTEGI ---`);
    
    // 1. PROFIL KONTROLU
    const u = await getUser(uid);
    console.log(`[DEBUG] Kuyruk boyutu: ${u.videoQueue.length}`);

    // 2. KUYRUK TAMAMEN BOSSA OTOMATIK VIDEO CEK
    if(u.videoQueue.length === 0){
      console.log(`[DEBUG] Kuyruk bos, AutoFetch tetikleniyor...`);
      await i.editReply({ content: '⏳ Ilk videolar hazirlaniyor, lutfen bekle...' });
      await autoFetchVideos(); 
      const vids = await getRandomVideos(20); // 20 tane cek
      u.videoQueue = vids.map(v => v.id);
      await saveUser(uid, { videoQueue: u.videoQueue });
    }
    
    // 3. VIDEOYU INDIR
    const videoId = u.videoQueue.shift(); // Siradaki videoyu al ve kuyruktan cikar
    await saveUser(uid, { videoQueue: u.videoQueue });

    if (!videoId) {
      return i.editReply({ content: '❌ Sistemde hic video yok. Lutfen AutoFetch workflowunu calistirin.' });
    }

    const video = await getVideoById(videoId);
    if(!video) {
      return i.editReply({ content: '❌ Video bulunamadi (silinmis).' });
    }

    try {
      await i.editReply({ content: `⏳ Video indiriliyor: **${video.title}**` });
      console.log(`[DEBUG] Indirme basliyor: ${video.url}`);
      
      const filePath = await downloadVideo(video.url);
      console.log(`[DEBUG] Indirme basarili! Dosya: ${filePath}`);
      
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

      await i.editReply({ content: '', embeds: [e], components: [row], files: [attachment] });
      console.log(`[DEBUG] Video basariyla gonderildi.`);
      
      setTimeout(() => deleteTempFile(filePath), 30000);

    } catch (err) {
      console.error('[HATA] Indirme coktu:', err.message);
      await i.editReply({ content: '❌ Video indirilemedi. Lutfen tekrar /reels yazin.' });
    }
  }
};