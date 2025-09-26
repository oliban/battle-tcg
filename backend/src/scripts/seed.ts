import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../game.db'));

// Test cards data
const testCards = [
  { name: 'Fire Dragon', description: 'A mighty dragon that breathes fire', strength: 8, speed: 4, agility: 6, rarity: 'rare', criticalHitChance: 15 },
  { name: 'Ice Wizard', description: 'A wizard who controls ice magic', strength: 3, speed: 6, agility: 7, rarity: 'rare', criticalHitChance: 12 },
  { name: 'Lightning Bolt', description: 'Fast as lightning', strength: 5, speed: 9, agility: 5, rarity: 'uncommon', criticalHitChance: 10 },
  { name: 'Stone Golem', description: 'Made of solid rock', strength: 10, speed: 2, agility: 3, rarity: 'uncommon', criticalHitChance: 5 },
  { name: 'Shadow Assassin', description: 'Strikes from the shadows', strength: 6, speed: 7, agility: 8, rarity: 'rare', criticalHitChance: 18 },
  { name: 'Forest Archer', description: 'Expert marksman from the forest', strength: 4, speed: 6, agility: 8, rarity: 'common', criticalHitChance: 8 },
  { name: 'Mountain Giant', description: 'Huge and powerful', strength: 9, speed: 3, agility: 4, rarity: 'uncommon', criticalHitChance: 7 },
  { name: 'Wind Dancer', description: 'Graceful and swift', strength: 3, speed: 8, agility: 9, rarity: 'uncommon', criticalHitChance: 11 },
  { name: 'Flame Knight', description: 'A knight with burning armor', strength: 7, speed: 5, agility: 5, rarity: 'common', criticalHitChance: 9 },
  { name: 'Ocean Titan', description: 'Master of the seas', strength: 8, speed: 4, agility: 6, rarity: 'rare', criticalHitChance: 13 },
  { name: 'Desert Scout', description: 'Agile warrior of the sands', strength: 5, speed: 7, agility: 7, rarity: 'common', criticalHitChance: 8 },
  { name: 'Frost Bear', description: 'A bear from the frozen north', strength: 8, speed: 4, agility: 5, rarity: 'uncommon', criticalHitChance: 10 },
  { name: 'Thunder Mage', description: 'Wielder of thunder magic', strength: 4, speed: 6, agility: 7, rarity: 'rare', criticalHitChance: 14 },
  { name: 'Rock Crusher', description: 'Breaks through any defense', strength: 9, speed: 3, agility: 4, rarity: 'common', criticalHitChance: 6 },
  { name: 'Mystic Owl', description: 'Wise and mysterious', strength: 3, speed: 7, agility: 8, rarity: 'uncommon', criticalHitChance: 12 },
  { name: 'Battle Warrior', description: 'Veteran of many battles', strength: 7, speed: 5, agility: 6, rarity: 'common', criticalHitChance: 9 },
  { name: 'Storm Rider', description: 'Rides the storm winds', strength: 5, speed: 8, agility: 7, rarity: 'uncommon', criticalHitChance: 11 },
  { name: 'Earth Guardian', description: 'Protector of nature', strength: 8, speed: 3, agility: 5, rarity: 'rare', criticalHitChance: 8 },
  { name: 'Swift Blade', description: 'Master swordsman', strength: 6, speed: 8, agility: 7, rarity: 'uncommon', criticalHitChance: 13 },
  { name: 'Dark Sorcerer', description: 'Master of dark arts', strength: 5, speed: 6, agility: 8, rarity: 'rare', criticalHitChance: 15 }
];

// Insert test cards
const insertCard = db.prepare(`
  INSERT INTO cards (
    id, name, description, strength, speed, agility,
    base_strength, base_speed, base_agility,
    rarity, critical_hit_chance, created_at
  ) VALUES (
    @id, @name, @description, @strength, @speed, @agility,
    @strength, @speed, @agility,
    @rarity, @criticalHitChance, CURRENT_TIMESTAMP
  )
`);

console.log('Seeding database with test cards...');

// Clear existing test cards
db.exec(`DELETE FROM cards WHERE id LIKE 'test_card_%'`);

// Insert new test cards
let inserted = 0;
for (let i = 0; i < testCards.length; i++) {
  const card = testCards[i];
  try {
    insertCard.run({
      id: `test_card_${i + 1}`,
      name: card.name,
      description: card.description,
      strength: card.strength,
      speed: card.speed,
      agility: card.agility,
      rarity: card.rarity,
      criticalHitChance: card.criticalHitChance
    });
    inserted++;
    console.log(`✓ Added ${card.name}`);
  } catch (error) {
    console.error(`✗ Failed to add ${card.name}:`, error);
  }
}

console.log(`\nSuccessfully inserted ${inserted} test cards!`);

// Show card count
const result = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
console.log(`Total cards in database: ${result.count}`);

db.close();