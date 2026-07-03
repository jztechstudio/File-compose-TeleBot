const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function tempPath(ext) {
  const id = crypto.randomBytes(8).toString('hex');
  return path.join(TEMP_DIR, `${id}${ext ? '.' + ext : ''}`);
}

async function downloadTelegramFile(bot, fileId, ext) {
  const fileLink = await bot.getFileLink(fileId);
  const res = await fetch(fileLink);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);

  const outputPath = tempPath(ext);
  const buffer = await res.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function cleanupFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Cleanup error:', err.message);
  });
}

function fileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

module.exports = { tempPath, downloadTelegramFile, cleanupFile, fileSizeMB, TEMP_DIR };
