// Processeur de la queue de suppression
// Lit la queue SQLite et exécute les suppressions avec délais

import { deleteDiscordMessage } from '../api/discord';

// Type d'une tâche dans la queue
type QueueTask = {
  id: number;
  platform: string;
  contentId: string;    // ID du post/message à supprimer
  channelId?: string;   // Pour Discord : ID du canal
  token: string;        // Token OAuth (lu depuis SecureStore)
  status: 'pending' | 'in_progress' | 'done' | 'failed';
};

/**
 * Traite la prochaine tâche en attente dans la queue
 * À appeler depuis un BackgroundFetch ou depuis l'UI
 */
export async function processNextTask(task: QueueTask): Promise<'done' | 'failed'> {
  try {
    switch (task.platform) {
      case 'discord':
        if (!task.channelId) throw new Error('channelId requis pour Discord');
        await deleteDiscordMessage(task.token, task.channelId, task.contentId);
        break;

      // Autres plateformes → à implémenter
      case 'twitter':
      case 'reddit':
      case 'bluesky':
      case 'mastodon':
      case 'threads':
      case 'youtube':
      case 'teams':
        console.log(`[Queue] Plateforme ${task.platform} → à implémenter`);
        break;

      default:
        throw new Error(`Plateforme inconnue : ${task.platform}`);
    }

    return 'done';
  } catch (error) {
    console.error(`[Queue] Échec tâche ${task.id}:`, error);
    return 'failed';
  }
}

/**
 * Traite un lot de tâches en séquence (pas en parallèle — pour respecter les rate limits)
 */
export async function processBatch(
  tasks: QueueTask[],
  onTaskDone?: (taskId: number, status: 'done' | 'failed') => void
): Promise<void> {
  for (const task of tasks) {
    const status = await processNextTask(task);
    onTaskDone?.(task.id, status);
  }
}

