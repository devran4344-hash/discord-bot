const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../services/algorithmService');
module.exports = {
  data: new SlashCommandBuilder().setName('algorithm').setDescription('Algoritma agirliklari'),
  async execute(i){
    const u=await getUser(i.user.id);
    const list=Object.entries(u.algorithm||{}).sort((a,b)=>b[1]-a[1]).map(([c,w])=>`**${c}**: ${w.toFixed(2)}`).join('\n');
    const e=new EmbedBuilder().setTitle('Algoritma Agirliklarin').setColor('#FEE75C').setDescription(list||'Veri yok.');
    await i.reply({embeds:[e],ephemeral:true});
  }
};