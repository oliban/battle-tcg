import { gameDb } from '../data/database';

console.log('Clearing all cards from database...');

try {
  // Disable foreign key constraints temporarily
  gameDb.connection.prepare('PRAGMA foreign_keys = OFF').run();

  // Delete all battle cards first
  const battleCardsDeleted = gameDb.connection.prepare('DELETE FROM battle_cards').run();
  console.log(`Deleted ${battleCardsDeleted.changes} battle card entries`);

  // Delete all player cards
  const playerCardsDeleted = gameDb.connection.prepare('DELETE FROM player_cards').run();
  console.log(`Deleted ${playerCardsDeleted.changes} player card entries`);

  // Delete all deck entries
  const deckCardsDeleted = gameDb.connection.prepare('DELETE FROM player_decks').run();
  console.log(`Deleted ${deckCardsDeleted.changes} deck card entries`);

  // Delete all cards
  const cardsDeleted = gameDb.connection.prepare('DELETE FROM cards').run();
  console.log(`Deleted ${cardsDeleted.changes} cards`);

  // Re-enable foreign key constraints
  gameDb.connection.prepare('PRAGMA foreign_keys = ON').run();

  // Update all players to have empty card arrays
  const players = gameDb.connection.prepare('SELECT id FROM players').all();
  console.log(`Resetting ${players.length} player inventories...`);

  console.log('\n✅ Successfully cleared all cards from the database');
  console.log('Players will now have empty inventories and need to create or buy new cards.');

} catch (error) {
  console.error('Error clearing cards:', error);
  // Re-enable foreign key constraints even if there was an error
  gameDb.connection.prepare('PRAGMA foreign_keys = ON').run();
}