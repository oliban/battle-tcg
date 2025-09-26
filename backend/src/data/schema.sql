-- Battle Card Game Database Schema

-- Players table - core player data only
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    coins INTEGER DEFAULT 500,
    rating INTEGER DEFAULT 1000,
    last_active DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    full_name TEXT,
    description TEXT,
    image_url TEXT,
    strength INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    agility INTEGER NOT NULL,
    base_strength INTEGER,
    base_speed INTEGER,
    base_agility INTEGER,
    title_modifier_strength INTEGER DEFAULT 0,
    title_modifier_speed INTEGER DEFAULT 0,
    title_modifier_agility INTEGER DEFAULT 0,
    critical_hit_chance REAL DEFAULT 0,
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT REFERENCES players(id)
);

-- Player cards ownership
CREATE TABLE IF NOT EXISTS player_cards (
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, card_id)
);

-- Player deck configuration
CREATE TABLE IF NOT EXISTS player_decks (
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
    position INTEGER CHECK (position >= 0 AND position <= 9),
    PRIMARY KEY (player_id, position)
);

-- Battles table
CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    player1_id TEXT REFERENCES players(id),
    player2_id TEXT REFERENCES players(id),
    player1_name TEXT,
    player2_name TEXT,
    is_simulation BOOLEAN DEFAULT FALSE,
    player1_points INTEGER DEFAULT 0,
    player2_points INTEGER DEFAULT 0,
    player1_total_damage INTEGER DEFAULT 0,
    player2_total_damage INTEGER DEFAULT 0,
    winner_id TEXT REFERENCES players(id),
    win_reason TEXT CHECK (win_reason IN ('points', 'damage', 'coin-toss')),
    status TEXT CHECK (status IN ('waiting-for-selection', 'waiting-for-order', 'ready', 'in-progress', 'completed')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Battle cards - which cards were used
CREATE TABLE IF NOT EXISTS battle_cards (
    battle_id TEXT REFERENCES battles(id) ON DELETE CASCADE,
    player INTEGER CHECK (player IN (1, 2)),
    card_id TEXT REFERENCES cards(id),
    position INTEGER CHECK (position >= 0 AND position <= 2),
    play_order INTEGER CHECK (play_order >= 0 AND play_order <= 2),
    PRIMARY KEY (battle_id, player, position)
);

-- Battle rounds details
CREATE TABLE IF NOT EXISTS battle_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id TEXT REFERENCES battles(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    player1_card_id TEXT,
    player2_card_id TEXT,
    ability TEXT CHECK (ability IN ('strength', 'speed', 'agility')) NOT NULL,
    player1_roll INTEGER NOT NULL,
    player2_roll INTEGER NOT NULL,
    player1_stat_value INTEGER NOT NULL,
    player2_stat_value INTEGER NOT NULL,
    player1_total INTEGER NOT NULL,
    player2_total INTEGER NOT NULL,
    damage_dealt INTEGER NOT NULL,
    winner TEXT CHECK (winner IN ('player1', 'player2', 'draw')) NOT NULL
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    challenger_id TEXT REFERENCES players(id),
    challenger_name TEXT NOT NULL,
    challenged_id TEXT, -- Can be NULL for AI challenges
    challenged_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'ready', 'completed')) NOT NULL,
    battle_id TEXT REFERENCES battles(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

-- Challenge cards
CREATE TABLE IF NOT EXISTS challenge_cards (
    challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
    player_type TEXT CHECK (player_type IN ('challenger', 'challenged')) NOT NULL,
    card_id TEXT REFERENCES cards(id),
    position INTEGER CHECK (position >= 0 AND position <= 2),
    play_order INTEGER CHECK (play_order >= 0 AND play_order <= 2),
    PRIMARY KEY (challenge_id, player_type, position)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT, -- JSON data
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Reward types table
CREATE TABLE IF NOT EXISTS reward_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('voice', 'avatar', 'card_back', 'emote', 'title')) NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')) NOT NULL,
    metadata TEXT, -- JSON data for additional properties
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player rewards table
CREATE TABLE IF NOT EXISTS player_rewards (
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    reward_id TEXT REFERENCES reward_types(id) ON DELETE CASCADE,
    source TEXT, -- How the reward was obtained (e.g., 'initial', 'achievement', 'purchase')
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    equipped BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (player_id, reward_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles(player1_id, is_simulation);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles(player2_id, is_simulation);
CREATE INDEX IF NOT EXISTS idx_battles_winner ON battles(winner_id, is_simulation);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_player_cards_player ON player_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);

-- Views for common queries
CREATE VIEW IF NOT EXISTS player_stats AS
SELECT
    p.id,
    p.name,
    p.coins,
    p.rating,
    COUNT(DISTINCT CASE WHEN b.winner_id = p.id THEN b.id END) as total_wins,
    COUNT(DISTINCT CASE WHEN (b.player1_id = p.id OR b.player2_id = p.id) AND b.winner_id != p.id AND b.status = 'completed' THEN b.id END) as total_losses,
    COUNT(DISTINCT CASE WHEN b.winner_id = p.id AND b.is_simulation = 0 THEN b.id END) as pvp_wins,
    COUNT(DISTINCT CASE WHEN (b.player1_id = p.id OR b.player2_id = p.id) AND b.winner_id != p.id AND b.is_simulation = 0 AND b.status = 'completed' THEN b.id END) as pvp_losses,
    COUNT(DISTINCT CASE WHEN b.winner_id = p.id AND b.is_simulation = 1 THEN b.id END) as ai_wins,
    COUNT(DISTINCT CASE WHEN (b.player1_id = p.id OR b.player2_id = p.id) AND b.winner_id != p.id AND b.is_simulation = 1 AND b.status = 'completed' THEN b.id END) as ai_losses
FROM players p
LEFT JOIN battles b ON (b.player1_id = p.id OR b.player2_id = p.id) AND b.status = 'completed'
GROUP BY p.id;