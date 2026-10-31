const { db } = require('../firebase');
const { CATEGORIES, DEFAULT_WEIGHT, LIKE_BOOST, REPOST_BOOST, SKIP_PENALTY } = require('../utils/constants');
function defUser(){const a={};CATEGORIES.forEach(c=>a[c]=DEFAULT_WEIGHT);return {profile:{},algorithm:a,likedVideos:[],repostedVideos:[],watchedVideos:[],preferences:{},videoQueue:[]};}
async function getUser(id){
  if(!db) return defUser();
  const d = await db.collection('users').doc(id).get();
  if(!d.exists){
    console.log(`[DEBUG] Yeni kullanici profili olusturuluyor: ${id}`);
    const nu = defUser();
    await db.collection('users').doc(id).set(nu);
    return nu;
  }
  return d.data();
}
async function saveUser(id,data){if(db)await db.collection('users').doc(id).set(data,{merge:true});}
async function updateAlgorithm(id,cat,act){const u=await getUser(id);let w=u.algorithm[cat]||DEFAULT_WEIGHT;if(act==='like')w+=LIKE_BOOST;if(act==='repost')w+=REPOST_BOOST;if(act==='skip')w+=SKIP_PENALTY;if(w<0.1)w=0.1;u.algorithm[cat]=w;await saveUser(id,{algorithm:u.algorithm});return w;}
async function addLikedVideo(id,v){const u=await getUser(id);if(!u.likedVideos.includes(v)){u.likedVideos.push(v);await saveUser(id,{likedVideos:u.likedVideos});}}
async function addRepostedVideo(id,v){const u=await getUser(id);if(!u.repostedVideos.includes(v)){u.repostedVideos.push(v);await saveUser(id,{repostedVideos:u.repostedVideos});}}
async function addWatchedVideo(id,v){const u=await getUser(id);if(!u.watchedVideos.includes(v)){u.watchedVideos.push(v);await saveUser(id,{watchedVideos:u.watchedVideos});}}
async function resetAlgorithm(id){const a={};CATEGORIES.forEach(c=>a[c]=DEFAULT_WEIGHT);await saveUser(id,{algorithm:a});return a;}
module.exports = { getUser, saveUser, updateAlgorithm, addLikedVideo, addRepostedVideo, addWatchedVideo, resetAlgorithm };