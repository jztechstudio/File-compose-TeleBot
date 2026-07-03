const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { tempPath } = require('../fileUtils');

ffmpeg.setFfmpegPath(ffmpegPath);

const presets = {
  low: { crf: 32, scale: '640:-2' }, // smallest file
  medium: { crf: 28, scale: '854:-2' },
  high: { crf: 24, scale: '1280:-2' },
};

function compressVideo(inputPath, level = 'medium') {
  const { crf, scale } = presets[level] || presets.medium;
  const outputPath = tempPath('mp4');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([`-crf ${crf}`, '-preset veryfast', `-vf scale=${scale}`])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

function extractAudio(inputPath) {
  const outputPath = tempPath('mp3');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

module.exports = { compressVideo, extractAudio };
