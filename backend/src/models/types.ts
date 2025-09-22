export type Ability = 'strength' | 'speed' | 'agility';
export type Rarity = 'common' | 'uncommon' | 'rare';

export interface Card {
  id: string;
  name: string;
  title?: string; // Special title like "the Destroyer" or "Spinning fists"
  fullName?: string; // Combined title + name for display
  description: string;
  imageUrl?: string;
  abilities: {
    strength: number;
    speed: number;
    agility: number;
  };
  baseAbilities?: { // Original abilities before title modifiers
    strength: number;
    speed: number;
    agility: number;
  };
  titleModifiers?: { // Stat modifiers from title
    strength: number;
    speed: number;
    agility: number;
  };
  rarity: Rarity;
  createdAt: Date;
  createdBy: string;
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  cards: string[];
  deck: string[];
  wins: number;
  losses: number;
}

export interface Battle {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name?: string;
  player2Name?: string;
  isSimulation: boolean; // True for AI battles
  player1Deck: string[]; // Full deck of 10 cards
  player2Deck: string[]; // Full deck of 10 cards
  player1Cards: string[]; // 3 randomly selected cards for battle
  player2Cards: string[]; // 3 randomly selected cards for battle
  player1Order?: number[]; // Order indices [0,1,2] in desired play order
  player2Order?: number[]; // Order indices [0,1,2] in desired play order
  rounds: BattleRound[];
  currentRound: number;
  player1Points: number;
  player2Points: number;
  player1TotalDamage: number; // For tiebreaker
  player2TotalDamage: number; // For tiebreaker
  winner?: string;
  winReason?: 'points' | 'damage' | 'coin-toss';
  status: 'waiting-for-selection' | 'waiting-for-order' | 'ready' | 'in-progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface BattleRound {
  roundNumber: number;
  player1CardId: string;
  player2CardId: string;
  player1CardName?: string;
  player2CardName?: string;
  ability: Ability;
  player1Roll: number;
  player2Roll: number;
  player1StatValue: number; // Card's stat value for the chosen ability
  player2StatValue: number; // Card's stat value for the chosen ability
  player1Total: number; // Stat + roll
  player2Total: number; // Stat + roll
  damageDealt: number; // Difference between totals
  winner: 'player1' | 'player2' | 'draw';
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: number;
  cardCount: number;
  guaranteedRarity?: Rarity;
}