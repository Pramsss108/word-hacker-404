-- License Management Database Schema
-- Created: 2025-12-13

-- Users table: Stores license information
CREATE TABLE IF NOT EXISTS users (
    hwid TEXT PRIMARY KEY,
    license_key TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL CHECK(tier IN ('FREE', 'PRO', 'YEARLY')),
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    is_active INTEGER DEFAULT 1
);

-- Quota table: Tracks daily download limits
CREATE TABLE IF NOT EXISTS quota (
    hwid TEXT PRIMARY KEY,
    downloads_today INTEGER DEFAULT 0,
    last_reset INTEGER NOT NULL,
    total_downloads INTEGER DEFAULT 0,
    FOREIGN KEY (hwid) REFERENCES users(hwid)
);

-- Analytics table: Track usage patterns
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hwid TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (hwid) REFERENCES users(hwid)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_license ON users(license_key);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_analytics_hwid ON analytics(hwid);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
