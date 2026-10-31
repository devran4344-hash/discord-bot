const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../services/algorithmService');
const { getVideoById } = require('../services/videoService');
module.exports = {
  data: new SlashCommandBuilder().setName('liked').setDescription('Begenilen videolar'),
  async execute(i){
    const u=await getUser(i.user.id);
    if(!u.likedVideos.length)return i.reply({content:'Begenilen yok.',ephemeral:true});
    const v=await Promise.all(u.likedVideos.map(getVideoById));
    const e=new EmbedBuilder().setTitle('Begenilen Videolar').setColor('#57F287').setDescription(v.filter(Boolean).map(x=>`• [${x.title||'Video'}](${x.url})`).join('\n')||'Yok');
    await i.reply({embeds:[e],ephemeral:true});
  }
};