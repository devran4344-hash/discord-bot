const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../services/algorithmService');
const { getVideoById } = require('../services/videoService');
module.exports = {
  data: new SlashCommandBuilder().setName('reposted').setDescription('Repostlanan videolar'),
  async execute(i){
    const u=await getUser(i.user.id);
    if(!u.repostedVideos.length)return i.reply({content:'Repost yok.',ephemeral:true});
    const v=await Promise.all(u.repostedVideos.map(getVideoById));
    const e=new EmbedBuilder().setTitle('Repostlanan Videolar').setColor('#5865F2').setDescription(v.filter(Boolean).map(x=>`• [${x.title||'Video'}](${x.url})`).join('\n')||'Yok');
    await i.reply({embeds:[e],ephemeral:true});
  }
};