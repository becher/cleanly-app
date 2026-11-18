// Client Discord API v9
// Basé sur l'analyse REA de Unpost.apk — endpoints authentiques

import { runWith429Retry, waitPlatformDelay } from './rateLimiter';

// Base URL de l'API Discord
const DISCORD_API = 'https://discord.com/api/v9';

// Types Discord
export type DiscordMessage = {
  id: string;
  content: string;
  timestamp: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
  };
};

export type DiscordChannel = {
  id: string;
  name: string;
  type: number; // 0=texte, 2=vocal, etc.
  guild_id?: string;
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
      headers: { Authorization: `Bearer ${token}` },
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
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getChannels');
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
  beforeId?: string // Pour la pagination
): Promise<DiscordMessage[]> {
  return runWith429Retry(async () => {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
    url.searchParams.set('limit', '100');
    if (beforeId) url.searchParams.set('before', beforeId);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throwDiscordError(response.status, 'getMessages');
    }

    return response.json() as Promise<DiscordMessage[]>;
  }, 'discord');
}

/**
 * Supprime un message Discord
 * Attend le délai plateforme avant d'envoyer pour éviter le rate limit
 */
export async function deleteDiscordMessage(
  token: string,
  channelId: string,
  messageId: string
): Promise<void> {
  // Délai avant suppression (500ms pour Discord)
  await waitPlatformDelay('discord');

  await runWith429Retry(async () => {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // 204 = suppression OK, 404 = déjà supprimé (OK aussi)
    if (response.status !== 204 && response.status !== 404) {
      throwDiscordError(response.status, 'deleteMessage');
    }
  }, 'discord');
}

/**
 * Récupère TOUS les messages d'un canal (toutes les pages)
 * Utile pour préparer la queue de suppression
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

    // Si moins de 100 messages → c'est la dernière page
    if (batch.length < 100) break;
  }

  return allMessages;
}

// --- Utilitaire privé ---

function throwDiscordError(status: number, context: string): never {
  const error = Object.assign(new Error(`Discord API ${context} → HTTP ${status}`), {
    status,
    statusCode: status,
  });
  throw error;
}

