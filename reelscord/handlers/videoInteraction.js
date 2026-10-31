const { updateAlgorithm, addLikedVideo, addRepostedVideo, addWatchedVideo } = require('../services/algorithmService');
const { MessageFlags } = require('discord.js');
async function handleVideoInteraction(i, v) {
  const uid=i.user.id; const a=i.customId.split('_')[0];
  await updateAlgorithm(uid, v.category, a);
  if(a==='like')await addLikedVideo(uid,v.id);
  if(a==='repost')await addRepostedVideo(uid,v.id);
  if(a==='skip')await addWatchedVideo(uid,v.id);
  const m={like:'Begenildi.',skip:'Gecildi.',repost:'Repostlandi.'};
  await i.reply({ content: m[a]||'OK', flags: MessageFlags.Ephemeral });
}
module.exports = { handleVideoInteraction };