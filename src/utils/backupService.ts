// Service de sauvegarde (Backup) des messages avant suppression
// Permet d'exporter les messages au format TXT ou JSON via le partage Android/iOS
// et de les stocker de manière sécurisée et chiffrée sur le téléphone

import { Share, Alert } from 'react-native';
import { DiscordMessage } from '../api/discord';

let EncryptedStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch {}

const BACKUP_PREFIX = 'cleanly_backup_';

export interface BackupMetadata {
  id: string;
  platform: string;
  targetName: string;
  createdAt: number;
  totalMessages: number;
}

/**
 * Génère un export lisible au format Texte / Markdown
 */
export function formatBackupAsText(messages: DiscordMessage[], targetName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [
    '================================================================================',
    '                   CLEANLY — SAUVEGARDE DE MESSAGES DISCORD                     ',
    '================================================================================',
    `Date de l'export   : ${dateStr}`,
    `Cible nettoyée    : ${targetName}`,
    `Nombre de messages : ${messages.length}`,
    '================================================================================\n',
  ];

  messages.forEach((msg, idx) => {
    const msgDate = new Date(msg.timestamp);
    const dateFormatted = isNaN(msgDate.getTime())
      ? msg.timestamp
      : msgDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

    lines.push(`[#${idx + 1}] — [${dateFormatted}] • Salon: #${msg.channel_name ?? msg.channel_id}`);
    lines.push(`Message ID : ${msg.id}`);
    lines.push(`Contenu    :`);
    lines.push(msg.content ? msg.content : '(Message sans texte / média uniquement)');

    if (msg.attachments && msg.attachments.length > 0) {
      lines.push(`Pièces jointes (${msg.attachments.length}) :`);
      msg.attachments.forEach((att) => {
        lines.push(`  - ${att.filename || 'fichier'} (${att.url})`);
      });
    }

    lines.push('--------------------------------------------------------------------------------\n');
  });

  lines.push('Fin du rapport de sauvegarde Cleanly.');
  return lines.join('\n');
}

/**
 * Génère un export complet au format JSON
 */
export function formatBackupAsJson(messages: DiscordMessage[], targetName: string): string {
  const exportData = {
    generator: 'Cleanly App (https://cleanly.app)',
    version: '1.0',
    platform: 'discord',
    exportedAt: new Date().toISOString(),
    target: targetName,
    totalMessages: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      channel_id: m.channel_id,
      channel_name: m.channel_name,
      author_id: m.author?.id,
      author_name: m.author?.username,
      content: m.content,
      timestamp: m.timestamp,
      attachments: m.attachments,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Ouvre la feuille de partage native Android / iOS pour sauvegarder ou exporter le fichier
 */
export async function shareMessagesBackup(
  messages: DiscordMessage[],
  targetName: string,
  format: 'txt' | 'json' = 'txt'
): Promise<boolean> {
  if (messages.length === 0) {
    Alert.alert('Aucun message', 'Il n’y a aucun message sélectionné à sauvegarder.');
    return false;
  }

  try {
    const isJson = format === 'json';
    const content = isJson
      ? formatBackupAsJson(messages, targetName)
      : formatBackupAsText(messages, targetName);

    const safeTarget = targetName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
    const fileName = `Cleanly_Discord_${safeTarget}_${Date.now()}.${isJson ? 'json' : 'txt'}`;

    const res = await Share.share(
      {
        title: `Sauvegarde Cleanly Discord (${messages.length} messages)`,
        message: content,
      },
      {
        dialogTitle: `Sauvegarder ${messages.length} message(s) Cleanly`,
      }
    );

    return res.action === Share.sharedAction;
  } catch (err) {
    console.warn('[backupService] Erreur partage backup:', err);
    Alert.alert('Erreur', 'Impossible d’ouvrir le partage de la sauvegarde.');
    return false;
  }
}

/**
 * Sauvegarde les messages dans le stockage local chiffré de Cleanly
 */
export async function saveBackupLocally(recordId: string, messages: DiscordMessage[]): Promise<boolean> {
  if (!messages || messages.length === 0) return false;
  try {
    if (EncryptedStorage) {
      await EncryptedStorage.setItem(
        `${BACKUP_PREFIX}${recordId}`,
        JSON.stringify(messages)
      );
      return true;
    }
  } catch (err) {
    console.warn('[backupService] Erreur sauvegarde locale:', err);
  }
  return false;
}

/**
 * Récupère les messages d'une sauvegarde locale
 */
export async function loadLocalBackup(recordId: string): Promise<DiscordMessage[] | null> {
  try {
    if (EncryptedStorage) {
      const raw = await EncryptedStorage.getItem(`${BACKUP_PREFIX}${recordId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn('[backupService] Erreur lecture sauvegarde locale:', err);
  }
  return null;
}
