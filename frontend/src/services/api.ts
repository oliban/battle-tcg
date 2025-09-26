import axios from 'axios';
import { Player, Card, Battle, BattleRound, Pack, Ability, Notification, Challenge } from '../types';

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

export const notificationAPI = {
  getNotifications: async (playerId: string): Promise<Notification[]> => {
    const response = await api.get(`/notifications/${playerId}`);
    return response.data;
  },

  getUnreadNotifications: async (playerId: string): Promise<{ count: number; notifications: Notification[] }> => {
    const response = await api.get(`/notifications/${playerId}/unread`);
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (playerId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/notifications/${playerId}/read-all`);
    return response.data;
  },

  deleteNotification: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};

export const challengeAPI = {
  getAvailablePlayers: async (): Promise<Array<{
    id: string;
    name: string;
    wins: number;
    losses: number;
    rating: number;
    lastActive?: string;
  }>> => {
    const response = await api.get('/challenges/players');
    return response.data;
  },

  getPlayerChallenges: async (playerId: string): Promise<Challenge[]> => {
    const response = await api.get(`/challenges/player/${playerId}`);
    return response.data;
  },

  getActiveChallenges: async (playerId: string): Promise<Challenge[]> => {
    const response = await api.get(`/challenges/active/${playerId}`);
    return response.data;
  },

  createChallenge: async (challengerId: string, challengedId: string): Promise<Challenge> => {
    const response = await api.post('/challenges/create', {
      challengerId,
      challengedId,
    });
    return response.data;
  },

  createAIChallenge: async (challengerId: string): Promise<Challenge> => {
    const response = await api.post('/challenges/create-ai', {
      challengerId,
    });
    return response.data;
  },

  setupChallenge: async (challengeId: string, cards: string[], order: number[]): Promise<Challenge | { challenge: Challenge; battle: Battle }> => {
    const response = await api.post(`/challenges/${challengeId}/setup`, {
      cards,
      order,
    });
    return response.data;
  },

  acceptChallenge: async (challengeId: string, playerId: string): Promise<Challenge> => {
    const response = await api.post(`/challenges/${challengeId}/accept`, {
      playerId,
    });
    return response.data;
  },

  setupDefense: async (challengeId: string, cards: string[], order: number[]): Promise<{
    challenge: Challenge;
    battle: Battle;
  }> => {
    const response = await api.post(`/challenges/${challengeId}/setup-defense`, {
      cards,
      order,
    });
    return response.data;
  },

  declineChallenge: async (challengeId: string, playerId: string): Promise<Challenge> => {
    const response = await api.post(`/challenges/${challengeId}/decline`, {
      playerId,
    });
    return response.data;
  },
};

export const leaderboardAPI = {
  getLeaderboard: async (limit?: number): Promise<Array<{
    rank: number;
    id: string;
    name: string;
    rating: number;
    pvpWins: number;
    pvpLosses: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    lastActive?: string;
  }>> => {
    const response = await api.get('/leaderboard', {
      params: { limit },
    });
    return response.data;
  },

  getPlayerRank: async (playerId: string): Promise<{
    rank: number;
    id: string;
    name: string;
    rating: number;
    pvpWins: number;
    pvpLosses: number;
    totalPlayers: number;
  }> => {
    const response = await api.get(`/leaderboard/player/${playerId}`);
    return response.data;
  },
};