export type Ability = 'strength' | 'speed' | 'agility';

export type Rarity = 'common' | 'uncommon' | 'rare';

export interface Card {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imageData?: string;
  abilities: {
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
  cards: Card[];
  deck: Card[];
  wins: number;
  losses: number;
}

export interface Battle {
  id: string;
  player1: {
    cards: Card[];
    selectedOrder?: number[];
    points: number;
  };
  player2: {
    cards: Card[];
    selectedOrder?: number[];
    points: number;
  };
  currentRound: number;
  rounds: BattleRound[];
  winner?: 'player1' | 'player2' | 'draw';
  betAmount: number;
}

export interface BattleRound {
  player1Card: Card;
  player2Card: Card;
  ability: Ability;
  player1Roll: number;
  player2Roll: number;
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

export interface GameState {
  player: Player;
  allCards: Card[];
  currentBattle?: Battle;
  settings: {
    soundEnabled: boolean;
    autoSave: boolean;
  };
}