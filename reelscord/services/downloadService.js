const youtubedl = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

async function downloadVideo(url) {
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  
  const fileName = `${uuidv4()}.mp4`;
  const filePath = path.join(tempDir, fileName);

  try {
    // 1. DURUM: Link direkt bir MP4 ise (Ornek: Google Test videolari)
    if (url.endsWith('.mp4') || url.includes('.mp4?')) {
      console.log('[DEBUG] Direkt MP4 linki algilandi. Axios ile indiriliyor...');
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      console.log('[DEBUG] Direkt indirme basarili.');
      return filePath;
    } 
    
    // 2. DURUM: Link Instagram/Reddit/TikTok ise (yt-dlp gerekir)
    else {
      console.log('[DEBUG] Platform linki algilandi. yt-dlp ile indiriliyor...');
      await youtubedl(url, {
        output: filePath,
        format: 'mp4',
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        forceOverwrites: true
        // Eski ve hata veren parametreler silindi
      });
      console.log('[DEBUG] yt-dlp indirmesi basarili.');
      return filePath;
    }
  } catch (error) {
    console.error('Indirme hatasi:', error.message);
    throw new Error('Video indirilemedi.');
  }
}

function deleteTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { downloadVideo, deleteTempFile };