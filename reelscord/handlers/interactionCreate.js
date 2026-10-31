const { handleVideoInteraction } = require('./videoInteraction');
const { getVideoById } = require('../services/videoService');
const { MessageFlags } = require('discord.js');
module.exports = async (i) => {
  if(i.isChatInputCommand()){
    const c = i.client.commands.get(i.commandName); if(!c)return;
    try{await c.execute(i);}catch(e){console.error(e);if(!i.replied)await i.reply({content:'Hata.',flags: MessageFlags.Ephemeral});}
    return;
  }
  if(i.isButton()){
    const [a,vid]=i.customId.split('_');
    if(['like','skip','repost'].includes(a)){
      const v=await getVideoById(vid);
      if(!v)return i.reply({content:'Video yok.',flags: MessageFlags.Ephemeral});
      await handleVideoInteraction(i,v);
    }
  }
};