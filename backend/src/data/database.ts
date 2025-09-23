import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../game.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class GameDatabase {
  private db: Database.Database;

  constructor() {
    // Initialize database
    this.db = new Database(DB_PATH);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initializeSchema();

    // Prepare commonly used statements
    this.prepareStatements();
  }

  private initializeSchema() {
    try {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      this.db.exec(schema);
      console.log('[Database] Schema initialized successfully');
    } catch (error) {
      console.error('[Database] Failed to initialize schema:', error);
      throw error;
    }
  }

  private prepareStatements() {
    // Prepare frequently used statements for better performance
    this.statements = {
      // Player queries
      getPlayer: this.db.prepare('SELECT * FROM players WHERE id = ?'),
      getPlayerByName: this.db.prepare('SELECT * FROM players WHERE LOWER(name) = LOWER(?)'),
      getAllPlayers: this.db.prepare('SELECT * FROM players'),
      insertPlayer: this.db.prepare(`
        INSERT INTO players (id, name, coins, rating, last_active)
        VALUES (?, ?, ?, ?, datetime('now'))
      `),
      updatePlayer: this.db.prepare(`
        UPDATE players
        SET coins = ?, rating = ?, last_active = datetime('now')
        WHERE id = ?
      `),

      // Card queries
      getCard: this.db.prepare('SELECT * FROM cards WHERE id = ?'),
      getAllCards: this.db.prepare('SELECT * FROM cards'),
      insertCard: this.db.prepare(`
        INSERT INTO cards (
          id, name, title, full_name, description, image_url,
          strength, speed, agility,
          base_strength, base_speed, base_agility,
          title_modifier_strength, title_modifier_speed, title_modifier_agility,
          rarity, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),

      // Player cards
      getPlayerCards: this.db.prepare(`
        SELECT c.* FROM cards c
        JOIN player_cards pc ON c.id = pc.card_id
        WHERE pc.player_id = ?
      `),
      addCardToPlayer: this.db.prepare(`
        INSERT OR IGNORE INTO player_cards (player_id, card_id) VALUES (?, ?)
      `),

      // Deck queries
      getPlayerDeck: this.db.prepare(`
        SELECT card_id FROM player_decks WHERE player_id = ? ORDER BY position
      `),
      clearPlayerDeck: this.db.prepare('DELETE FROM player_decks WHERE player_id = ?'),
      addCardToDeck: this.db.prepare(`
        INSERT INTO player_decks (player_id, card_id, position) VALUES (?, ?, ?)
      `),

      // Battle queries
      getBattle: this.db.prepare('SELECT * FROM battles WHERE id = ?'),
      getPlayerBattles: this.db.prepare(`
        SELECT * FROM battles
        WHERE (player1_id = ? OR player2_id = ?)
        AND status = 'completed'
        ORDER BY completed_at DESC
      `),
      insertBattle: this.db.prepare(`
        INSERT INTO battles (
          id, player1_id, player2_id, player1_name, player2_name,
          is_simulation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      updateBattle: this.db.prepare(`
        UPDATE battles SET
          player1_points = ?, player2_points = ?,
          player1_total_damage = ?, player2_total_damage = ?,
          winner_id = ?, win_reason = ?, status = ?,
          completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
        WHERE id = ?
      `),

      // Challenge queries
      getChallenge: this.db.prepare('SELECT * FROM challenges WHERE id = ?'),
      getPlayerChallenges: this.db.prepare(`
        SELECT * FROM challenges
        WHERE challenger_id = ? OR challenged_id = ?
        ORDER BY created_at DESC
      `),
      insertChallenge: this.db.prepare(`
        INSERT INTO challenges (
          id, challenger_id, challenger_name,
          challenged_id, challenged_name, status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
      `),
      updateChallenge: this.db.prepare(`
        UPDATE challenges SET status = ?, battle_id = ? WHERE id = ?
      `),

      // Notification queries
      getNotifications: this.db.prepare(`
        SELECT * FROM notifications
        WHERE recipient_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY created_at DESC
      `),
      insertNotification: this.db.prepare(`
        INSERT INTO notifications (
          id, recipient_id, type, title, message, data, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      markNotificationRead: this.db.prepare(`
        UPDATE notifications SET is_read = 1 WHERE id = ?
      `),

      // Stats query using the view
      getPlayerStats: this.db.prepare(`
        SELECT * FROM player_stats WHERE id = ?
      `)
    };
  }

  private statements: any = {};

  // Transaction helper
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // Getters for prepared statements
  get queries() {
    return this.statements;
  }

  // Get raw database connection for complex queries
  get connection() {
    return this.db;
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

// Export singleton instance
export const gameDb = new GameDatabase();