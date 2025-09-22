import { Card, Ability, Rarity } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;

export const generateCardStats = (primaryAbility: Ability): { abilities: Record<Ability, number>, rarity: Rarity } => {
  const abilities: Record<Ability, number> = {
    strength: 0,
    speed: 0,
    agility: 0
  };

  const randomRoll = Math.random();
  let totalPoints: number;
  let rarity: Rarity;

  if (randomRoll < 0.05) {
    totalPoints = 15;
    rarity = 'rare';
  } else if (randomRoll < 0.30) {
    totalPoints = Math.floor(Math.random() * 2) + 13;
    rarity = 'uncommon';
  } else {
    totalPoints = Math.floor(Math.random() * 3) + 10;
    rarity = 'common';
  }

  const primaryPoints = Math.floor(totalPoints * (0.4 + Math.random() * 0.3));
  abilities[primaryAbility] = primaryPoints;

  let remainingPoints = totalPoints - primaryPoints;
  const otherAbilities = (['strength', 'speed', 'agility'] as Ability[])
    .filter(a => a !== primaryAbility);

  const split = Math.random();
  abilities[otherAbilities[0]] = Math.floor(remainingPoints * split);
  abilities[otherAbilities[1]] = remainingPoints - abilities[otherAbilities[0]];

  return { abilities, rarity };
};

export const calculateBattleRound = (
  card1: Card,
  card2: Card,
  ability: Ability
) => {
  const player1Roll = rollD6();
  const player2Roll = rollD6();

  const player1Total = card1.abilities[ability] + player1Roll;
  const player2Total = card2.abilities[ability] + player2Roll;

  let winner: 'player1' | 'player2' | 'draw';
  if (player1Total > player2Total) {
    winner = 'player1';
  } else if (player2Total > player1Total) {
    winner = 'player2';
  } else {
    winner = 'draw';
  }

  return {
    player1Roll,
    player2Roll,
    player1Total,
    player2Total,
    winner
  };
};

export const selectRandomCards = <T>(items: T[], count: number): T[] => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, items.length));
};

export const selectRandomAbility = (): Ability => {
  const abilities: Ability[] = ['strength', 'speed', 'agility'];
  return abilities[Math.floor(Math.random() * abilities.length)];
};

export const generateCardId = (): string => {
  return uuidv4();
};

export const generatePlayerId = (): string => {
  return uuidv4();
};

// Card title system
const prefixTitles = [
  'Spinning fists', 'Archer Trainer', 'Ash-Skin', 'Bag-Head', 'Barrel-Scraper',
  'Beast Slayer', 'Black-Blade', 'Blade Master', 'Blade Sharpener', 'Blood-Lover',
  'Bone-Licker', 'Bone-Ripper', 'Brawler', 'Cannibal', 'Caragor Slayer',
  'Cave Rat', 'Corpse-Eater', 'Death-Blade', 'Deathbringer', 'Drooler',
  'Elf-Slayer', 'Evil Eye', 'Fat Head', 'Fire-Brander', 'Flesh-Render',
  'Foul-Spawn', 'Frog-Blood', 'Ghûl Slayer', 'Graug Catcher', 'Grog-Burner',
  'Halfling-Lover', 'Head-Chopper', 'Head-Hunter', 'Heart-Eater', 'Horn Blower',
  'Hot Tongs', 'Jaws', 'Learned Scribe', 'Life-Drinker', 'Limp-Leg',
  'Literate One', 'Long-Tooth', 'Lucky Shot', 'Mad-Eye', 'Maggot-Nest',
  'Man-Stalker', 'Meat Hooks', 'Metal-Beard', 'Night-Bringer', 'One-Eye',
  'Pit Fighter', 'Plague-Bringer', 'Pot-Licker', 'Quick-Blades', 'Rabble Rouser',
  'Raid Leader', 'Ranger-Killer', 'Ravager', 'Runny-bowels', 'Sawbones',
  'Scar-Artist', 'Shaman', 'Shield Master', 'Skull Bow', 'Skull-Cracker',
  'Slashface', 'Slave Taskmaster', 'Storm-Bringer', 'Sword Master', 'Thin Bones',
  'Thunderhead', 'Tree-Killer', 'Troll Slayer', 'Troll-Born', 'Ugly Face',
  'Who Flees'
];

