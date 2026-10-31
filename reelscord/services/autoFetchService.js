const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok, video eklenemedi.'); return; }
  
  console.log('[DEBUG] AutoFetch: Veritabani kontrol ediliyor...');
  const snapshot = await db.collection('videos').limit(1).get();
  if (!snapshot.empty) {
    console.log('[DEBUG] AutoFetch: Veritabaninda zaten videolar var, islem iptal.');
    return;
  }

  console.log('[DEBUG] AutoFetch: Hic video yok! Instagram/Reels tarzi videolar otomatik ekleniyor...');
  
  // Garantili calisan yuksek kaliteli test videolari (Instagram engeline takilmamak icin)
  const videos = [
    { id: 'v1', title: 'Komik An', desc: 'Insta Reels tarzi video', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', cat: 'mizah' },
    { id: 'v2', title: 'Spor Hareketi', desc: 'Muhtesem bir spor ani', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', cat: 'spor' },
    { id: 'v3', title: 'Teknoloji Incelemesi', desc: 'Yeni cikan urun', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', cat: 'teknoloji' },
    { id: 'v4', title: 'Oyun Zamani', desc: 'En iyi kill', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', cat: 'oyun' },
    { id: 'v5', title: 'Gizemli Olay', desc: 'Ilginc bir an', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', cat: 'diger' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet video basariyla Firestore'a eklendi!`);
}
module.exports = { autoFetchVideos };