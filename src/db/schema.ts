import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('cleanly.db');

export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT,
      connected_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS deletion_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      error_message TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS deletion_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      deleted_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      backup_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_queue_status ON deletion_queue(status, next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_queue_platform ON deletion_queue(platform, account_id);
    CREATE INDEX IF NOT EXISTS idx_history_platform ON deletion_history(platform, deleted_at);
  `);
}

export { db };

