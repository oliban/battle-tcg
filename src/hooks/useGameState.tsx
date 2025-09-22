import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameState, Card, Player } from '../types';
import { saveGameState, loadGameState, getDefaultGameState } from '../utils/storage';

interface GameContextType {
  gameState: GameState;
  updatePlayer: (player: Partial<Player>) => void;
  addCard: (card: Card) => void;
  updateDeck: (deck: Card[]) => void;
  spendCoins: (amount: number) => boolean;
  addCoins: (amount: number) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGameState();
    return saved || getDefaultGameState();
  });

  useEffect(() => {
    if (gameState.settings.autoSave) {
      saveGameState(gameState);
    }
  }, [gameState]);

  const updatePlayer = (updates: Partial<Player>) => {
    setGameState(prev => ({
      ...prev,
      player: { ...prev.player, ...updates }
    }));
  };

  const addCard = (card: Card) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        cards: [...prev.player.cards, card]
      },
      allCards: [...prev.allCards, card]
    }));
  };

  const updateDeck = (deck: Card[]) => {
    setGameState(prev => ({
      ...prev,
      player: { ...prev.player, deck }
    }));
  };

  const spendCoins = (amount: number): boolean => {
    if (gameState.player.coins >= amount) {
      updatePlayer({ coins: gameState.player.coins - amount });
      return true;
    }
    return false;
  };

  const addCoins = (amount: number) => {
    updatePlayer({ coins: gameState.player.coins + amount });
  };

  const resetGame = () => {
    const newState = getDefaultGameState(gameState.player.name);
    setGameState(newState);
    saveGameState(newState);
  };

  return (
    <GameContext.Provider value={{
      gameState,
      updatePlayer,
      addCard,
      updateDeck,
      spendCoins,
      addCoins,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};