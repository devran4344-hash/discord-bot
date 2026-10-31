const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok.'); return; }
  
  console.log('[DEBUG] AutoFetch: Eski videolar temizleniyor...');
  const oldVideos = await db.collection('videos').get();
  const deleteBatch = db.batch();
  oldVideos.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();
  
  console.log('[DEBUG] AutoFetch: YouTube Shorts (Reels tarzi) videolar ekleniyor...');
  
  // YouTube Shorts Linkleri (yt-dlp bunlari asla engellemez)
  const videos = [
    { id: 'yt1', title: 'Ilginc Video 1', desc: 'YouTube Shorts Test', url: 'https://www.youtube.com/shorts/6I5vT5D8r3s', cat: 'mizah' },
    { id: 'yt2', title: 'Ilginc Video 2', desc: 'YouTube Shorts Test 2', url: 'https://www.youtube.com/shorts/1G4isv_Fylg', cat: 'teknoloji' },
    { id: 'yt3', title: 'Ilginc Video 3', desc: 'YouTube Shorts Test 3', url: 'https://www.youtube.com/shorts/tPEE9ZwTmy0', cat: 'spor' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet video yazildi!`);
}
module.exports = { autoFetchVideos };