-- Rewards System Migration

-- Table for different reward types
CREATE TABLE IF NOT EXISTS reward_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL, -- 'voice', 'card_back', 'emote', etc.
    rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    metadata TEXT -- JSON string for type-specific data
);

-- Table for player rewards (what they've unlocked)
CREATE TABLE IF NOT EXISTS player_rewards (
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    reward_id TEXT REFERENCES reward_types(id) ON DELETE CASCADE,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT, -- 'initial', 'battle_win', 'achievement', 'purchase', etc.
    PRIMARY KEY (player_id, reward_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_rewards_player ON player_rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_reward_types_category ON reward_types(category);

-- Insert voice rewards
INSERT OR IGNORE INTO reward_types (id, name, description, category, rarity, metadata) VALUES
-- Common voices (initial pool)
('voice_google_italiano', 'Google Italiano', 'Italian Google voice', 'voice', 'common', '{"lang":"it-IT","engine":"google"}'),
('voice_google_us_english', 'Google US English', 'US English Google voice', 'voice', 'common', '{"lang":"en-US","engine":"google"}'),
('voice_google_uk_english', 'Google UK English', 'UK English Google voice', 'voice', 'common', '{"lang":"en-GB","engine":"google"}'),
('voice_google_deutsch', 'Google Deutsch', 'German Google voice', 'voice', 'common', '{"lang":"de-DE","engine":"google"}'),
('voice_google_francais', 'Google Français', 'French Google voice', 'voice', 'common', '{"lang":"fr-FR","engine":"google"}'),
('voice_google_espanol', 'Google Español', 'Spanish Google voice', 'voice', 'common', '{"lang":"es-ES","engine":"google"}'),
('voice_google_nederlands', 'Google Nederlands', 'Dutch Google voice', 'voice', 'common', '{"lang":"nl-NL","engine":"google"}'),

-- Uncommon voices
('voice_google_japanese', 'Google 日本語', 'Japanese Google voice', 'voice', 'uncommon', '{"lang":"ja-JP","engine":"google"}'),
('voice_google_korean', 'Google 한국어', 'Korean Google voice', 'voice', 'uncommon', '{"lang":"ko-KR","engine":"google"}'),
('voice_google_chinese', 'Google 中文', 'Chinese Google voice', 'voice', 'uncommon', '{"lang":"zh-CN","engine":"google"}'),
('voice_google_russian', 'Google Русский', 'Russian Google voice', 'voice', 'uncommon', '{"lang":"ru-RU","engine":"google"}'),
('voice_google_portuguese', 'Google Português', 'Portuguese Google voice', 'voice', 'uncommon', '{"lang":"pt-BR","engine":"google"}'),

-- Rare voices
('voice_google_swedish', 'Google Svenska', 'Swedish Google voice', 'voice', 'rare', '{"lang":"sv-SE","engine":"google"}'),
('voice_google_norwegian', 'Google Norsk', 'Norwegian Google voice', 'voice', 'rare', '{"lang":"nb-NO","engine":"google"}'),
('voice_google_finnish', 'Google Suomi', 'Finnish Google voice', 'voice', 'rare', '{"lang":"fi-FI","engine":"google"}'),
('voice_google_polish', 'Google Polski', 'Polish Google voice', 'voice', 'rare', '{"lang":"pl-PL","engine":"google"}'),
('voice_google_turkish', 'Google Türkçe', 'Turkish Google voice', 'voice', 'rare', '{"lang":"tr-TR","engine":"google"}'),

-- Epic voices (special accents or variations)
('voice_google_australian', 'Google Australian', 'Australian English voice', 'voice', 'epic', '{"lang":"en-AU","engine":"google"}'),
('voice_google_indian', 'Google Indian', 'Indian English voice', 'voice', 'epic', '{"lang":"en-IN","engine":"google"}'),
('voice_google_canadian_french', 'Google Québécois', 'Canadian French voice', 'voice', 'epic', '{"lang":"fr-CA","engine":"google"}');

-- Placeholder for future reward types
-- INSERT OR IGNORE INTO reward_types (id, name, description, category, rarity) VALUES
-- ('card_back_flames', 'Flames', 'Animated flames card back', 'card_back', 'rare'),
-- ('emote_victory', 'Victory Dance', 'Victory celebration emote', 'emote', 'uncommon');