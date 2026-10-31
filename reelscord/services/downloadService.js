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
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      console.log('[DEBUG] YouTube Shorts linki algilandi. YT-DLP ile indiriliyor...');
      await youtubedl(url, {
        output: filePath,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        noWarnings: true,
        noCheckCertificate: true,
        forceOverwrites: true
      });
      console.log('[DEBUG] YouTube indirmesi basarili.');
      return filePath;
    } 
    
    if (url.endsWith('.mp4') || url.includes('.mp4?')) {
      const response = await axios({ method: 'GET', url: url, responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      return filePath;
    }

    throw new Error('Bilinmeyen link formati');
  } catch (error) {
    console.error('Indirme hatasi:', error.message);
    throw new Error('Video indirilemedi.');
  }
}

function deleteTempFile(filePath) {
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
}
module.exports = { downloadVideo, deleteTempFile };