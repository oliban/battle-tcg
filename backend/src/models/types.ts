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
  criticalHitChance?: number; // Percentage chance of critical hit (5-15%)
  createdAt: Date;
  createdBy: string;
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  cards: string[];
  deck: string[];
  tools?: PlayerTool[]; // Player's available tools
  wins: number; // Total wins (AI + PvP)
  losses: number; // Total losses (AI + PvP)
  pvpWins?: number; // PvP wins only
  pvpLosses?: number; // PvP losses only
  aiWins?: number; // AI wins only
  aiLosses?: number; // AI losses only
  rating?: number; // ELO-style rating for leaderboard
  lastActive?: Date;
}

export interface RewardType {
  id: string;
  name: string;
  description: string;
  category: 'voice' | 'card_back' | 'emote';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  metadata?: string; // JSON string with type-specific data
}

export interface PlayerReward {
  playerId: string;
  rewardId: string;
  unlockedAt: Date;
  source: 'initial' | 'battle_win' | 'achievement' | 'purchase';
}

export type ToolEffectType = 'stat_boost' | 'reveal_cards' | 'any_stat_boost';
export type ToolRestriction = 'challenger' | 'challengee' | null;

export interface Tool {
  id: string;
  name: string;
  description: string;
  effectType: ToolEffectType;
  effectAbility?: Ability | 'any'; // Which ability it affects
  effectValue?: number; // How much it boosts (e.g., +2)
  cooldown: number; // Number of battles before it can be used again
  restriction?: ToolRestriction; // Who can use this tool
  imageUrl?: string;
}

export interface PlayerTool {
  playerId: string;
  toolId: string;
  quantity: number;
  lastUsedBattleId?: string;
  cooldownRemaining: number;
  acquiredAt: Date;
}

export interface BattleToolUsage {
  battleId: string;
  playerId: string;
  toolId: string;
  cardId: string;
  cardPosition: number; // 0-2
}

export interface Battle {
  id: string;
  player1Id: string;
  player2Id: string | null;
  player1Name?: string;
  player2Name?: string;
  isSimulation: boolean; // True for AI battles
  player1Deck: string[]; // Full deck of 10 cards
  player2Deck: string[]; // Full deck of 10 cards
  player1Cards: string[]; // 3 randomly selected cards for battle
  player2Cards: string[]; // 3 randomly selected cards for battle
  player1Order?: number[]; // Order indices [0,1,2] in desired play order
  player2Order?: number[]; // Order indices [0,1,2] in desired play order
  firstRoundAbility?: Ability; // The ability that will be used in round 1
  player1ToolUsage?: BattleToolUsage[]; // Tools applied by player 1
  player2ToolUsage?: BattleToolUsage[]; // Tools applied by player 2
  rounds: BattleRound[];
  currentRound: number;
  player1Points: number;
  player2Points: number;
  player1TotalDamage: number; // For tiebreaker
  player2TotalDamage: number; // For tiebreaker
  winner?: string | null;
  winReason?: 'points' | 'damage' | 'coin-toss';
  status: 'waiting-for-selection' | 'waiting-for-order' | 'ready' | 'in-progress' | 'completed';
  toolUsages?: BattleToolUsage[];
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
  player1StatValue: number; // Card's stat value for the chosen ability (including tool bonus)
  player2StatValue: number; // Card's stat value for the chosen ability (including tool bonus)
  player1BaseStatValue?: number; // Base stat value before tool bonus
  player2BaseStatValue?: number; // Base stat value before tool bonus
  player1ToolBonus?: number; // Tool bonus applied
  player2ToolBonus?: number; // Tool bonus applied
  player1ToolName?: string; // Name of tool applied
  player2ToolName?: string; // Name of tool applied
  player1Total: number; // Stat + roll
  player2Total: number; // Stat + roll
  player1CriticalHit?: boolean; // Whether player1 landed a critical hit
  player2CriticalHit?: boolean; // Whether player2 landed a critical hit
  damageDealt: number; // Difference between totals (doubled on critical hit)
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
  | 'reward_earned'
  | 'system_message';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Type-specific data (challengeId, battleId, etc.)
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string | null; // Can be null for AI challenges
  challengedName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'ready' | 'completed';
  challengerCards?: string[];
  challengerOrder?: number[];
  challengerTools?: { [position: number]: string }; // Tools assigned by challenger
  challengedCards?: string[];
  challengedOrder?: number[];
  challengedTools?: { [position: number]: string }; // Tools assigned by defender
  battleId?: string;
  isAI?: boolean; // Flag to indicate if this is an AI challenge
  firstRoundAbility: Ability; // The ability that will be used in round 1
  createdAt: Date;
  expiresAt: Date;
}