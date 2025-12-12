-- Ad Management Schema (Phase 3)
-- Append to existing schema.sql

-- Ad completions table
CREATE TABLE IF NOT EXISTS ad_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hwid TEXT NOT NULL,
    ad_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    token_used INTEGER DEFAULT 0,
    used_at INTEGER,
    FOREIGN KEY (hwid) REFERENCES users(hwid)
);

-- AdMob server-to-server verifications
CREATE TABLE IF NOT EXISTS ad_server_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hwid TEXT NOT NULL,
    ad_id TEXT NOT NULL,
    verified_at INTEGER NOT NULL,
    reward_amount INTEGER NOT NULL
);

-- Rate limiting and fraud detection
CREATE TABLE IF NOT EXISTS ad_rate_limits (
    hwid TEXT PRIMARY KEY,
    ads_today INTEGER DEFAULT 0,
    last_reset INTEGER NOT NULL,
    suspicious_count INTEGER DEFAULT 0,
    banned INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_completions_hwid ON ad_completions(hwid);
CREATE INDEX IF NOT EXISTS idx_ad_completions_token ON ad_completions(token);
CREATE INDEX IF NOT EXISTS idx_ad_verifications_hwid ON ad_server_verifications(hwid);
