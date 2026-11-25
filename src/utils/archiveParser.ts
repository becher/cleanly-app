// Parseur d'Archive et Package de Données Officiel (FEAT-05 Roadmap Cleanly)
// Permet de contourner les limites d'indexation de l'API de recherche
// Supporte les exports officiels GDPR Discord, Twitter et JSON bruts

import { DiscordMessage } from '../api/discord';

export interface ParseArchiveResult {
  success: boolean;
  messages: DiscordMessage[];
  totalParsed: number;
  error?: string;
}

/**
 * Analyse un texte brut JSON ou une liste d'IDs pour reconstruire des messages ciblés
 */
export function parseOfficialArchive(
  rawContent: string,
  fallbackChannelId: string = 'archive_channel',
  fallbackChannelName: string = 'Archive Officielle'
): ParseArchiveResult {
  if (!rawContent || !rawContent.trim()) {
    return {
      success: false,
      messages: [],
      totalParsed: 0,
      error: 'Le contenu fourni est vide.',
    };
  }

  const trimmed = rawContent.trim();

  // 1. Essai de parsing JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed.messages ?? [parsed];

      const messages: DiscordMessage[] = [];

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;

        // Détection format Discord GDPR (ID en majuscule, Contents, Timestamp)
        const id = String(item.ID ?? item.id ?? item.message_id ?? `msg_${i}`);
        const content = String(item.Contents ?? item.content ?? item.text ?? '');
        const timestamp = String(
          item.Timestamp ?? item.timestamp ?? item.created_at ?? new Date().toISOString()
        );
        const channelId = String(item.channel_id ?? item.ChannelID ?? fallbackChannelId);

        // Validation ID (doit contenir au moins des chiffres)
        if (id && id.length >= 8) {
          messages.push({
            id,
            content,
            timestamp,
            channel_id: channelId,
            channel_name: fallbackChannelName,
            author: {
              id: 'me',
              username: 'Moi',
            },
            attachments: item.Attachments
              ? [{ id: '1', url: String(item.Attachments) }]
              : undefined,
          });
        }
      }

      if (messages.length > 0) {
        return {
          success: true,
          messages,
          totalParsed: messages.length,
        };
      }
    } catch (jsonErr) {
      // Si le JSON échoue, on tente la lecture ligne par ligne d'IDs
    }
  }

  // 2. Format ligne par ligne (IDs de messages ou format CSV/Texte)
  const lines = trimmed.split(/\r?\n/);
  const messagesFromLines: DiscordMessage[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) continue;

    // Détection d'un snowflake ID Discord (17 à 20 chiffres)
    const match = line.match(/\b\d{17,20}\b/);
    if (match) {
      const msgId = match[0];
      messagesFromLines.push({
        id: msgId,
        content: line.replace(msgId, '').trim() || `Message #${msgId}`,
        timestamp: new Date().toISOString(),
        channel_id: fallbackChannelId,
        channel_name: fallbackChannelName,
        author: { id: 'me', username: 'Moi' },
      });
    }
  }

  if (messagesFromLines.length > 0) {
    return {
      success: true,
      messages: messagesFromLines,
      totalParsed: messagesFromLines.length,
    };
  }

  return {
    success: false,
    messages: [],
    totalParsed: 0,
    error: 'Format non reconnu. Collez un export JSON officiel Discord ou une liste d\'identifiants de messages.',
  };
}
