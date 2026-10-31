require('dotenv').config();
const { db } = require('../firebase');
const https = require('https');

// Reddit'ten kategorilere gore kisa videolari ceken fonksiyon
async function fetchRedditVideos() {
  const subreddits = {
    'mizah': 'funny',
    'oyun': 'gaming',
    'teknoloji': 'technology',
    'spor': 'sports',
    'muzik': 'Music',
    'ilginc': 'nextfuckinglevel'
  };

  let addedCount = 0;

  for (const [category, sub] of Object.entries(subreddits)) {
    console.log(`[SYSTEM] ${sub} kanalindan videolar cekiliyor...`);
    
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReelsCordBot/1.0' }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });

      const posts = data.data.children;
      let batch = db.batch();

      for (const post of posts) {
        const p = post.data;
        // Sadece video olanlari al (Reddit native video veya dogrudan mp4)
        if (p.is_video && p.media && p.media.reddit_video) {
          const url = p.media.reddit_video.fallback_url; // Direkt mp4 linki
          const id = `reddit_${p.id}`;
          
          const videoDoc = {
            title: p.title.substring(0, 100),
            description: `Reddit r/${sub} tarafindan otomatik eklendi.`,
            url: url,
            category: category,
            createdAt: new Date().toISOString()
          };

          const ref = db.collection('videos').doc(id);
          batch.set(ref, videoDoc, { merge: true });
          addedCount++;
        }
      }
      
      await batch.commit();
    } catch (e) {
      console.error(`[HATA] ${sub} cekilemedi:`, e.message);
    }
  }

  console.log(`[SYSTEM] BASARILI! Toplam ${addedCount} yeni video Firebase'e eklendi.`);
  process.exit(0);
}

fetchRedditVideos();