const suffixTitles = [
  'the Hateful', 'of Lithlad', 'of the Spiders', 'the Advisor', 'the Assassin',
  'the Beheader', 'the Bitter', 'the Black', 'the Bleeder', 'the Bloated',
  'the Bone Collector', 'the Bowmaster', 'the Brander', 'the Brave', 'the Brewer',
  'the Brown', 'the Choker', 'the Chunky', 'the Claw', 'the Clever',
  'the Cook', 'the Corruptor', 'the Coward', 'the Crazy', 'the Dark',
  'the Defender', 'the Defiler', 'the Destroyer', 'the Devourer', 'the Diseased',
  'the Disgusting', 'the Drunk', 'the Endless', 'the Fanatical', 'the Flesh Glutton',
  'the Fool', 'the Friendly', 'the Gentle', 'the Gorger', 'the Grinder',
  'the Hacker', 'the Handsome', 'the Humiliator', 'the Hungry', 'the Immovable',
  'the Infernal', 'the Judge', 'the Killer', 'the Kin-Slayer', 'the Knife',
  'the Legend', 'the Loaded', 'the Lookout', 'the Mad', 'the Man-Eater',
  'the Meat Hoarder', 'the Merciful', 'the Messenger', 'the Mindless', 'the Mountain',
  'the Other Twin', 'the Poet', 'the Proud', 'the Puny', 'the Rash',
  'the Raven', 'the Red', 'the Ruinous', 'the Runner', 'the Runt',
  'the Savage', 'the Scholar', 'the Screamer', 'the Serpent', 'the Shadow',
  'the Shield', 'the Skinless', 'the Slasher', 'the Slaughterer', 'the Small',
  'the Smasher', 'the Spike', 'the Stout', 'the Surgeon', 'the Swift',
  'the Tongue', 'the Twin', 'the Unkillable', 'the Vile', 'the Wanderer',
  'the Watcher', 'the Whiner', 'the Wise', 'the Wrestler'
];

export const generateCardTitle = (): { title: string, isPrefix: boolean } => {
  // 50% chance for prefix, 50% for suffix
  const isPrefix = Math.random() < 0.5;

  if (isPrefix) {
    const title = prefixTitles[Math.floor(Math.random() * prefixTitles.length)];
    return { title, isPrefix: true };
  } else {
    const title = suffixTitles[Math.floor(Math.random() * suffixTitles.length)];
    return { title, isPrefix: false };
  }
};

export const applyTitleToCard = (card: Card): Card => {
  const { title, isPrefix } = generateCardTitle();

  // Generate modifiers: +2 to one random ability, -1 to another
  const abilities: Ability[] = ['strength', 'speed', 'agility'];
  const bonusAbility = abilities[Math.floor(Math.random() * abilities.length)];
  const remainingAbilities = abilities.filter(a => a !== bonusAbility);
  const penaltyAbility = remainingAbilities[Math.floor(Math.random() * remainingAbilities.length)];

  // Save base abilities
  const baseAbilities = { ...card.abilities };

  // Apply modifiers
  const modifiedAbilities = { ...card.abilities };
  modifiedAbilities[bonusAbility] = Math.max(0, modifiedAbilities[bonusAbility] + 2);
  modifiedAbilities[penaltyAbility] = Math.max(0, modifiedAbilities[penaltyAbility] - 1);

  // Generate full name
  const fullName = isPrefix
    ? `${title} ${card.name}`
    : `${card.name} ${title}`;

  return {
    ...card,
    title,
    fullName,
    abilities: modifiedAbilities,
    baseAbilities,
    titleModifiers: {
      strength: modifiedAbilities.strength - baseAbilities.strength,
      speed: modifiedAbilities.speed - baseAbilities.speed,
      agility: modifiedAbilities.agility - baseAbilities.agility
    }
  };
};