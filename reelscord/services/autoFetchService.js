const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok.'); return; }
  
  console.log('[DEBUG] AutoFetch: Eski videolar temizleniyor...');
  
  // 1. Eski tum videolari sil
  const oldVideos = await db.collection('videos').get();
  const deleteBatch = db.batch();
  oldVideos.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();
  
  console.log('[DEBUG] AutoFetch: Garantili yeni test videolari ekleniyor...');
  
  // 2. %100 Calisan, engellenmeyen yeni test videolari (W3Schools & MDN)
  const videos = [
    { id: 'v1', title: 'Tavsan ve Kaplumbaga', desc: 'W3Schools Test Videosu', url: 'https://www.w3schools.com/html/mov_bbb.mp4', cat: 'mizah' },
    { id: 'v2', title: 'Cicek Acisi', desc: 'MDN Test Videosu', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', cat: 'spor' },
    { id: 'v3', title: 'Sintel Fragman', desc: 'W3C Test Videosu', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', cat: 'teknoloji' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet garantili video Firestore'a yazildi!`);
}
module.exports = { autoFetchVideos };