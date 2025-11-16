#!/usr/bin/env node
/**
 * Reorganize and convert images:
 * 1. Rename images-100 → images-100-colormap
 * 2. Move images (200x200) → images-200-colormap
 * 3. Convert originals (400x400) from RGBA to 8-bit colormap → images
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const IMAGES_DIR = path.join(process.cwd(), 'images', 'nfts', 'images');
const IMAGES_100_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-100');
const IMAGES_100_COLORMAP_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-100-colormap');
const IMAGES_200_COLORMAP_DIR = path.join(process.cwd(), 'images', 'nfts', 'images-200-colormap');
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
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;

    return { originalSize, newSize };
  } catch (error) {
    console.error(`Error processing ${path.basename(inputPath)}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Convert 400x400 Originals to 8-bit Colormap');
  console.log('='.repeat(60));

  // Step 1: Rename images-100 → images-100-colormap
  console.log('\n📁 Step 1: Renaming images-100 → images-100-colormap');
  if (fs.existsSync(IMAGES_100_DIR)) {
    if (fs.existsSync(IMAGES_100_COLORMAP_DIR)) {
      console.log('⚠️  images-100-colormap already exists, skipping...');
    } else {
      fs.renameSync(IMAGES_100_DIR, IMAGES_100_COLORMAP_DIR);
      console.log('✅ Renamed successfully');
    }
  } else {
    console.log('⚠️  images-100 not found, skipping...');
  }

  // Step 2: Move images (200x200) → images-200-colormap
  console.log('\n📁 Step 2: Moving images (200x200) → images-200-colormap');
  if (fs.existsSync(IMAGES_DIR)) {
    if (fs.existsSync(IMAGES_200_COLORMAP_DIR)) {
      console.log('⚠️  images-200-colormap already exists, removing old images/...');
      fs.rmSync(IMAGES_DIR, { recursive: true, force: true });
    } else {
      fs.renameSync(IMAGES_DIR, IMAGES_200_COLORMAP_DIR);
      console.log('✅ Moved successfully');
    }
  }

  // Step 3: Create new images directory
  console.log('\n📁 Step 3: Creating new images/ directory');
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log('✅ Created images/ directory');
  }

  // Step 4: Create backup directory for RGBA originals
  console.log('\n📁 Step 4: Creating backup directory for RGBA originals');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✅ Created backup directory');
  }

  // Step 5: Convert originals from RGBA to 8-bit colormap
  console.log('\n🎨 Step 5: Converting 400x400 originals from RGBA → 8-bit colormap');

  const pngFiles = fs.readdirSync(ORIGINAL_DIR)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('.png', ''));
      const numB = parseInt(b.replace('.png', ''));
      return numA - numB;
    });

  const totalFiles = pngFiles.length;
  console.log(`Found ${totalFiles} PNG files to convert\n`);

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const filename = pngFiles[i];
    const inputPath = path.join(ORIGINAL_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    const outputPath = path.join(IMAGES_DIR, filename);

    // Backup original RGBA version if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
    }

    // Convert to colormap and save to new images/
    const result = await convertToColormap(inputPath, outputPath);

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
  console.log('\n📂 Final directory structure:');
  console.log('  - images-original-rgba/    (400x400 RGBA backups)');
  console.log('  - images-original/         (400x400 RGBA - unchanged)');
  console.log('  - images-100-colormap/     (100x100 indexed color)');
  console.log('  - images-200-colormap/     (200x200 indexed color)');
  console.log('  - images/                  (400x400 indexed color - ACTIVE)');
}

main().catch(console.error);
