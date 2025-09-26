import { gameDb } from '../data/database';
import { gameStore } from '../data/store';

console.log('Starting removal of seeded cards...');

// Get all cards
const allCards = gameStore.getAllCards();
console.log(`Found ${allCards.length} total cards in database`);

// Get all players to check which cards are owned
const allPlayers = gameStore.getAllPlayers();
const ownedCardIds = new Set<string>();

// Collect all card IDs that are owned by players
allPlayers.forEach(player => {
  player.cards.forEach(cardId => {
    ownedCardIds.add(cardId);
  });
});

console.log(`Found ${ownedCardIds.size} cards owned by players`);

// Find cards that are not owned by any player (seeded cards)
const seededCards = allCards.filter(card => !ownedCardIds.has(card.id));
console.log(`Found ${seededCards.length} seeded cards to remove`);

// First, clean up any references to these cards in battles
console.log('Cleaning up battle references...');
seededCards.forEach(card => {
  // Remove from battle_cards table
  try {
    gameDb.connection.prepare('DELETE FROM battle_cards WHERE card_id = ?').run(card.id);
  } catch (err) {
    console.error(`Failed to remove battle references for card ${card.id}:`, err);
  }
});

// Remove each seeded card
let removedCount = 0;
let failedCount = 0;
seededCards.forEach(card => {
  console.log(`Removing seeded card: ${card.name} (${card.id})`);
  try {
    if (gameStore.deleteCard(card.id)) {
      removedCount++;
    } else {
      failedCount++;
    }
  } catch (err) {
    console.error(`Failed to remove card ${card.id}:`, err);
    failedCount++;
  }
});

console.log(`\n✅ Successfully removed ${removedCount} seeded cards`);
if (failedCount > 0) {
  console.log(`⚠️  Failed to remove ${failedCount} cards`);
}
console.log(`Remaining cards in database: ${gameStore.getAllCards().length}`);