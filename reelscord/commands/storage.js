const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../services/algorithmService');
const { QUEUE_SIZE } = require('../utils/constants');
module.exports = {
  data: new SlashCommandBuilder().setName('storage').setDescription('Depolama bilgileri'),
  async execute(i){
    const u=await getUser(i.user.id);
    const e=new EmbedBuilder().setTitle('Depolama Bilgilerin').setColor('#EB459E').addFields(
      {name:'Kuyruk',value:`${u.videoQueue.length}/${QUEUE_SIZE}`,inline:true},
      {name:'Begenilen',value:`${u.likedVideos.length}`,inline:true},
      {name:'Repostlanan',value:`${u.repostedVideos.length}`,inline:true},
      {name:'Izlenen',value:`${u.watchedVideos.length}`,inline:true}
    );
    await i.reply({embeds:[e],ephemeral:true});
  }
};