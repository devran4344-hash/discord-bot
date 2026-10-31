const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getUser, saveUser } = require('../services/algorithmService');
const { getRandomVideos, getVideoById } = require('../services/videoService');
const { ACTIVE_QUEUE_SIZE } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder().setName('reels').setDescription('Kisisel video akisini acar'),
  async execute(i){
    const uid = i.user.id; 
    const u = await getUser(uid);
    
    // Kuyruk boşsa doldur
    if(u.videoQueue.length < ACTIVE_QUEUE_SIZE){
      const vids = await getRandomVideos(ACTIVE_QUEUE_SIZE);
      u.videoQueue = vids.map(v => v.id);
      await saveUser(uid, { videoQueue: u.videoQueue });
    }
    
    const videoId = u.videoQueue[0];
    if (!videoId) {
      return i.reply({ 
        content: 'Su anda gosterilecek video yok. Lutfen Firebase "videos" koleksiyonuna video ekleyin.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    const video = await getVideoById(videoId);
    if(!video) {
      return i.reply({ 
        content: 'Video bulunamadi. Veritabanindan silinmis olabilir.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    const e = new EmbedBuilder()
      .setTitle(video.title || 'ReelsCord')
      .setDescription(video.description || 'Video')
      .setURL(video.url)
      .setColor('#E1306C')
      .setFooter({ text: `Kategori: ${video.category || 'diger'}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`like_${video.id}`).setLabel('Begen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`skip_${video.id}`).setLabel('Gec').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`repost_${video.id}`).setLabel('Repostla').setStyle(ButtonStyle.Primary)
    );

    u.videoQueue.shift(); 
    await saveUser(uid, { videoQueue: u.videoQueue });
    
    await i.reply({ embeds: [e], components: [row] });
  }
};