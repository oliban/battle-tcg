import { Player, Card, Battle, Pack, Notification, Challenge } from '../models/types';
import { fileStore } from './fileStore';

class GameStore {
  private players: Map<string, Player>;
  private cards: Map<string, Card>;
  private battles: Map<string, Battle>;
  private notifications: Map<string, Notification>;
  private challenges: Map<string, Challenge>;
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
    this.notifications = fileStore.loadNotifications();
    this.challenges = fileStore.loadChallenges();
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

  // Notification methods
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      read: false
    };
    this.notifications.set(newNotification.id, newNotification);
    fileStore.saveNotifications(this.notifications);
    return newNotification;
  }

  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  getPlayerNotifications(playerId: string): Notification[] {
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.recipientId === playerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Clean up expired notifications
    const now = new Date();
    return notifications.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);
  }

  getUnreadNotifications(playerId: string): Notification[] {
    return this.getPlayerNotifications(playerId).filter(n => !n.read);
  }

  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
      fileStore.saveNotifications(this.notifications);
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(playerId: string): void {
    const playerNotifications = this.getPlayerNotifications(playerId);
    playerNotifications.forEach(n => {
      n.read = true;
      this.notifications.set(n.id, n);
    });
    fileStore.saveNotifications(this.notifications);
  }

  deleteNotification(notificationId: string): boolean {
    const deleted = this.notifications.delete(notificationId);
    if (deleted) {
      fileStore.saveNotifications(this.notifications);
    }
    return deleted;
  }

  // Challenge methods
  createChallenge(challenge: Omit<Challenge, 'id' | 'createdAt' | 'expiresAt'>): Challenge {
    const newChallenge: Challenge = {
      ...challenge,
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      status: 'pending'
    };
    this.challenges.set(newChallenge.id, newChallenge);
    fileStore.saveChallenges(this.challenges);
    return newChallenge;
  }

  getChallenge(id: string): Challenge | undefined {
    return this.challenges.get(id);
  }

  updateChallenge(id: string, updates: Partial<Challenge>): Challenge | undefined {
    const challenge = this.challenges.get(id);
    if (!challenge) return undefined;

    const updated = { ...challenge, ...updates };
    this.challenges.set(id, updated);
    fileStore.saveChallenges(this.challenges);
    return updated;
  }

  getPlayerChallenges(playerId: string): {
    incoming: Challenge[];
    outgoing: Challenge[];
  } {
    const now = new Date();
    const challenges = Array.from(this.challenges.values())
      .filter(c => new Date(c.expiresAt) > now); // Filter expired

    return {
      incoming: challenges
        .filter(c => c.challengedId === playerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      outgoing: challenges
        .filter(c => c.challengerId === playerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  }

  getActiveChallenges(playerId: string): Challenge[] {
    const { incoming, outgoing } = this.getPlayerChallenges(playerId);
    return [...incoming, ...outgoing]
      .filter(c => c.status === 'pending' || c.status === 'accepted' || c.status === 'ready')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Helper method to send notifications
  sendNotification(
    recipientId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ): Notification {
    return this.createNotification({
      recipientId,
      type,
      title,
      message,
      data,
      read: false
    });
  }

  // Get leaderboard data
  getLeaderboard(limit: number = 50): Player[] {
    return Array.from(this.players.values())
      .sort((a, b) => {
        // Sort by rating if available, otherwise by PvP win rate
        if (a.rating && b.rating) {
          return b.rating - a.rating;
        }
        const aWinRate = (a.pvpWins || 0) / Math.max(1, (a.pvpWins || 0) + (a.pvpLosses || 0));
        const bWinRate = (b.pvpWins || 0) / Math.max(1, (b.pvpWins || 0) + (b.pvpLosses || 0));
        return bWinRate - aWinRate;
      })
      .slice(0, limit);
  }
}

export const gameStore = new GameStore();