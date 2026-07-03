const sharp = require('sharp');
const { tempPath } = require('../fileUtils');

async function compressImage(inputPath, level = 'medium') {
  const qualityMap = { low: 40, medium: 65, high: 85 };
  const quality = qualityMap[level] || 65;

  const outputPath = tempPath('jpg');
  await sharp(inputPath)
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
}

async function convertImage(inputPath, format = 'png') {
  const outputPath = tempPath(format);
  let pipeline = sharp(inputPath);

  if (format === 'jpg' || format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: 90 });
  } else if (format === 'png') {
    pipeline = pipeline.png();
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 90 });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

async function resizeImage(inputPath, widthPercent = 50) {
  const metadata = await sharp(inputPath).metadata();
  const newWidth = Math.round((metadata.width * widthPercent) / 100);

  const outputPath = tempPath('jpg');
  await sharp(inputPath)
    .resize({ width: newWidth })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { compressImage, convertImage, resizeImage };
