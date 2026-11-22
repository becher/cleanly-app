// schema.ts — Base de données SQLite pour Cleanly
// Gère la persistance locale de la file de suppression et de l'historique

  interface SQLiteDatabase {
    execSync: (sql: string) => void;
    runSync: (sql: string, ...params: any[]) => void;
  }

  let _db: SQLiteDatabase | null = null;

    function getDb(): SQLiteDatabase | null {
      return _db;
    }

    export function initDatabase(): void {
      const db = getDb();
      if (!db) {
        return;
      }

  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS accounts(
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT,
        connected_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS deletion_queue(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        account_id TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at INTEGER,
        error_message TEXT,
        created_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS deletion_history(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        account_id TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        deleted_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
        success INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_queue_status ON deletion_queue (status);
      CREATE INDEX IF NOT EXISTS idx_history_platform ON deletion_history (platform);
    `);
    } catch (error) {
      console.warn('[Cleanly DB] Erreur initDatabase:', error);
    }
  }
