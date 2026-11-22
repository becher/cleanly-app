// Client Discord API v9
// Basé sur l'analyse REA de Unpost.apk — support User Token + Bot/OAuth
import { runWith429Retry, waitPlatformDelay } from './rateLimiter';

const DISCORD_API = 'https://discord.com/api/v9';

export function formatDiscordAuth(token: string): string {
  if (token.startsWith('Bot ') || token.startsWith('Bearer ')) {
    return token;
  }
  // User token direct
  return token;
}

const getHeaders = (token: string) => ({
  Authorization: formatDiscordAuth(token),
  'User-Agent': 'Discord-Android/867',
  'Content-Type': 'application/json',
});

// Types Discord
export type DiscordMessage = {
  id: string;
  content: string;
  timestamp: string;
  channel_id: string;
  channel_name?: string;
  author: {
    id: string;
    username: string;
  };
  attachments?: Array<{ id: string; url: string; filename?: string }>;
  pinned?: boolean;
};

export type DiscordChannel = {
  id: string;
  name: string;
  type: number; // 0=texte, 1=DM direct, 3=groupe DM, etc.
  guild_id?: string;
  recipients?: Array<{ id: string; username: string }>;
};

export type DiscordGuild = {
  id: string;
  name: string;
  icon?: string;
};

/**
 * Récupère les guildes (serveurs) de l'utilisateur
 */
export async function getDiscordGuilds(token: string): Promise<DiscordGuild[]> {
  return runWith429Retry(async () => {
    const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getGuilds');
    }

    return response.json() as Promise<DiscordGuild[]>;
  }, 'discord');
}

/**
 * Récupère les canaux d'un serveur
 */
export async function getDiscordChannels(
  token: string,
  guildId: string
): Promise<DiscordChannel[]> {
  return runWith429Retry(async () => {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getChannels');
    }

    return response.json() as Promise<DiscordChannel[]>;
  }, 'discord');
}

/**
 * Récupère les canaux de messages privés (DMs) de l'utilisateur
 */
export async function getDiscordDirectMessages(token: string): Promise<DiscordChannel[]> {
  return runWith429Retry(async () => {
    const response = await fetch(`${DISCORD_API}/users/@me/channels`, {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getDirectMessages');
    }

    return response.json() as Promise<DiscordChannel[]>;
  }, 'discord');
}

/**
 * Récupère les messages d'un canal (max 100 par page)
 */
export async function getDiscordMessages(
  token: string,
  channelId: string,
  beforeId?: string
): Promise<DiscordMessage[]> {
  return runWith429Retry(async () => {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
    url.searchParams.set('limit', '100');
    if (beforeId) url.searchParams.set('before', beforeId);

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getMessages');
    }

    return response.json() as Promise<DiscordMessage[]>;
  }, 'discord');
}

/**
 * Supprime un message Discord (délai anti-ban configurable, 500ms par défaut)
 */
export async function deleteDiscordMessage(
  token: string,
  channelId: string,
  messageId: string,
  delayMs: number = 500
): Promise<void> {
  if (delayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), delayMs));
  }

  await runWith429Retry(async () => {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: getHeaders(token),
      }
    );

    if (response.status !== 204 && response.status !== 404) {
      throwDiscordError(response.status, 'deleteMessage');
    }
  }, 'discord');
}

/**
 * Récupère tous les messages d'un canal avec pagination
 */
export async function getAllDiscordMessages(
  token: string,
  channelId: string,
  onProgress?: (count: number) => void
): Promise<DiscordMessage[]> {
  const allMessages: DiscordMessage[] = [];
  let lastId: string | undefined = undefined;

  while (true) {
    const batch = await getDiscordMessages(token, channelId, lastId);
    if (batch.length === 0) break;

    allMessages.push(...batch);
    lastId = batch[batch.length - 1].id;
    onProgress?.(allMessages.length);

    if (batch.length < 100) break;
  }

  return allMessages;
}

function throwDiscordError(status: number, context: string): never {
  const error = Object.assign(new Error(`Discord API ${context} → HTTP ${status}`), {
    status,
    statusCode: status,
  });
  throw error;
}
