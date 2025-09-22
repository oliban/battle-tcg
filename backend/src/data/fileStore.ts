import fs from 'fs';
import path from 'path';
import { Player, Card, Battle } from '../models/types';

const DATA_DIR = path.join(__dirname, '../../data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const BATTLES_FILE = path.join(DATA_DIR, 'battles.json');

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
}

export const fileStore = new FileStore();