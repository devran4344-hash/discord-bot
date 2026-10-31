require('dotenv').config();
const { db } = require('../firebase');
const https = require('https');

async function fetchAll() {
  if (!db) { console.error('Firebase yok.'); process.exit(1); }
  
  let addedCount = 0;
  const batch = db.batch();

  // 1. GARANTİLİ TEST VİDEOLARI (Botun indirme sistemini hemen test etmek için)
  console.log('[SYSTEM] Test videolari ekleniyor...');
  const testVideos = [
    {
      id: 'test_video_1',
      title: 'Guaranteed Test Video 1',
      description: 'Bu videoyu goruyorsan indirme sistemi calisiyor demektir!',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      category: 'teknoloji',
      createdAt: new Date().toISOString()
    },
    {
      id: 'test_video_2',
      title: 'Guaranteed Test Video 2',
      description: 'Harika bir test videosu daha.',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      category: 'mizah',
      createdAt: new Date().toISOString()
    }
  ];

  for (const v of testVideos) {
    batch.set(db.collection('videos').doc(v.id), v, { merge: true });
    addedCount++;
  }

  // 2. REDDIT'TEN OTOMATİK ÇEKME
  const subreddits = { 'mizah': 'funny', 'oyun': 'gaming', 'teknoloji': 'technology', 'spor': 'sports' };

  for (const [category, sub] of Object.entries(subreddits)) {
    console.log(`[SYSTEM] Reddit r/${sub} cekiliyor...`);
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
          headers: { 'User-Agent': 'Mozilla/5.0 ReelsCord/1.0' }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({data:{children:[]}}); } });
        }).on('error', () => resolve({data:{children:[]}}));
      });

      if (data && data.data && data.data.children) {
        for (const post of data.data.children) {
          const p = post.data;
          if (p.is_video && p.media && p.media.reddit_video) {
            const url = p.media.reddit_video.fallback_url;
            const id = `reddit_${p.id}`;
            batch.set(db.collection('videos').doc(id), {
              title: p.title.substring(0, 100),
              description: `Reddit r/${sub} otomatik.`,
              url: url,
              category: category,
              createdAt: new Date().toISOString()
            }, { merge: true });
            addedCount++;
          }
        }
      }
    } catch (e) { console.log(`[HATA] ${sub} atlandi.`); }
  }

  await batch.commit();
  console.log(`[SYSTEM] BASARILI! Toplam ${addedCount} video veritabanina eklendi.`);
  process.exit(0);
}

fetchAll();