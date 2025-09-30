import { Player, Card, Battle, Pack, Notification, Challenge, Tool, PlayerTool } from '../models/types';
import { dbStore } from './dbStore';

// GameStore now delegates all operations to the database-backed store
class GameStore {
  createPlayer(name: string): Player {
    return dbStore.createPlayer(name);
  }

  getPlayer(id: string): Player | undefined {
    return dbStore.getPlayer(id);
  }

  getPlayerByName(name: string): Player | undefined {
    return dbStore.getPlayerByName(name);
  }

  updatePlayer(id: string, updates: Partial<Player>): Player | undefined {
    return dbStore.updatePlayer(id, updates);
  }

  createCard(card: Card): Card {
    return dbStore.createCard(card);
  }

  getCard(id: string): Card | undefined {
    return dbStore.getCard(id);
  }

  getAllCards(): Card[] {
    return dbStore.getAllCards();
  }

  getAllPlayers(): Player[] {
    return dbStore.getAllPlayers();
  }

  deleteCard(id: string): boolean {
    return dbStore.deleteCard(id);
  }

  getPlayerCards(playerId: string): Card[] {
    return dbStore.getPlayerCards(playerId);
  }

  createBattle(battle: Battle): Battle {
    return dbStore.createBattle(battle);
  }

  getBattle(id: string): Battle | undefined {
    return dbStore.getBattle(id);
  }

  updateBattle(id: string, updates: Partial<Battle>): Battle | undefined {
    return dbStore.updateBattle(id, updates);
  }

  getPlayerBattles(playerId: string): Battle[] {
    return dbStore.getPlayerBattles(playerId);
  }

  getPacks(): Pack[] {
    return dbStore.getPacks();
  }

  getPack(id: string): Pack | undefined {
    return dbStore.getPack(id);
  }

  getRandomCards(count: number, guaranteedRarity?: 'uncommon' | 'rare'): Card[] {
    return dbStore.getRandomCards(count, guaranteedRarity);
  }

  generatePackCards(packId: string): Card[] {
    return dbStore.generatePackCards(packId);
  }

  createChallenge(challenge: Partial<Challenge>): Challenge {
    return dbStore.createChallenge(challenge);
  }

  getChallenge(id: string): Challenge | undefined {
    return dbStore.getChallenge(id);
  }

  updateChallenge(id: string, updates: Partial<Challenge>): Challenge | undefined {
    return dbStore.updateChallenge(id, updates);
  }

  getPlayerChallenges(playerId: string): { incoming: Challenge[], outgoing: Challenge[] } {
    return dbStore.getPlayerChallenges(playerId);
  }

  getActiveChallenges(playerId: string): Challenge[] {
    return dbStore.getActiveChallenges(playerId);
  }

  sendNotification(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ): Notification {
    return dbStore.sendNotification(recipientId, type, title, message, data);
  }

  getNotifications(recipientId: string): Notification[] {
    return dbStore.getNotifications(recipientId);
  }

  markNotificationRead(id: string): void {
    dbStore.markNotificationRead(id);
  }

  markAllNotificationsRead(recipientId: string): void {
    dbStore.markAllNotificationsRead(recipientId);
  }

  // Alias methods for backward compatibility
  getPlayerNotifications(playerId: string): Notification[] {
    return dbStore.getPlayerNotifications(playerId);
  }

  getUnreadNotifications(playerId: string): Notification[] {
    return dbStore.getUnreadNotifications(playerId);
  }

  markNotificationAsRead(notificationId: string): boolean {
    return dbStore.markNotificationAsRead(notificationId);
  }

  markAllNotificationsAsRead(playerId: string): void {
    dbStore.markAllNotificationsAsRead(playerId);
  }

  deleteNotification(notificationId: string): boolean {
    return dbStore.deleteNotification(notificationId);
  }

  getLeaderboard(limit: number = 50): Player[] {
    return dbStore.getLeaderboard(limit);
  }

  // Tool methods
  getAllTools(): Tool[] {
    return dbStore.getAllTools();
  }

  getPlayerTools(playerId: string): PlayerTool[] {
    return dbStore.getPlayerTools(playerId);
  }

  givePlayerTool(playerId: string, toolId: string, quantity: number = 1): boolean {
    return dbStore.givePlayerTool(playerId, toolId, quantity);
  }

  applyToolToBattle(battleId: string, playerId: string, toolId: string, cardId: string, cardPosition: number): boolean {
    return dbStore.applyToolToBattle(battleId, playerId, toolId, cardId, cardPosition);
  }

  decreaseToolCooldowns(playerId: string): void {
    return dbStore.decreaseToolCooldowns(playerId);
  }

  setToolCooldown(playerId: string, toolId: string, cooldown: number): void {
    return dbStore.setToolCooldown(playerId, toolId, cooldown);
  }
}

export const gameStore = new GameStore();