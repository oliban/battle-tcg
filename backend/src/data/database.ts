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

      // Initialize tools after schema is ready
      this.initializeTools();
    } catch (error) {
      console.error('[Database] Failed to initialize schema:', error);
      throw error;
    }
  }

  private initializeTools() {
    try {
      // Check if tools already exist
      const existingTools = this.db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };

      if (existingTools.count > 0) {
        console.log('[Database] Tools already initialized');
        return;
      }

      // Insert default tools
      const insertTool = this.db.prepare(`
        INSERT INTO tools (
          id, name, description, effect_type, effect_ability,
          effect_value, cooldown, restriction, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const tools = [
        ['running-shoes', 'Running Shoes', 'Gives +2 speed to the card you apply it to', 'stat_boost', 'speed', 2, 0, null, '/images/tools/running-shoes.png'],
        ['sledge-hammer', 'Sledge Hammer', 'Gives +2 strength to the card you apply it to', 'stat_boost', 'strength', 2, 0, null, '/images/tools/sledge-hammer.png'],
        ['lube-tube', 'Lube Tube', 'Gives +2 agility to the card you apply it to', 'stat_boost', 'agility', 2, 0, null, '/images/tools/lube-tube.png'],
        ['spear', 'Spear', 'Gives +2 to any ability. Has a 2-battle cooldown after use', 'any_stat_boost', 'any', 2, 2, null, '/images/tools/spear.png'],
        ['binoculars', 'Binoculars', 'Reveals 2 random opponent cards. Can only be used when defending', 'reveal_cards', null, 2, 0, 'challengee', '/images/tools/binoculars.png']
      ];

      const insertMany = this.db.transaction(() => {
        for (const tool of tools) {
          insertTool.run(...tool);
        }
      });

      insertMany();
      console.log('[Database] Successfully initialized', tools.length, 'tools');
    } catch (error) {
      console.error('[Database] Failed to initialize tools:', error);
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
          critical_hit_chance, rarity, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),

      // Player cards
      getPlayerCards: this.db.prepare(`
        SELECT c.* FROM cards c
        JOIN player_cards pc ON c.id = pc.card_id
        WHERE pc.player_id = ?
        ORDER BY pc.acquired_at DESC, pc.rowid DESC
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
          is_simulation, status, first_round_ability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
          challenged_id, challenged_name, status, first_round_ability, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
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
      `),

      // Reward queries
      getAllRewardTypes: this.db.prepare(`
        SELECT * FROM reward_types ORDER BY category, rarity
      `),
      getRewardTypesByCategory: this.db.prepare(`
        SELECT * FROM reward_types WHERE category = ? ORDER BY rarity
      `),
      getPlayerRewards: this.db.prepare(`
        SELECT r.*, rt.name, rt.description, rt.category, rt.rarity, rt.metadata
        FROM player_rewards r
        JOIN reward_types rt ON r.reward_id = rt.id
        WHERE r.player_id = ?
        ORDER BY r.unlocked_at DESC
      `),
      addPlayerReward: this.db.prepare(`
        INSERT INTO player_rewards (player_id, reward_id, source)
        VALUES (?, ?, ?)
      `),
      hasPlayerReward: this.db.prepare(`
        SELECT COUNT(*) as count FROM player_rewards
        WHERE player_id = ? AND reward_id = ?
      `),
      getAvailableRewards: this.db.prepare(`
        SELECT * FROM reward_types
        WHERE id NOT IN (
          SELECT reward_id FROM player_rewards WHERE player_id = ?
        )
        ORDER BY category, rarity
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