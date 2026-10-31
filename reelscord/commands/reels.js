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
    const u = await getUser(uid);
    
    console.log(`[DEBUG] --- YENI REELS ISTEGI ---`);

    // Eger kuyrukta eski W3C videolari (v1, v2, v3) varsa zorla sifirla
    if (u.videoQueue.length === 0 || u.videoQueue.includes('v1') || u.videoQueue.includes('v2')) {
      console.log(`[DEBUG] Kuyruk eski videolari iceriyor. Sifirlaniyor...`);
      await i.editReply({ content: '⏳ Sistem guncelleniyor, eski videolar temizleniyor...' });
      await autoFetchVideos(); 
      const vids = await getRandomVideos(20);
      u.videoQueue = vids.map(v => v.id);
      await saveUser(uid, { videoQueue: u.videoQueue });
    }
    
    const videoId = u.videoQueue.shift();
    await saveUser(uid, { videoQueue: u.videoQueue });

    if (!videoId) return i.editReply({ content: '❌ Sistemde video yok.' });

    const video = await getVideoById(videoId);
    if(!video) return i.editReply({ content: '❌ Video bulunamadi.' });

    try {
      await i.editReply({ content: `⏳ Video indiriliyor: **${video.title}**` });
      console.log(`[DEBUG] Indirme basliyor: ${video.url}`);
      
      const filePath = await downloadVideo(video.url);
      console.log(`[DEBUG] Indirme basarili!`);
      
      const attachment = new AttachmentBuilder(filePath, { name: 'reels.mp4' });
      const e = new EmbedBuilder().setTitle(video.title || 'ReelsCord').setDescription(video.description || 'Video').setColor('#E1306C').setFooter({ text: `Kategori: ${video.category || 'diger'}` });
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