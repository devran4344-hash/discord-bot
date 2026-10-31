const youtubedl = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadVideo(url) {
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  
  const fileName = `${uuidv4()}.mp4`;
  const filePath = path.join(tempDir, fileName);

  try {
    // Instagram videoyu en iyi kalitede indir
    await youtubedl(url, {
      output: filePath,
      format: 'mp4',
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });
    return filePath;
  } catch (error) {
    console.error('Indirme hatasi:', error);
    throw new Error('Video indirilemedi.');
  }
}

function deleteTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { downloadVideo, deleteTempFile };