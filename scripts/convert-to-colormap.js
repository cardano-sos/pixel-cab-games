#!/usr/bin/env node
/**
 * Convert 400x400 originals from RGBA to 8-bit colormap (indexed color)
 * This reduces file size without changing resolution
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const ORIGINAL_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-original');
const BACKUP_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-original-rgba');

async function convertToColormap(inputPath, outputPath) {
  try {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    // Convert to indexed color (colormap) with optimization
    await sharp(inputPath)
      .png({
        palette: true,           // Use indexed color palette
        colors: 256,             // Maximum 256 colors
        compressionLevel: 9,     // Maximum compression
        quality: 100             // Maximum quality
      })
      .toFile(outputPath + '.tmp');

    // Replace original with converted
    fs.renameSync(outputPath + '.tmp', outputPath);

    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;

    return { originalSize, newSize };
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Convert 400x400 Originals to 8-bit Colormap');
  console.log('='.repeat(60));

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }

  // Get all PNG files
  const pngFiles = fs.readdirSync(ORIGINAL_DIR)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('.png', ''));
      const numB = parseInt(b.replace('.png', ''));
      return numA - numB;
    });

  const totalFiles = pngFiles.length;

  if (totalFiles === 0) {
    console.log(`No PNG files found in ${ORIGINAL_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${totalFiles} PNG files to convert`);
  console.log(`Converting from RGBA to 8-bit colormap (indexed color)`);
  console.log(`Backing up originals to: ${BACKUP_DIR}`);
  console.log();

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const filename = pngFiles[i];
    const inputPath = path.join(ORIGINAL_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    // Backup original RGBA version if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
    }

    // Convert to colormap
    const result = await convertToColormap(inputPath, inputPath);

    if (result) {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      processed++;

      if ((i + 1) % 100 === 0 || (i + 1) === totalFiles) {
        console.log(`Processed ${i + 1}/${totalFiles} images...`);
      }
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`✅ Converted ${processed} images to 8-bit colormap`);
  console.log(`Original total size (RGBA): ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`New total size (colormap): ${(totalNew / 1024).toFixed(1)} KB`);
  console.log(`Space saved: ${((totalOriginal - totalNew) / 1024).toFixed(1)} KB (${((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1)}%)`);
  console.log(`Average size per image: ${(totalNew / processed / 1024).toFixed(2)} KB (was ${(totalOriginal / processed / 1024).toFixed(2)} KB)`);
  console.log('='.repeat(60));
  console.log('\n📂 Backups saved to: images-original-rgba/');
  console.log('💡 Resolution unchanged: 400x400');
  console.log('🎨 Color mode: RGBA → 8-bit colormap (indexed)');
}

main().catch(console.error);
