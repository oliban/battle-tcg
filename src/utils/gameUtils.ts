import { Card, Ability, Rarity } from '../types';

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
): { player1Total: number, player2Total: number, winner: 'player1' | 'player2' | 'draw' } => {
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

  return { player1Total, player2Total, winner };
};

export const selectRandomCards = (deck: Card[], count: number): Card[] => {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const generateCardId = (): string => {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculatePackCards = (allCards: Card[], guaranteedRarity?: Rarity): Card[] => {
  if (allCards.length === 0) return [];

  const packCards: Card[] = [];
  const cardCount = 5;

  if (guaranteedRarity) {
    const rarityCards = allCards.filter(c =>
      c.rarity === guaranteedRarity ||
      (guaranteedRarity === 'uncommon' && c.rarity === 'rare')
    );
    if (rarityCards.length > 0) {
      packCards.push(rarityCards[Math.floor(Math.random() * rarityCards.length)]);
    }
  }

  while (packCards.length < cardCount && allCards.length > 0) {
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    if (!packCards.find(c => c.id === randomCard.id)) {
      packCards.push(randomCard);
    }
  }

  return packCards;
};