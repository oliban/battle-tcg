import { GameState, Player, Card } from '../types';

const STORAGE_KEY = 'battle-card-game-state';

export const saveGameState = (state: GameState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
};

export const loadGameState = (): GameState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved);
    state.player.cards = state.player.cards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt)
    }));
    state.allCards = state.allCards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt)
    }));
    return state;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
};

export const createNewPlayer = (name: string): Player => {
  return {
    id: `player_${Date.now()}`,
    name,
    coins: 200,
    cards: [],
    deck: [],
    wins: 0,
    losses: 0
  };
};

export const getDefaultGameState = (playerName: string = 'Player'): GameState => {
  return {
    player: createNewPlayer(playerName),
    allCards: [],
    currentBattle: undefined,
    settings: {
      soundEnabled: true,
      autoSave: true
    }
  };
};