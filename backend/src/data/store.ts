import { Player, Card, Battle, Pack } from '../models/types';
import { fileStore } from './fileStore';

class GameStore {
  private players: Map<string, Player>;
  private cards: Map<string, Card>;
  private battles: Map<string, Battle>;
  private packs: Pack[] = [
    {
      id: 'basic-pack',
      name: 'Basic Pack',
      description: '5 random cards from the community pool',
      price: 100,
      cardCount: 5
    },
    {
      id: 'premium-pack',
      name: 'Premium Pack',
      description: '5 cards with guaranteed uncommon or better',
      price: 250,
      cardCount: 5,
      guaranteedRarity: 'uncommon'
    }
  ];

  constructor() {
    // Load existing data from files
    this.players = fileStore.loadPlayers();
    this.cards = fileStore.loadCards();
    this.battles = fileStore.loadBattles();
  }

  private saveData() {
    fileStore.savePlayers(this.players);
    fileStore.saveCards(this.cards);
    fileStore.saveBattles(this.battles);
  }

  private savePlayers() {
    fileStore.savePlayers(this.players);
  }

  private saveCards() {
    fileStore.saveCards(this.cards);
  }

  private saveBattles() {
    fileStore.saveBattles(this.battles);
  }

  createPlayer(name: string): Player {
    const player: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      coins: 200,
      cards: [],
      deck: [],
      wins: 0,
      losses: 0
    };
    this.players.set(player.id, player);
    this.saveData();
    return player;
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getPlayerByName(name: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) {
        return player;
      }
    }
    return undefined;
  }

  updatePlayer(id: string, updates: Partial<Player>): Player | undefined {
    const player = this.players.get(id);
    if (!player) return undefined;

    console.log('[Store] Updating player:', id);
    const updated = { ...player, ...updates };
    this.players.set(id, updated);
    console.log('[Store] Saving players to file...');
    this.savePlayers();
    console.log('[Store] Players saved successfully');
    return updated;
  }

  createCard(card: Card): Card {
    console.log('[Store] Adding card to store:', card.id);
    this.cards.set(card.id, card);
    console.log('[Store] Saving cards to file...');
    this.saveCards();
    console.log('[Store] Cards saved successfully');
    return card;
  }

  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }

  getAllCards(): Card[] {
    return Array.from(this.cards.values());
  }

  deleteCard(id: string): boolean {
    const deleted = this.cards.delete(id);
    if (deleted) {
      this.saveCards();
    }
    return deleted;
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayerCards(playerId: string): Card[] {
    const player = this.players.get(playerId);
    if (!player) return [];

    return player.cards
      .map(cardId => this.cards.get(cardId))
      .filter((card): card is Card => card !== undefined);
  }

  createBattle(battle: Battle): Battle {
    this.battles.set(battle.id, battle);
    this.saveData();
    return battle;
  }

  getBattle(id: string): Battle | undefined {
    return this.battles.get(id);
  }

  updateBattle(id: string, updates: Partial<Battle>): Battle | undefined {
    const battle = this.battles.get(id);
    if (!battle) return undefined;

    const updated = { ...battle, ...updates };
    this.battles.set(id, updated);
    this.saveData();
    return updated;
  }

  getActiveBattles(): Battle[] {
    return Array.from(this.battles.values())
      .filter(b => b.status !== 'completed');
  }

  getPlayerBattles(playerId: string): Battle[] {
    return Array.from(this.battles.values())
      .filter(b => b.player1Id === playerId || b.player2Id === playerId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Sort by most recent first
      });
  }

  getPacks(): Pack[] {
    return this.packs;
  }

  getPack(id: string): Pack | undefined {
    return this.packs.find(p => p.id === id);
  }

  generatePackCards(packId: string): Card[] {
    const pack = this.getPack(packId);
    if (!pack) return [];

    const allCards = this.getAllCards();
    if (allCards.length === 0) return [];

    const packCards: Card[] = [];
    const availableCards = [...allCards];

    if (pack.guaranteedRarity) {
      const rarityCards = availableCards.filter(c => {
        if (pack.guaranteedRarity === 'rare') return c.rarity === 'rare';
        if (pack.guaranteedRarity === 'uncommon') return c.rarity === 'uncommon' || c.rarity === 'rare';
        return true;
      });

      if (rarityCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * rarityCards.length);
        packCards.push(rarityCards[randomIndex]);
      }
    }

    while (packCards.length < pack.cardCount && availableCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      packCards.push(availableCards[randomIndex]);
    }

    return packCards;
  }
}

export const gameStore = new GameStore();