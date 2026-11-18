// schema.ts — Base de données SQLite avec fallback Expo Go
// Sur Expo Go : toutes les fonctions sont des no-op (aucun crash)
// Sur dev build / EAS : SQLite WAL complet

let SQLite: typeof import('expo-sqlite') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
} catch {
  // Expo Go : pas de module natif → mode dégradé
}

type SQLiteDB = ReturnType<NonNullable<typeof SQLite>['openDatabaseSync']>;
let _db: SQLiteDB | null = null;

function getDb(): SQLiteDB | null {
  if (!SQLite) return null;
  if (!_db) {
    _db = SQLite.openDatabaseSync('cleanly.db');
  }
  return _db;
}

export function initDatabase(): void {
  const db = getDb();
  if (!db) {
    console.warn('[Cleanly] SQLite indisponible — Expo Go mode. Utilise un dev build pour la persistance.');
    return;
  }

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

// Objet db sécurisé — retourne des no-ops si SQLite indisponible
export const db = {
  runSync: (sql: string, params?: unknown[]) => {
    getDb()?.runSync(sql, params as any);
  },
  getAllSync: <T>(sql: string, params?: unknown[]): T[] => {
    return (getDb()?.getAllSync<T>(sql, params as any)) ?? [];
  },
  getFirstSync: <T>(sql: string, params?: unknown[]): T | null => {
    return (getDb()?.getFirstSync<T>(sql, params as any)) ?? null;
  },
  execSync: (sql: string) => {
    getDb()?.execSync(sql);
  },
};
