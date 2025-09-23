import fs from 'fs';
import path from 'path';
import { Player, Card, Battle, Notification, Challenge } from '../models/types';

const DATA_DIR = path.join(__dirname, '../../data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const BATTLES_FILE = path.join(DATA_DIR, 'battles.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const CHALLENGES_FILE = path.join(DATA_DIR, 'challenges.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class FileStore {
  private ensureFile(filePath: string, defaultData: any = {}) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  private readJSON<T>(filePath: string): T {
    this.ensureFile(filePath);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  private writeJSON(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // Players
  loadPlayers(): Map<string, Player> {
    const players = this.readJSON<Record<string, Player>>(PLAYERS_FILE);
    return new Map(Object.entries(players));
  }

  savePlayers(players: Map<string, Player>) {
    const obj = Object.fromEntries(players);
    this.writeJSON(PLAYERS_FILE, obj);
  }

  // Cards
  loadCards(): Map<string, Card> {
    const cards = this.readJSON<Record<string, Card>>(CARDS_FILE);
    const map = new Map<string, Card>();

    // Convert date strings back to Date objects
    for (const [id, card] of Object.entries(cards)) {
      map.set(id, {
        ...card,
        createdAt: new Date(card.createdAt)
      });
    }

    return map;
  }

  saveCards(cards: Map<string, Card>) {
    const obj = Object.fromEntries(cards);
    this.writeJSON(CARDS_FILE, obj);
  }

  // Battles
  loadBattles(): Map<string, Battle> {
    const battles = this.readJSON<Record<string, Battle>>(BATTLES_FILE);
    return new Map(Object.entries(battles));
  }

  saveBattles(battles: Map<string, Battle>) {
    const obj = Object.fromEntries(battles);
    this.writeJSON(BATTLES_FILE, obj);
  }

  // Notifications
  loadNotifications(): Map<string, Notification> {
    const notifications = this.readJSON<Record<string, Notification>>(NOTIFICATIONS_FILE);
    const map = new Map<string, Notification>();

    // Convert date strings back to Date objects
    for (const [id, notification] of Object.entries(notifications)) {
      map.set(id, {
        ...notification,
        createdAt: new Date(notification.createdAt),
        expiresAt: notification.expiresAt ? new Date(notification.expiresAt) : undefined
      });
    }

    return map;
  }

  saveNotifications(notifications: Map<string, Notification>) {
    const obj = Object.fromEntries(notifications);
    this.writeJSON(NOTIFICATIONS_FILE, obj);
  }

  // Challenges
  loadChallenges(): Map<string, Challenge> {
    const challenges = this.readJSON<Record<string, Challenge>>(CHALLENGES_FILE);
    const map = new Map<string, Challenge>();

    // Convert date strings back to Date objects
    for (const [id, challenge] of Object.entries(challenges)) {
      map.set(id, {
        ...challenge,
        createdAt: new Date(challenge.createdAt),
        expiresAt: new Date(challenge.expiresAt)
      });
    }

    return map;
  }

  saveChallenges(challenges: Map<string, Challenge>) {
    const obj = Object.fromEntries(challenges);
    this.writeJSON(CHALLENGES_FILE, obj);
  }
}

export const fileStore = new FileStore();