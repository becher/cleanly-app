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
  reactions?: Array<{
    emoji: { id: string | null; name: string };
    count: number;
    me: boolean;
  }>;
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
 * Récupère le profil de l'utilisateur Discord connecté (@me)
 */
export async function getDiscordCurrentUser(token: string): Promise<{ id: string; username: string } | null> {
  return runWith429Retry(async () => {
    const response = await fetch(`${DISCORD_API}/users/@me`, {
      headers: getHeaders(token),
    });
    if (!response.ok) return null;
    return response.json();
  }, 'discord');
}

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
 * Ferme et masque un fil de messages privés (DM) de l'interface utilisateur Discord
 * (FEAT-03 de la Roadmap Cleanly)
 */
export async function closeDiscordDMChannel(token: string, channelId: string): Promise<void> {
  return runWith429Retry(async () => {
    const response = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok && response.status !== 404) {
      throwDiscordError(response.status, 'closeDM');
    }
  }, 'discord');
}

/**
 * Supprime la réaction posée par l'utilisateur sur un message (FEAT-04 Roadmap Cleanly)
 */
export async function deleteDiscordReaction(
  token: string,
  channelId: string,
  messageId: string,
  emoji: { id: string | null; name: string }
): Promise<void> {
  return runWith429Retry(async () => {
    // Si l'emoji est personnalisé, le format Discord est name:id, sinon le nom unicode brut
    const emojiParam = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emojiParam)}/@me`,
      {
        method: 'DELETE',
        headers: getHeaders(token),
      }
    );

    if (!response.ok && response.status !== 404) {
      throwDiscordError(response.status, 'deleteReaction');
    }
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
 * Modifie le contenu d'un message Discord (utilisé pour le Mode Furtif / Ghosting anti-logs)
 * Écrase le message avec un contenu neutre (ex: '.') avant suppression définitive pour tromper les bots de logs
 */
export async function editDiscordMessage(
  token: string,
  channelId: string,
  messageId: string,
  newContent: string = '.'
): Promise<boolean> {
  return runWith429Retry(async () => {
    try {
      const response = await fetch(
        `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
        {
          method: 'PATCH',
          headers: {
            ...getHeaders(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newContent }),
        }
      );

      return response.ok;
    } catch {
      // Si l'édition échoue (ex: message supprimé entre-temps), ne pas bloquer le flux
      return false;
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

/**
 * Recherche instantanée de messages sur un serveur Discord (Fast Search API)
 * Permet de récupérer directement les messages de l'utilisateur sur tous les salons en 1 seule requête
 */
export async function searchDiscordGuildMessages(
  token: string,
  guildId: string,
  options: {
    authorId?: string;
    content?: string;
    has?: 'link' | 'file';
    channelId?: string;
    offset?: number;
  }
): Promise<{ total_results: number; messages: DiscordMessage[] } | null> {
  try {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/messages/search`);
    if (options.authorId) url.searchParams.set('author_id', options.authorId);
    if (options.content) url.searchParams.set('content', options.content);
    if (options.has) url.searchParams.set('has', options.has);
    if (options.channelId) url.searchParams.set('channel_id', options.channelId);
    if (options.offset) url.searchParams.set('offset', String(options.offset));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
    });

    if (response.status === 202 || !response.ok) {
      // 202 = Serveur en cours d'indexation ou non indexé
      return null;
    }

    const data = await response.json();
    const foundMessages: DiscordMessage[] = [];

    if (Array.isArray(data.messages)) {
      for (const group of data.messages) {
        if (Array.isArray(group) && group.length > 0) {
          const hit =
            group.find((m: any) => (options.authorId ? m.author?.id === options.authorId : true)) ??
            group[0];
          if (hit) foundMessages.push(hit);
        }
      }
    }

    return {
      total_results: data.total_results ?? foundMessages.length,
      messages: foundMessages,
    };
  } catch {
    return null;
  }
}

function throwDiscordError(status: number, context: string): never {
  const error = Object.assign(new Error(`Discord API ${context} → HTTP ${status}`), {
    status,
    statusCode: status,
  });
  throw error;
}
