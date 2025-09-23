import axios from 'axios';
import { Player, Card, Battle, BattleRound, Pack, Ability } from '../types';

// Dynamically determine the API base URL
// If accessed from localhost, use localhost. Otherwise use the actual host
const getApiBase = () => {
  const hostname = window.location.hostname;
  // If we're on localhost, use localhost for API too
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  // Otherwise, use the same hostname for API calls
  return `http://${hostname}:8000/api`;
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const playerAPI = {
  register: async (name: string): Promise<{ player: Player; isNewPlayer: boolean }> => {
    const response = await api.post('/players/register', { name });
    return response.data;
  },

  getPlayer: async (id: string): Promise<Player> => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  getPlayerCards: async (id: string): Promise<Card[]> => {
    const response = await api.get(`/players/${id}/cards`);
    return response.data;
  },

  updateDeck: async (playerId: string, cardIds: string[]): Promise<Player> => {
    const response = await api.put(`/players/${playerId}/deck`, { cardIds });
    return response.data;
  },

  addCoins: async (playerId: string, amount: number = 1000): Promise<Player> => {
    const response = await api.post(`/players/${playerId}/add-coins`, { amount });
    return response.data;
  },
};

export const cardAPI = {
  previewStats: async (
    primaryAbility: Ability
  ): Promise<{ abilities: Record<Ability, number>; rarity: string }> => {
    const response = await api.post('/cards/preview-stats', {
      primaryAbility,
    });
    return response.data;
  },

  createCard: async (
    playerId: string,
    name: string,
    description: string,
    abilities: Record<Ability, number>,
    rarity: string,
    totalCost: number,
    imageUrl?: string
  ): Promise<{ card: Card; remainingCoins: number }> => {
    const response = await api.post('/cards/create', {
      playerId,
      name,
      description,
      abilities,
      rarity,
      totalCost,
      imageUrl,
    });
    return response.data;
  },

  getAllCards: async (): Promise<Card[]> => {
    const response = await api.get('/cards');
    return response.data;
  },

  getCard: async (id: string): Promise<Card> => {
    const response = await api.get(`/cards/${id}`);
    return response.data;
  },
};

export const battleAPI = {
  createBattle: async (
    player1Id: string,
    player2Id?: string,
    isSimulation: boolean = false
  ): Promise<Battle> => {
    const response = await api.post('/battles/create', {
      player1Id,
      player2Id: player2Id || 'ai',
      isSimulation,
    });
    return response.data;
  },

  setCardOrder: async (
    battleId: string,
    playerId: string,
    order: number[]
  ): Promise<Battle> => {
    const response = await api.post(`/battles/${battleId}/set-order`, {
      playerId,
      order,
    });
    return response.data;
  },

  executeBattle: async (
    battleId: string
  ): Promise<Battle> => {
    const response = await api.post(`/battles/${battleId}/execute`);
    return response.data;
  },

  getBattle: async (id: string): Promise<Battle> => {
    const response = await api.get(`/battles/${id}`);
    return response.data;
  },

  getPlayerBattles: async (playerId: string): Promise<Battle[]> => {
    const response = await api.get(`/battles/player/${playerId}`);
    return response.data;
  },
};

export const shopAPI = {
  getPacks: async (): Promise<Pack[]> => {
    const response = await api.get('/shop/packs');
    return response.data;
  },

  buyPack: async (
    playerId: string,
    packId: string
  ): Promise<{ cards: Card[]; remainingCoins: number }> => {
    const response = await api.post('/shop/buy-pack', {
      playerId,
      packId,
    });
    return response.data;
  },
};