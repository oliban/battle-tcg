import axios from 'axios';

// Dynamically determine the API base URL
const getApiBase = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api/tools';
  }
  return `http://${hostname}:8000/api/tools`;
};

const API_URL = getApiBase();

export interface Tool {
  id: string;
  name: string;
  description: string;
  effectType: 'stat_boost' | 'reveal_cards' | 'any_stat_boost';
  effectAbility?: 'strength' | 'speed' | 'agility' | 'any';
  effectValue?: number;
  cooldown: number;
  restriction?: 'challenger' | 'challengee' | null;
  imageUrl?: string;
}

export interface PlayerTool {
  playerId: string;
  toolId: string;
  quantity: number;
  lastUsedBattleId?: string;
  cooldownRemaining: number;
  acquiredAt: Date;
  tool?: Tool;
}

export const toolsAPI = {
  getAllTools: async (): Promise<Tool[]> => {
    const response = await axios.get(`${API_URL}`);
    return response.data;
  },

  getPlayerTools: async (playerId: string): Promise<PlayerTool[]> => {
    const response = await axios.get(`${API_URL}/player/${playerId}`);
    return response.data;
  },

  applyTool: async (
    battleId: string,
    playerId: string,
    toolId: string,
    cardId: string,
    cardPosition: number
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await axios.post(`${API_URL}/apply`, {
      battleId,
      playerId,
      toolId,
      cardId,
      cardPosition
    });
    return response.data;
  }
};