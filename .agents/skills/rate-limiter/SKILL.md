---
name: rate-limiter
description: >-
  Gestion du rate-limiting pour les APIs des réseaux sociaux dans Cleanly.
  Utiliser quand on implémente la suppression en masse, qu'on reçoit des erreurs
  429, ou qu'on configure les délais entre les requêtes. Basé sur l'analyse REA
  des fonctions runWith429Retry et extractRetryAfterSeconds de Unpost.apk.
---

# Rate-Limiter universel — Cleanly App

## Limites par plateforme (connues)

| Plateforme | Limite suppression | Délai recommandé |
|------------|-------------------|-----------------|
| Discord | ~5/sec (non-officiel) | 500ms entre requêtes |
| X/Twitter | 300/15min (API v2) | 3s entre requêtes |
| Instagram | ~200/heure | 20s entre requêtes |
| Reddit | 60/min | 1s entre requêtes |
| Teams (Graph) | 1/sec | 1.1s entre requêtes |
| Bluesky | Variable par PDS | 500ms entre requêtes |
| Mastodon | Variable par instance | 1s entre requêtes |
| YouTube | 50 quota units/delete | 2s entre requêtes |

## Implémentation de la queue SQLite

```typescript
// src/services/deletionQueue.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('cleanly.db');

// Schéma
db.execSync(`
  CREATE TABLE IF NOT EXISTS deletion_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL,     -- 'message', 'tweet', 'post'
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'done', 'error'
    retry_count INTEGER DEFAULT 0,
    next_retry_at INTEGER,          -- timestamp UNIX
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    error_message TEXT
  );
  
  CREATE TABLE IF NOT EXISTS deletion_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    content_id TEXT NOT NULL,
    deleted_at INTEGER DEFAULT (strftime('%s', 'now')),
    backup_data TEXT                -- JSON du contenu avant suppression
  );
`);

// Ajouter à la queue
export function enqueue(
  platform: string,
  contentId: string,
  contentType: string
): void {
  db.runSync(
    'INSERT INTO deletion_queue (platform, content_id, content_type) VALUES (?, ?, ?)',
    [platform, contentId, contentType]
  );
}

// Traiter la queue
export async function processQueue(
  deleteFn: (platform: string, id: string) => Promise<void>
): Promise<void> {
  const items = db.getAllSync<QueueItem>(
    `SELECT * FROM deletion_queue 
     WHERE status = 'pending' 
     AND (next_retry_at IS NULL OR next_retry_at <= strftime('%s', 'now'))
     LIMIT 10`
  );

  for (const item of items) {
    try {
      db.runSync(
        "UPDATE deletion_queue SET status = 'processing' WHERE id = ?",
        [item.id]
      );
      
      await deleteFn(item.platform, item.content_id);
      
      // Succès : déplacer vers l'historique
      db.runSync(
        "UPDATE deletion_queue SET status = 'done' WHERE id = ?",
        [item.id]
      );
      db.runSync(
        'INSERT INTO deletion_history (platform, content_id) VALUES (?, ?)',
        [item.platform, item.content_id]
      );
      
    } catch (err: any) {
      const retryAfter = err?.retryAfter ?? 30;
      const nextRetry = Math.floor(Date.now() / 1000) + retryAfter;
      
      db.runSync(
        `UPDATE deletion_queue 
         SET status = 'pending', retry_count = retry_count + 1,
             next_retry_at = ?, error_message = ?
         WHERE id = ?`,
        [nextRetry, err.message, item.id]
      );
    }
    
    // Délai entre requêtes
    await sleep(getDelayForPlatform(item.platform));
  }
}

function getDelayForPlatform(platform: string): number {
  const delays: Record<string, number> = {
    discord: 500,
    twitter: 3000,
    instagram: 20000,
    reddit: 1000,
    teams: 1100,
    bluesky: 500,
    mastodon: 1000,
    youtube: 2000,
  };
  return delays[platform] ?? 2000;
}
```

## Stratégie X/Twitter (twitterLikeThenUnlike)
> Identifiée par analyse REA de Unpost.apk

```typescript
// Pour contourner les limites de suppression de likes Twitter :
// Like + Unlike au lieu de delete direct (dans certains cas)
export async function twitterLikeThenUnlike(
  token: string,
  userId: string,
  tweetId: string
): Promise<void> {
  // Like d'abord (pour "rafraîchir" le tweet dans l'API)
  await fetch(`https://api.twitter.com/2/users/${userId}/likes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tweet_id: tweetId })
  });
  await sleep(1000);
  // Puis unlike = suppression du like
  await fetch(`https://api.twitter.com/2/users/${userId}/likes/${tweetId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

