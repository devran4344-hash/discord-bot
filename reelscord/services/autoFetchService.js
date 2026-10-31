const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok.'); return; }
  
  console.log('[DEBUG] AutoFetch: Eski videolar temizleniyor...');
  
  const oldVideos = await db.collection('videos').get();
  const deleteBatch = db.batch();
  oldVideos.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();
  
  console.log('[DEBUG] AutoFetch: GitHub uzerinden garantili test videolari ekleniyor...');
  
  // %100 Calisan, GitHub tarafindan engellenmeyen Raw videolar
  const videos = [
    { id: 'gh1', title: 'Tavsan ve Kaplumbaga', desc: 'GitHub Raw Test Videosu', url: 'https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4', cat: 'mizah' },
    { id: 'gh2', title: 'Arac Tanima', desc: 'Intel Test Videosu', url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4', cat: 'teknoloji' },
    { id: 'gh3', title: 'Yuz Tanima', desc: 'Intel Test Videosu 2', url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/head-pose-face-detection-female.mp4', cat: 'oyun' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet garantili video yazildi!`);
}
module.exports = { autoFetchVideos };