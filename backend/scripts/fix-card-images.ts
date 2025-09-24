import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../game.db');
const CARD_IMAGES_PATH = path.join(__dirname, '../card_images');

const db = new Database(DB_PATH);

console.log('Starting card image fix...');

interface CardRow {
  id: string;
  name: string;
  title?: string;
  image_url?: string;
}

// Get all cards with variant IDs (containing underscore and timestamp)
const variantCards = db.prepare<CardRow[]>(`
  SELECT id, name, title, image_url
  FROM cards
  WHERE id LIKE '%_%'
  AND id GLOB '*_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*'
`).all() as CardRow[];

console.log(`Found ${variantCards.length} variant cards to fix`);

let fixedCount = 0;
let errorCount = 0;

// Update each variant to use the base card's image
for (const card of variantCards) {
  try {
    // Extract base card ID from variant ID
    const baseCardId = card.id.split('_')[0];

    // Get the base card to verify it exists
    const baseCard = db.prepare('SELECT image_url FROM cards WHERE id = ?').get(baseCardId) as { image_url?: string } | undefined;

    if (baseCard) {
      // Use the base card's image filename
      const baseImageFilename = baseCard.image_url || `${baseCardId}.png`;

      // Update the variant to use the base card's image
      db.prepare('UPDATE cards SET image_url = ? WHERE id = ?').run(
        baseImageFilename.includes('.png') ? baseImageFilename : `${baseCardId}.png`,
        card.id
      );

      console.log(`Fixed ${card.name} ${card.title || ''} (${card.id}) -> ${baseCardId}.png`);
      fixedCount++;
    } else {
      // If base card doesn't exist, just ensure it points to baseCardId.png
      db.prepare('UPDATE cards SET image_url = ? WHERE id = ?').run(
        `${baseCardId}.png`,
        card.id
      );

      console.log(`Fixed ${card.name} ${card.title || ''} (${card.id}) -> ${baseCardId}.png (base card not found)`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`Error fixing card ${card.id}:`, error);
    errorCount++;
  }
}

console.log(`\nFixed ${fixedCount} cards`);
if (errorCount > 0) {
  console.log(`Encountered ${errorCount} errors`);
}

// Now clean up duplicate image files
console.log('\n\nCleaning up duplicate image files...');

const imageFiles = fs.readdirSync(CARD_IMAGES_PATH);
let deletedFiles = 0;
const baseCardImages = new Set<string>();
const duplicateImages: string[] = [];

// First pass: identify base card images
for (const file of imageFiles) {
  // Base card images have format: UUID.png (no underscores with timestamps)
  if (file.match(/^[a-f0-9-]{36}\.png$/i)) {
    baseCardImages.add(file);
  }
}

console.log(`Found ${baseCardImages.size} base card images`);

// Second pass: identify and delete duplicate variant images
for (const file of imageFiles) {
  // Skip if it's a base card image
  if (baseCardImages.has(file)) continue;

  // If it contains underscore and timestamp pattern, it's a duplicate variant image
  if (file.match(/.*_\d{13}_.*\.png$/)) {
    duplicateImages.push(file);
  }
}

console.log(`Found ${duplicateImages.length} duplicate variant images to delete`);

// Delete duplicate images
for (const file of duplicateImages) {
  try {
    const filePath = path.join(CARD_IMAGES_PATH, file);
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${file}`);
    deletedFiles++;
  } catch (error) {
    console.error(`Error deleting ${file}:`, error);
  }
}

console.log(`\nDeleted ${deletedFiles} duplicate image files`);

db.close();
console.log('\nCard image fix completed!');