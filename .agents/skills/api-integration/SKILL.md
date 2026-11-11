---
name: api-integration
description: >-
  Intégration des APIs des réseaux sociaux pour Cleanly (Discord, X/Twitter,
  Instagram, Reddit, Microsoft Teams, Bluesky, Mastodon, Threads, YouTube).
  Utiliser quand l'utilisateur demande d'implémenter un client API, gérer
  l'authentification OAuth, ou intégrer un nouveau réseau social.
  Basé sur l'analyse REA de Unpost.apk.
---

# Intégration API Réseaux Sociaux — Cleanly

## Architecture du client API
```typescript
// src/api/base.ts — Client de base avec rate-limiting
export abstract class SocialAPIClient {
  abstract platform: string;
  abstract deleteContent(id: string): Promise<void>;
  abstract listContent(cursor?: string): Promise<ContentPage>;
  
  protected async withRateLimit<T>(
    fn: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = parseInt(err.headers['retry-after'] ?? '5');
        await sleep(retryAfter * 1000);
        return this.withRateLimit(fn, retries - 1);
      }
      throw err;
    }
  }
}
```

## Discord (Tier 1 — API non-officielle)
```typescript
// src/api/discord.ts
const BASE = 'https://discord.com/api/v9';

export async function deleteMessage(
  token: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await fetch(`${BASE}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': token,                    // Token user (pas bot)
      'User-Agent': 'Discord-Android/867',       // Identifié par REA
    }
  });
}

export async function getMessages(
  token: string,
  channelId: string,
  before?: string
): Promise<Message[]> {
  const url = `${BASE}/channels/${channelId}/messages?limit=100`
    + (before ? `&before=${before}` : '');
  const res = await fetch(url, {
    headers: { 'Authorization': token }
  });
  return res.json();
}
```

## X / Twitter (Tier 1 — API v2 officielle)
```typescript
// src/api/twitter.ts
const BASE = 'https://api.twitter.com/2';

export async function deleteTweet(
  token: string,
  tweetId: string
): Promise<void> {
  await fetch(`${BASE}/tweets/${tweetId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Microsoft Teams (Tier 1 — Microsoft Graph API)
```typescript
// src/api/teams.ts
const BASE = 'https://graph.microsoft.com/v1.0';

// Supprimer un message de chat (soft delete)
export async function deleteChatMessage(
  token: string,
  userId: string,
  chatId: string,
  messageId: string
): Promise<void> {
  await fetch(
    `${BASE}/users/${userId}/chats/${chatId}/messages/${messageId}/softDelete`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

// Supprimer un message de canal
export async function deleteChannelMessage(
  token: string,
  teamId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await fetch(
    `${BASE}/teams/${teamId}/channels/${channelId}/messages/${messageId}/softDelete`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
  );
}
```

## Bluesky / AT Protocol (Tier 1 — Gratuit)
```typescript
// src/api/bluesky.ts
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });

export async function deletePost(
  identifier: string,
  password: string,  // App Password (pas le vrai mdp)
  uri: string
): Promise<void> {
  await agent.login({ identifier, password });
  await agent.deletePost(uri);
}
```

## Mastodon (Tier 1 — REST officielle)
```typescript
// src/api/mastodon.ts
export async function deleteStatus(
  instance: string,  // ex: mastodon.social
  token: string,
  statusId: string
): Promise<void> {
  await fetch(`https://${instance}/api/v1/statuses/${statusId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Threads / Meta (Tier 1 — Graph API)
```typescript
// src/api/threads.ts
export async function deleteThread(
  token: string,
  mediaId: string
): Promise<void> {
  await fetch(
    `https://graph.threads.net/v1.0/${mediaId}`,
    { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
  );
}
```

## Reddit (Tier 1 — API officielle)
```typescript
// src/api/reddit.ts
export async function deletePost(
  token: string,
  fullname: string  // ex: "t3_abc123"
): Promise<void> {
  const body = new URLSearchParams({ id: fullname });
  await fetch('https://oauth.reddit.com/api/del', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
}
```

## OAuth Flow universel
```typescript
// src/auth/oauth.ts
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

export const OAUTH_CONFIGS = {
  discord: {
    authorizationEndpoint: 'https://discord.com/oauth2/authorize',
    tokenEndpoint: 'https://discord.com/api/oauth2/token',
    scopes: ['identify', 'messages.read'],
  },
  twitter: {
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
    tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
  },
  teams: {
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Chat.ReadWrite', 'ChannelMessage.ReadWrite'],
  },
  bluesky: { /* App Password — pas OAuth standard */ },
};
```

## Rate-limiting (inspiré de Unpost.apk — analyse REA)
```typescript
// src/api/rateLimiter.ts
// Fonctions identifiées dans Unpost: runWith429Retry, extractRetryAfterSeconds

export async function runWith429Retry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  defaultRetryAfterMs = 5000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.status === 429 || err?.response?.status === 429) {
        const retryAfter = extractRetryAfterSeconds(err?.response?.headers);
        await sleep((retryAfter ?? defaultRetryAfterMs / 1000) * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export function extractRetryAfterSeconds(
  headers?: Record<string, string>
): number | null {
  const val = headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}
```

