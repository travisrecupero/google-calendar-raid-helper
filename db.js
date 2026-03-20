const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/bot.db';

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_user_id TEXT PRIMARY KEY,
        encrypted_refresh_token TEXT NOT NULL,
        token_expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);

// Add token_expires_at column if migrating from older schema
try {
    db.exec('ALTER TABLE users ADD COLUMN token_expires_at INTEGER');
} catch (e) {
    // Column already exists
}

// Per-server config (Raid Helper API key)
db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
        guild_id TEXT PRIMARY KEY,
        encrypted_api_key TEXT NOT NULL,
        configured_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);

// Temporary store for PKCE code verifiers (keyed by state)
db.exec(`
    CREATE TABLE IF NOT EXISTS pkce_verifiers (
        state TEXT PRIMARY KEY,
        code_verifier TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )
`);

function getUser(discordUserId) {
    return db.prepare('SELECT encrypted_refresh_token, token_expires_at FROM users WHERE discord_user_id = ?').get(discordUserId) || null;
}

function setToken(discordUserId, encryptedToken, expiresAt) {
    const now = Date.now();
    db.prepare(`
        INSERT INTO users (discord_user_id, encrypted_refresh_token, token_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(discord_user_id) DO UPDATE SET
            encrypted_refresh_token = excluded.encrypted_refresh_token,
            token_expires_at = excluded.token_expires_at,
            updated_at = excluded.updated_at
    `).run(discordUserId, encryptedToken, expiresAt || null, now, now);
}

function updateExpiry(discordUserId, expiresAt) {
    db.prepare('UPDATE users SET token_expires_at = ?, updated_at = ? WHERE discord_user_id = ?')
        .run(expiresAt, Date.now(), discordUserId);
}

function deleteToken(discordUserId) {
    db.prepare('DELETE FROM users WHERE discord_user_id = ?').run(discordUserId);
}

function setCodeVerifier(state, codeVerifier) {
    db.prepare('INSERT INTO pkce_verifiers (state, code_verifier, created_at) VALUES (?, ?, ?)')
        .run(state, codeVerifier, Date.now());
}

function getCodeVerifier(state) {
    const row = db.prepare('SELECT code_verifier FROM pkce_verifiers WHERE state = ?').get(state);
    // Delete after retrieval (one-time use)
    db.prepare('DELETE FROM pkce_verifiers WHERE state = ?').run(state);
    return row ? row.code_verifier : null;
}

function cleanExpiredVerifiers() {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    db.prepare('DELETE FROM pkce_verifiers WHERE created_at < ?').run(tenMinutesAgo);
}

function getServer(guildId) {
    return db.prepare('SELECT encrypted_api_key FROM servers WHERE guild_id = ?').get(guildId) || null;
}

function setServer(guildId, encryptedApiKey, configuredBy) {
    const now = Date.now();
    db.prepare(`
        INSERT INTO servers (guild_id, encrypted_api_key, configured_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            encrypted_api_key = excluded.encrypted_api_key,
            configured_by = excluded.configured_by,
            updated_at = excluded.updated_at
    `).run(guildId, encryptedApiKey, configuredBy, now, now);
}

module.exports = { getUser, setToken, updateExpiry, deleteToken, setCodeVerifier, getCodeVerifier, cleanExpiredVerifiers, getServer, setServer };
