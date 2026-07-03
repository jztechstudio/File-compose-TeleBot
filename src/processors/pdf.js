const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { tempPath } = require('../fileUtils');

async function imageToPdf(inputPath) {
  // Normalize to JPEG first so pdf-lib can embed it reliably
  const jpegBuffer = await sharp(inputPath).jpeg({ quality: 85 }).toBuffer();

  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(jpegBuffer);
  const { width, height } = jpgImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(jpgImage, { x: 0, y: 0, width, height });

  const outputPath = tempPath('pdf');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

async function compressPdf(inputPath) {
  // pdf-lib re-save with object streams strips redundant data (best-effort compression;
  // for image-heavy PDFs, gains are limited without a raster re-encode pipeline).
  const existingBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(existingBytes, { ignoreEncryption: true });

  const outputPath = tempPath('pdf');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

module.exports = { imageToPdf, compressPdf };
