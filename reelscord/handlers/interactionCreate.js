const { handleVideoInteraction } = require('./videoInteraction');
const { getVideoById } = require('../services/videoService');
module.exports = async (i) => {
  if(i.isChatInputCommand()){
    const c = i.client.commands.get(i.commandName); if(!c)return;
    try{await c.execute(i);}catch(e){console.error(e);if(!i.replied)await i.reply({content:'Hata.',ephemeral:true});}
    return;
  }
  if(i.isButton()){
    const [a,vid]=i.customId.split('_');
    if(['like','skip','repost'].includes(a)){
      const v=await getVideoById(vid);
      if(!v)return i.reply({content:'Video yok.',ephemeral:true});
      await handleVideoInteraction(i,v);
    }
  }
};