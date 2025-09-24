import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.join(__dirname, '../game.db');
const db = new Database(dbPath);
const imagesDir = path.join(__dirname, '../card_images');

// Get all variant cards (those with underscores in their IDs)
const variantCards = db.prepare(`
  SELECT id, image_url FROM cards
  WHERE id LIKE '%_%'
`).all() as { id: string, image_url: string | null }[];

console.log(`Found ${variantCards.length} variant cards to check`);

let fixedCount = 0;

for (const card of variantCards) {
  // Extract base card ID (everything before first underscore)
  const baseCardId = card.id.split('_')[0];

  // Check which image file exists for this base card
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  let foundExtension: string | null = null;

  for (const ext of extensions) {
    const filePath = path.join(imagesDir, `${baseCardId}.${ext}`);
    if (fs.existsSync(filePath)) {
      foundExtension = ext;
      break;
    }
  }

  if (foundExtension) {
    const correctImageFileName = `${baseCardId}.${foundExtension}`;

    if (card.image_url !== correctImageFileName) {
      // Update the database
      db.prepare(`
        UPDATE cards SET image_url = ? WHERE id = ?
      `).run(correctImageFileName, card.id);

      console.log(`Fixed ${card.id}: ${card.image_url} -> ${correctImageFileName}`);
      fixedCount++;
    }
  } else {
    console.log(`Warning: No image found for base card ${baseCardId}`);
  }
}

console.log(`\nFixed ${fixedCount} variant card image URLs`);

db.close();