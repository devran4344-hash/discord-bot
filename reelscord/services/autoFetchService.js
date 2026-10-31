const { db } = require('../firebase');

async function autoFetchVideos() {
  if (!db) { console.log('[DEBUG] Firebase yok, video eklenemedi.'); return; }
  
  console.log('[DEBUG] AutoFetch: Test videolari guncelleniyor (Garantili linkler)...');
  
  // %100 Calisan, engellenmeyen test videolari
  const videos = [
    { id: 'v1', title: 'Tavsan ve Kaplumbaga', desc: 'Komik bir cizgi film', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', cat: 'mizah' },
    { id: 'v2', title: 'Deniz Anasi', desc: 'Muhtesem doga goruntuleri', url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4', cat: 'spor' },
    { id: 'v3', title: 'Sintel', desc: 'Yeni cikan urun incelemesi', url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4', cat: 'teknoloji' },
    { id: 'v4', title: 'Celikten Gozyaslari', desc: 'En iyi kill', url: 'https://test-videos.co.uk/vids/tearsofsteel/mp4/h264/720/Tears_Of_Steel_720_10s_1MB.mp4', cat: 'oyun' }
  ];

  const batch = db.batch();
  for (const v of videos) {
    batch.set(db.collection('videos').doc(v.id), {
      title: v.title, description: v.desc, url: v.url, category: v.cat, createdAt: new Date().toISOString()
    }, { merge: true }); // Eskisinin uzerine yazar (olu linkleri temizler)
  }
  await batch.commit();
  console.log(`[DEBUG] AutoFetch: ${videos.length} adet garantili video Firestore'a yazildi!`);
}
module.exports = { autoFetchVideos };