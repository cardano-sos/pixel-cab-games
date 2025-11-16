#!/usr/bin/env node
/**
 * Resize NFT images to fit within Cardano transaction limits.
 * Target: 100x100 pixels with optimized PNG compression
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const IMAGES_DIR = path.join(process.cwd(), 'images', 'nfts', 'images');
const BACKUP_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-original');

// Target size (100x100 should result in ~2-3KB base64)
const TARGET_SIZE = 100;

async function resizeImage(inputPath, outputPath) {
  try {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    await sharp(inputPath)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .png({ compressionLevel: 9, quality: 80 })
      .toFile(outputPath + '.tmp');

    // Replace original with resized
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
  console.log('NFT Image Resizer');
  console.log('='.repeat(60));

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }

  // Get all PNG files
  const pngFiles = fs.readdirSync(IMAGES_DIR)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('.png', ''));
      const numB = parseInt(b.replace('.png', ''));
      return numA - numB;
    });

  const totalFiles = pngFiles.length;

  if (totalFiles === 0) {
    console.log(`No PNG files found in ${IMAGES_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${totalFiles} PNG files to resize`);
  console.log(`Target size: ${TARGET_SIZE}x${TARGET_SIZE} pixels`);
  console.log(`Backing up originals to: ${BACKUP_DIR}`);
  console.log();

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const filename = pngFiles[i];
    const inputPath = path.join(IMAGES_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    // Backup original if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
    }

    // Resize
    const result = await resizeImage(inputPath, inputPath);

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
  console.log(`✅ Resized ${processed} images`);
  console.log(`Original total size: ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`New total size: ${(totalNew / 1024).toFixed(1)} KB`);
  console.log(`Space saved: ${((totalOriginal - totalNew) / 1024).toFixed(1)} KB (${((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1)}%)`);
  console.log(`Average size per image: ${(totalNew / processed / 1024).toFixed(2)} KB`);
  console.log(`Estimated base64 size: ~${((totalNew / processed / 1024) * 1.37).toFixed(2)} KB per image`);
  console.log('='.repeat(60));
}

main().catch(console.error);
