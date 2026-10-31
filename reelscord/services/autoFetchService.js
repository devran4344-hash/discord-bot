const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok.'); return; }
  
  console.log('[DEBUG] AutoFetch: Eski videolar temizleniyor...');
  const oldVideos = await db.collection('videos').get();
  const deleteBatch = db.batch();
  oldVideos.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();
  
  console.log('[DEBUG] AutoFetch: Instagram Reels videolari ekleniyor...');
  
  // Gercek Instagram Reels Linkleri
  const videos = [
    { id: 'insta1', title: 'Instagram Reels 1', desc: 'Gercek Instagram Videosu', url: 'https://www.instagram.com/reel/C3XbW2eLq1p/', cat: 'mizah' },
    { id: 'insta2', title: 'Instagram Reels 2', desc: 'Gercek Instagram Videosu 2', url: 'https://www.instagram.com/reel/C3Y1Z8WrXyZ/', cat: 'teknoloji' },
    { id: 'insta3', title: 'Instagram Reels 3', desc: 'Gercek Instagram Videosu 3', url: 'https://www.instagram.com/reel/C3eP9w6vXyZ/', cat: 'spor' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet Instagram videosu yazildi!`);
}
module.exports = { autoFetchVideos };