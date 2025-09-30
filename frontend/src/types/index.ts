export type Ability = 'strength' | 'speed' | 'agility';
export type Rarity = 'common' | 'uncommon' | 'rare';
export type CardType = 'battle' | 'tool';

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
  criticalHitChance?: number; // Percentage chance of critical hit (5-15%)
  cardType?: CardType; // Type of card (battle or tool)
  toolId?: string; // Reference to tool (for tool cards)
  createdAt: string;
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
  pvpWins?: number;
  pvpLosses?: number;
  rating?: number;
  lastActive?: string;
}

export interface BattleToolUsage {
  playerId: string;
  toolId: string;
  cardId: string;
  cardPosition: number;
}

export interface Battle {
  id: string;
  player1Id: string;
  player2Id: string | null;
  player1Name?: string;
  player2Name?: string;
  isSimulation: boolean;
  player1Deck: string[];
  player2Deck: string[];
  player1Cards: string[];
  player2Cards: string[];
  player1Order?: number[];
  player2Order?: number[];
  rounds: BattleRound[];
  currentRound: number;
  player1Points: number;
  player2Points: number;
  player1TotalDamage: number;
  player2TotalDamage: number;
  winner?: string;
  winReason?: 'points' | 'damage' | 'coin-toss';
  status: 'waiting-for-selection' | 'waiting-for-order' | 'ready' | 'in-progress' | 'completed';
  toolUsages?: BattleToolUsage[];
  firstRoundAbility?: Ability;
  createdAt: string;
  completedAt?: string;
  player1CardDetails?: Card[];
  player2CardDetails?: Card[];
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
  player1StatValue: number;  // Total stat (base + tool)
  player2StatValue: number;  // Total stat (base + tool)
  player1BaseStatValue?: number; // Base stat before tools
  player2BaseStatValue?: number; // Base stat before tools
  player1ToolBonus?: number; // Tool bonus applied
  player2ToolBonus?: number; // Tool bonus applied
  player1ToolName?: string; // Name of tool applied
  player2ToolName?: string; // Name of tool applied
  player1Total: number;
  player2Total: number;
  player1CriticalHit?: boolean; // Whether player1 landed a critical hit
  player2CriticalHit?: boolean; // Whether player2 landed a critical hit
  damageDealt: number;
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

export type NotificationType =
  | 'challenge_received'
  | 'challenge_accepted'
  | 'challenge_declined'
  | 'battle_complete'
  | 'system_message'
  | 'achievement'
  | 'reward';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string | null;
  challengedName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'ready' | 'completed';
  challengerCards?: string[];
  challengerOrder?: number[];
  challengedCards?: string[];
  challengedOrder?: number[];
  battleId?: string;
  isAI?: boolean;
  firstRoundAbility: Ability;
  createdAt: string;
  expiresAt: string;
}