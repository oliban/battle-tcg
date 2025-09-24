import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(__dirname, '../game.db');
const db = new Database(dbPath);

// Disable foreign key constraints temporarily for cleanup
db.pragma('foreign_keys = OFF');

// Begin transaction for safety
const transaction = db.transaction(() => {
  // Find all cards with invalid stats based on their rarity
  const allCards = db.prepare(`
    SELECT id, name, full_name, strength, speed, agility, rarity, created_by
    FROM cards
  `).all() as any[];

  const corruptedCards: any[] = [];
  const playersToUpdate = new Set<string>();

  for (const card of allCards) {
    const total = card.strength + card.speed + card.agility;
    let isCorrupted = false;

    // Check if stats match rarity constraints
    if (card.rarity === 'rare' && total !== 15) {
      isCorrupted = true;
    } else if (card.rarity === 'uncommon' && (total < 13 || total > 14)) {
      isCorrupted = true;
    } else if (card.rarity === 'common' && (total < 10 || total > 12)) {
      isCorrupted = true;
    }

    // Check for zero stats (shouldn't happen)
    if (card.strength === 0 || card.speed === 0 || card.agility === 0) {
      isCorrupted = true;
    }

    // Check for extremely long IDs (multi-generation variants)
    const underscoreCount = (card.id.match(/_/g) || []).length;
    if (underscoreCount > 2) {
      isCorrupted = true;
    }

    if (isCorrupted) {
      corruptedCards.push(card);
      if (card.created_by) {
        playersToUpdate.add(card.created_by);
      }
    }
  }

  console.log(`Found ${corruptedCards.length} corrupted cards to remove`);

  if (corruptedCards.length > 0) {
    // First, clean up all references to corrupted cards
    let totalRemoved = 0;

    for (const card of corruptedCards) {
      // Remove from player_cards
      const r1 = db.prepare(`DELETE FROM player_cards WHERE card_id = ?`).run(card.id);
      totalRemoved += r1.changes;

      // Remove from player_decks
      const r2 = db.prepare(`DELETE FROM player_decks WHERE card_id = ?`).run(card.id);
      totalRemoved += r2.changes;

      // Remove from battle_cards
      const r3 = db.prepare(`DELETE FROM battle_cards WHERE card_id = ?`).run(card.id);
      totalRemoved += r3.changes;

      // Remove from challenge_cards
      const r4 = db.prepare(`DELETE FROM challenge_cards WHERE card_id = ?`).run(card.id);
      totalRemoved += r4.changes;
    }

    console.log(`Removed ${totalRemoved} card references from related tables`);

    // Now delete the corrupted cards themselves
    for (const card of corruptedCards) {
      db.prepare(`DELETE FROM cards WHERE id = ?`).run(card.id);
      console.log(`Deleted corrupted card: ${card.full_name || card.name} (ID: ${card.id}, Total: ${card.strength + card.speed + card.agility})`);
    }

    console.log(`\nSuccessfully cleaned up ${corruptedCards.length} corrupted cards`);
  } else {
    console.log('No corrupted cards found!');
  }
});

// Run the cleanup
try {
  transaction();
  console.log('\nDatabase cleanup completed successfully');
} catch (error) {
  console.error('Error during cleanup:', error);
}

// Re-enable foreign key constraints
db.pragma('foreign_keys = ON');

db.close();