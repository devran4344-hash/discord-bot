const { db } = require('../firebase');
async function getRandomVideos(limit=50) {
  if (!db) return [];
  const s = await db.collection('videos').orderBy('createdAt','desc').limit(limit).get();
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function getVideoById(id) {
  if (!db || !id) return null; // KRİTİK DÜZELTME: Boş ID gelirse Firestore'u patlatma
  const d = await db.collection('videos').doc(id).get();
  return d.exists ? { id: d.id, ...d.data() } : null;
}
module.exports = { getRandomVideos, getVideoById };