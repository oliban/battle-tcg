import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const DB_PATH = path.join(__dirname, '../game.db');
const CARD_IMAGES_PATH = path.join(__dirname, '../card_images');

const db = new Database(DB_PATH);

async function convertImagesToPNG() {
  console.log('Converting all card images to PNG format...');

  const imageFiles = fs.readdirSync(CARD_IMAGES_PATH);
  let convertedCount = 0;
  let skippedCount = 0;
  const processedBaseIds = new Set<string>();

  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);

    // Skip variant images (they should use base image)
    if (baseName.includes('_')) {
      try {
        fs.unlinkSync(path.join(CARD_IMAGES_PATH, file));
        console.log(`Deleted variant image: ${file}`);
      } catch (error) {
        console.error(`Error deleting variant ${file}:`, error);
      }
      continue;
    }

    // Extract just the base UUID
    const baseId = baseName;

    if (ext === '.png') {
      skippedCount++;
      processedBaseIds.add(baseId);
      continue;
    }

    // Convert non-PNG images to PNG
    if (['.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
      try {
        const inputPath = path.join(CARD_IMAGES_PATH, file);
        const outputPath = path.join(CARD_IMAGES_PATH, `${baseId}.png`);

        await sharp(inputPath)
          .png()
          .toFile(outputPath);

        // Delete the original file
        fs.unlinkSync(inputPath);

        console.log(`Converted ${file} to ${baseId}.png`);
        convertedCount++;
        processedBaseIds.add(baseId);
      } catch (error) {
        console.error(`Error converting ${file}:`, error);
      }
    }
  }

  console.log(`\nConverted ${convertedCount} images to PNG`);
  console.log(`Skipped ${skippedCount} images already in PNG format`);

  // Update all database entries to use .png extension
  console.log('\nUpdating database entries...');

  let dbUpdateCount = 0;
  for (const baseId of processedBaseIds) {
    // Update all cards (base and variants) to use the base PNG image
    const result = db.prepare(`
      UPDATE cards
      SET image_url = ?
      WHERE id = ? OR id LIKE ? || '_%'
    `).run(`${baseId}.png`, baseId, baseId);

    if (result.changes > 0) {
      dbUpdateCount += result.changes;
      console.log(`Updated ${result.changes} cards with base ID ${baseId}`);
    }
  }

  console.log(`\nUpdated ${dbUpdateCount} database entries to use PNG format`);
}

convertImagesToPNG()
  .then(() => {
    db.close();
    console.log('\nImage conversion completed!');
  })
  .catch(error => {
    console.error('Error during conversion:', error);
    db.close();
  });