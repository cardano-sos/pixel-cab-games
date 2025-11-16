#!/usr/bin/env node
/**
 * Move 100x100 images to images-100, then resize originals to 200x200
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const IMAGES_DIR = path.join(process.cwd(), 'images', 'nfts', 'images');
const IMAGES_100_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-100');
const ORIGINAL_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-original');

// Target size for new images
const TARGET_SIZE = 200;

async function main() {
  console.log('NFT Image Resizer - 200x200');
  console.log('='.repeat(60));

  // Step 1: Move current images (100x100) to images-100
  console.log('\n📁 Step 1: Moving 100x100 images to images-100/');
  if (fs.existsSync(IMAGES_100_DIR)) {
    console.log('⚠️  images-100 directory already exists, skipping move...');
  } else {
    console.log(`Moving ${IMAGES_DIR} → ${IMAGES_100_DIR}`);
    fs.renameSync(IMAGES_DIR, IMAGES_100_DIR);
    console.log('✅ Moved successfully');
  }

  // Step 2: Create new images directory
  console.log('\n📁 Step 2: Creating new images/ directory');
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log('✅ Created images/ directory');
  }

  // Step 3: Resize originals to 200x200
  console.log(`\n🔄 Step 3: Resizing images-original/ to ${TARGET_SIZE}x${TARGET_SIZE}`);

  const pngFiles = fs.readdirSync(ORIGINAL_DIR)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('.png', ''));
      const numB = parseInt(b.replace('.png', ''));
      return numA - numB;
    });

  const totalFiles = pngFiles.length;
  console.log(`Found ${totalFiles} PNG files to resize\n`);

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const filename = pngFiles[i];
    const inputPath = path.join(ORIGINAL_DIR, filename);
    const outputPath = path.join(IMAGES_DIR, filename);

    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      await sharp(inputPath)
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .png({ compressionLevel: 9, quality: 80 })
        .toFile(outputPath);

      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;

      totalOriginal += originalSize;
      totalNew += newSize;
      processed++;

      if ((i + 1) % 100 === 0 || (i + 1) === totalFiles) {
        console.log(`Processed ${i + 1}/${totalFiles} images...`);
      }
    } catch (error) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`✅ Resized ${processed} images to ${TARGET_SIZE}x${TARGET_SIZE}`);
  console.log(`Original total size: ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`New total size: ${(totalNew / 1024).toFixed(1)} KB`);
  console.log(`Space saved: ${((totalOriginal - totalNew) / 1024).toFixed(1)} KB (${((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1)}%)`);
  console.log(`Average size per image: ${(totalNew / processed / 1024).toFixed(2)} KB`);
  console.log(`Estimated base64 size: ~${((totalNew / processed / 1024) * 1.37).toFixed(2)} KB per image`);
  console.log('='.repeat(60));
  console.log('\n📂 Directory structure:');
  console.log(`  - images-original/  (400x400 originals)`);
  console.log(`  - images-100/       (100x100 smaller versions)`);
  console.log(`  - images/           (200x200 NEW versions)`);
}

main().catch(console.error);
