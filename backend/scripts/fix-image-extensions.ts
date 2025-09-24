import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../game.db');
const CARD_IMAGES_PATH = path.join(__dirname, '../card_images');

const db = new Database(DB_PATH);

console.log('Fixing image file extensions in database...');

// Get all image files from the directory
const imageFiles = fs.readdirSync(CARD_IMAGES_PATH);

// Create a map of base names to actual extensions
const imageMap = new Map<string, string>();

for (const file of imageFiles) {
  const ext = path.extname(file);
  const baseName = path.basename(file, ext);

  // Extract just the base UUID from files like "uuid_timestamp_random.ext"
  const baseId = baseName.split('_')[0];

  // Store the actual extension for this base ID
  if (!imageMap.has(baseId) || baseName === baseId) {
    // Prefer the base image (no underscore) over variants
    imageMap.set(baseId, file);
  }
}

console.log(`Found ${imageMap.size} unique base card images`);

// Update all cards to use correct extensions
let updateCount = 0;

for (const [baseId, actualFile] of imageMap) {
  // Update all cards that have this base ID to use the correct file
  const result = db.prepare(`
    UPDATE cards
    SET image_url = ?
    WHERE id LIKE ? || '_%' OR id = ?
  `).run(actualFile, baseId, baseId);

  if (result.changes > 0) {
    updateCount += result.changes;
    console.log(`Updated ${result.changes} cards with base ID ${baseId} to use ${actualFile}`);
  }
}

console.log(`\nTotal cards updated: ${updateCount}`);

// Clean up duplicate variant images with wrong extensions
console.log('\nCleaning up variant images...');

let deletedCount = 0;
for (const file of imageFiles) {
  // Skip base images
  if (!file.includes('_')) continue;

  // Delete variant images (they should use base image)
  try {
    fs.unlinkSync(path.join(CARD_IMAGES_PATH, file));
    console.log(`Deleted variant image: ${file}`);
    deletedCount++;
  } catch (error) {
    console.error(`Error deleting ${file}:`, error);
  }
}

console.log(`\nDeleted ${deletedCount} variant image files`);

db.close();
console.log('\nImage extension fix completed!');