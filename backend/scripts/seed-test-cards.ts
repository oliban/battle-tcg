import { dbStore } from '../src/data/dbStore';
import { Card, Ability } from '../src/models/types';

// Helper function to generate random stats
const getRandomStat = (min: number = 1, max: number = 10): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to get random ability
const getRandomAbility = (): Ability => {
  const abilities: Ability[] = ['strength', 'speed', 'agility'];
  return abilities[Math.floor(Math.random() * abilities.length)];
};

// Helper function to get random rarity
const getRandomRarity = (): 'common' | 'uncommon' | 'rare' => {
  const rarities: ('common' | 'uncommon' | 'rare')[] = ['common', 'uncommon', 'rare'];
  const weights = [0.6, 0.3, 0.1]; // 60% common, 30% uncommon, 10% rare
  const random = Math.random();

  if (random < weights[0]) return rarities[0];
  if (random < weights[0] + weights[1]) return rarities[1];
  return rarities[2];
};

// Test card names and descriptions
const cardNames = [
  { name: 'Fire Dragon', description: 'A mighty dragon that breathes fire' },
  { name: 'Ice Wizard', description: 'Master of frost magic' },
  { name: 'Thunder Knight', description: 'Warrior blessed by lightning' },
  { name: 'Shadow Assassin', description: 'Silent and deadly' },
  { name: 'Earth Guardian', description: 'Protector of nature' },
  { name: 'Wind Dancer', description: 'Swift as the breeze' },
  { name: 'Crystal Golem', description: 'Made of pure crystal' },
  { name: 'Phoenix Warrior', description: 'Reborn from ashes' },
  { name: 'Void Walker', description: 'Travels between dimensions' },
  { name: 'Star Mage', description: 'Harnesses cosmic power' },
  { name: 'Ocean Titan', description: 'Lord of the seas' },
  { name: 'Forest Spirit', description: 'Guardian of the woods' },
  { name: 'Mountain King', description: 'Ruler of the peaks' },
  { name: 'Desert Nomad', description: 'Master of survival' },
  { name: 'Arctic Wolf', description: 'Hunter of the frozen lands' },
  { name: 'Lava Elemental', description: 'Born from volcanic fury' },
  { name: 'Storm Caller', description: 'Commands the weather' },
  { name: 'Mystic Oracle', description: 'Sees all futures' },
  { name: 'Battle Mech', description: 'Advanced war machine' },
  { name: 'Sky Pirate', description: 'Raider of the clouds' }
];

async function seedTestCards() {
  console.log('Starting to seed test cards...');

  // First, ensure we have a test player
  let testPlayer = dbStore.getPlayerByName('TestPlayer');
  if (!testPlayer) {
    console.log('Creating test player...');
    testPlayer = dbStore.createPlayer('TestPlayer');
  }

  const createdCards: Card[] = [];

  for (let i = 0; i < 20; i++) {
    const cardInfo = cardNames[i];
    const rarity = getRandomRarity();

    // Generate balanced stats based on rarity
    let statTotal = rarity === 'rare' ? 18 : rarity === 'uncommon' ? 15 : 12;
    const strength = getRandomStat(1, Math.min(10, statTotal - 2));
    statTotal -= strength;
    const speed = getRandomStat(1, Math.min(10, statTotal - 1));
    const agility = statTotal - speed;

    const card: Card = {
      id: `test_card_${Date.now()}_${i}`,
      name: cardInfo.name,
      description: cardInfo.description,
      imageUrl: `/images/test-card-${i}.png`, // Placeholder image
      abilities: {
        strength: Math.max(1, Math.min(10, strength)),
        speed: Math.max(1, Math.min(10, speed)),
        agility: Math.max(1, Math.min(10, agility))
      },
      rarity,
      createdAt: new Date(),
      createdBy: testPlayer.id,
      criticalHitChance: rarity === 'rare' ? 15 : rarity === 'uncommon' ? 10 : 5
    };

    try {
      const createdCard = dbStore.createCard(card);
      createdCards.push(createdCard);
      console.log(`Created card ${i + 1}/20: ${card.name} (${card.rarity}) - STR:${card.abilities.strength} SPD:${card.abilities.speed} AGI:${card.abilities.agility}`);
    } catch (error) {
      console.error(`Failed to create card ${card.name}:`, error);
    }
  }

  // Add cards to test player's inventory
  const cardIds = createdCards.map(c => c.id);
  const updatedPlayer = dbStore.updatePlayer(testPlayer.id, {
    cards: [...(testPlayer.cards || []), ...cardIds]
  });

  if (updatedPlayer) {
    console.log(`\nSuccessfully created ${createdCards.length} test cards and added them to TestPlayer's inventory.`);
    console.log(`TestPlayer now has ${updatedPlayer.cards.length} total cards.`);
  } else {
    console.error('Failed to update TestPlayer with new cards');
  }

  // Summary
  const commonCount = createdCards.filter(c => c.rarity === 'common').length;
  const uncommonCount = createdCards.filter(c => c.rarity === 'uncommon').length;
  const rareCount = createdCards.filter(c => c.rarity === 'rare').length;

  console.log('\nCard Distribution:');
  console.log(`Common: ${commonCount}`);
  console.log(`Uncommon: ${uncommonCount}`);
  console.log(`Rare: ${rareCount}`);

  process.exit(0);
}

// Run the seed script
seedTestCards().catch(error => {
  console.error('Error seeding test cards:', error);
  process.exit(1);
});