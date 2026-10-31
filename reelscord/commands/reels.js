const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getUser, saveUser } = require('../services/algorithmService');
const { getRandomVideos, getVideoById } = require('../services/videoService');
const { downloadVideo, deleteTempFile } = require('../services/downloadService');
const { ACTIVE_QUEUE_SIZE } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder().setName('reels').setDescription('Kisisel video akisini acar'),
  async execute(i){
    // Discord'un zaman asimina ugramamasi icin hemen yanit ver
    await i.deferReply();

    const uid = i.user.id; 
    const u = await getUser(uid);
    
    if(u.videoQueue.length < ACTIVE_QUEUE_SIZE){
      const vids = await getRandomVideos(ACTIVE_QUEUE_SIZE);
      u.videoQueue = vids.map(v => v.id);
      await saveUser(uid, { videoQueue: u.videoQueue });
    }
    
    const videoId = u.videoQueue[0];
    if (!videoId) {
      return i.editReply({ 
        content: 'Su anda gosterilecek video yok. Lutfen Firebase "videos" koleksiyonuna video ekleyin.' 
      });
    }

    const video = await getVideoById(videoId);
    if(!video) {
      return i.editReply({ content: 'Video bulunamadi. Veritabanindan silinmis olabilir.' });
    }

    // VIDEoyu INDIR
    try {
      await i.editReply({ content: '⏳ Video indiriliyor, lutfen bekle...' });
      
      const filePath = await downloadVideo(video.url);
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
      
      // Videoyu gonder
      await i.editReply({ content: '', embeds: [e], components: [row], files: [attachment] });
      
      // Gonderdikten 30 saniye sonra sunucudan sil (yer kaplamasin)
      setTimeout(() => deleteTempFile(filePath), 30000);

    } catch (err) {
      console.error(err);
      await i.editReply({ content: 'Video indirilemedi. Instagram linki gizli veya engelli olabilir.' });
    }
  }
};