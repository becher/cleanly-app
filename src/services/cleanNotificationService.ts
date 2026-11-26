import notifee, {
  AndroidImportance,
  AndroidColor,
  EventType,
  TriggerType,
  TimestampTrigger,
  AlarmType,
  RepeatFrequency,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import type { RetentionRule } from '../types';

export type CleanPlatformType =
  | 'discord'
  | 'twitter'
  | 'reddit'
  | 'bluesky'
  | 'mastodon'
  | 'threads'
  | 'teams'
  | 'youtube'
  | string;

interface PlatformConfig {
  displayName: string;
  brandColor: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  discord: { displayName: 'Discord', brandColor: '#5865F2' },
  twitter: { displayName: 'X (Twitter)', brandColor: '#1DA1F2' },
  reddit: { displayName: 'Reddit', brandColor: '#FF4500' },
  bluesky: { displayName: 'Bluesky', brandColor: '#0085FF' },
  mastodon: { displayName: 'Mastodon', brandColor: '#6364FF' },
  threads: { displayName: 'Threads', brandColor: '#000000' },
  teams: { displayName: 'Microsoft Teams', brandColor: '#6264A7' },
  youtube: { displayName: 'YouTube', brandColor: '#FF0000' },
};

function getPlatformConfig(platform: CleanPlatformType): PlatformConfig {
  return (
    PLATFORM_CONFIGS[platform.toLowerCase()] || {
      displayName: platform,
      brandColor: '#5865F2',
    }
  );
}

let foregroundServiceResolver: (() => void) | null = null;

// Enregistrement obligatoire du runner de Foreground Service pour Android
// Sans ceci, le HeadlessTask Android s'éteint et suspend le JS dès que l'app passe en arrière-plan !
if (Platform.OS === 'android') {
  notifee.registerForegroundService((notification) => {
    return new Promise<void>((resolve) => {
      foregroundServiceResolver = resolve;
    });
  });

  notifee.onBackgroundEvent(async () => {
    // Événement d'arrière-plan (requis par Notifee pour éviter le warning)
  });
}

class CleanNotificationService {
  private channelsCreated = false;
  private isForegroundRunning = false;
  private lastUpdateTimestamp = 0;

  private finishForegroundRunner(): void {
    if (foregroundServiceResolver) {
      try {
        foregroundServiceResolver();
      } catch (e) {
        // Ignorer
      }
      foregroundServiceResolver = null;
    }
  }

  /**
   * Initialise les canaux de notification Android (silencieux pour la progression, sonore pour la fin)
   */
  async initNotificationChannels(): Promise<void> {
    if (this.channelsCreated || Platform.OS !== 'android') {
      return;
    }

    try {
      // 1. Canal pour la progression en direct (Foreground Service silencieux pour ne pas spammer)
      await notifee.createChannel({
        id: 'cleanly_cleaning',
        name: 'Nettoyage en cours (Progression)',
        description: 'Affiche la progression en temps réel pendant la suppression des messages',
        importance: AndroidImportance.LOW,
        vibration: false,
      });

      // 2. Canal pour les résultats et alertes de fin (Haute priorité avec son et vibration)
      await notifee.createChannel({
        id: 'cleanly_results',
        name: 'Résultats de nettoyage',
        description: 'Vous avertit lorsque la suppression est terminée en arrière-plan',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      // 3. Canal pour l'Auto-Clean et les rappels de rétention (FEAT-06)
      await notifee.createChannel({
        id: 'cleanly_retention',
        name: 'Auto-Clean & Rappels de rétention',
        description: 'Vous avertit des messages anciens prêts à être purgés selon vos règles',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      this.channelsCreated = true;
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur création canaux:', e);
    }
  }

  /**
   * Demande la permission de notifications (requise sur Android 13+ et iOS)
   */
  async requestPermission(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 1; // 1 = Authorized, 2 = Provisional
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur demande permission:', e);
      return false;
    }
  }

  /**
   * Démarre la notification persistante de suppression (Foreground Service)
   */
  async startCleanProgress({
    platform,
    targetCount,
    initialCount = 0,
    isGhostMode = false,
  }: {
    platform: CleanPlatformType;
    targetCount: number;
    initialCount?: number;
    isGhostMode?: boolean;
  }): Promise<void> {
    try {
      await this.initNotificationChannels();
      const config = getPlatformConfig(platform);
      this.isForegroundRunning = true;
      this.lastUpdateTimestamp = Date.now();

      const subtitle = isGhostMode ? 'Mode Furtif actif • Anti-logs' : 'Suppression en direct';

      if (Platform.OS === 'android') {
        await notifee.displayNotification({
          id: 'cleanly_cleaning_progress',
          title: `Cleanly — Nettoyage ${config.displayName}`,
          body: `${initialCount} / ${targetCount} éléments traités (0%)\n${subtitle}`,
          android: {
            channelId: 'cleanly_cleaning',
            asForegroundService: true,
            ongoing: true,
            autoCancel: false,
            color: config.brandColor,
            colorized: false,
            progress: {
              max: targetCount,
              current: initialCount,
              indeterminate: targetCount <= 0,
            },
            pressAction: {
              id: 'default',
            },
          },
        });
      }
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur startCleanProgress:', e);
    }
  }

  /**
   * Met à jour la barre de progression native en direct (throttled pour préserver les perfs)
   */
  async updateCleanProgress({
    platform,
    currentCount,
    targetCount,
    isPaused = false,
  }: {
    platform: CleanPlatformType;
    currentCount: number;
    targetCount: number;
    isPaused?: boolean;
  }): Promise<void> {
    if (!this.isForegroundRunning || Platform.OS !== 'android') {
      return;
    }

    // Éviter les mises à jour trop fréquentes (max 1 mise à jour toutes les 600ms sauf si complété)
    const now = Date.now();
    if (currentCount < targetCount && now - this.lastUpdateTimestamp < 600) {
      return;
    }
    this.lastUpdateTimestamp = now;

    try {
      const config = getPlatformConfig(platform);
      const percent = targetCount > 0 ? Math.round((currentCount / targetCount) * 100) : 0;
      const statusPrefix = isPaused ? '⏸️ En pause' : '🧹 Suppression';

      await notifee.displayNotification({
        id: 'cleanly_cleaning_progress',
        title: `${statusPrefix} ${config.displayName} — ${percent}%`,
        body: `${currentCount} / ${targetCount} éléments traités • Ne pas fermer l'app`,
        android: {
          channelId: 'cleanly_cleaning',
          asForegroundService: true,
          ongoing: true,
          autoCancel: false,
          color: config.brandColor,
          progress: {
            max: targetCount,
            current: currentCount,
            indeterminate: false,
          },
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur updateCleanProgress:', e);
    }
  }

  /**
   * Notifie l'utilisateur de la fin du nettoyage (avec sonnerie et vibration)
   * et arrête le Foreground Service
   */
  async notifyCleanComplete({
    platform,
    deletedCount,
    failedCount = 0,
  }: {
    platform: CleanPlatformType;
    deletedCount: number;
    failedCount?: number;
  }): Promise<void> {
    try {
      this.isForegroundRunning = false;
      this.finishForegroundRunner();

      // 1. Arrêter le Foreground Service et supprimer immédiatement la notification d'avancement
      if (Platform.OS === 'android') {
        await notifee.stopForegroundService();
        await notifee.cancelNotification('cleanly_cleaning_progress');
        await notifee.cancelDisplayedNotification('cleanly_cleaning_progress');
      }

      await this.initNotificationChannels();
      const config = getPlatformConfig(platform);

      const title = `🎉 Nettoyage ${config.displayName} terminé !`;
      let body = `${deletedCount} élément${deletedCount > 1 ? 's' : ''} supprimé${deletedCount > 1 ? 's' : ''} avec succès.`;
      if (failedCount > 0) {
        body += ` (${failedCount} échec${failedCount > 1 ? 's' : ''})`;
      }

      // 2. Afficher la notification finale
      await notifee.displayNotification({
        id: 'cleanly_cleaning_complete',
        title,
        body,
        android: {
          channelId: 'cleanly_results',
          sound: 'default',
          color: '#10B981',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur notifyCleanComplete:', e);
    }
  }

  /**
   * Arrête le service en arrière-plan sans notification de succès (ex: utilisateur appuie sur Arrêter)
   */
  async notifyCleanStopped({
    platform,
    deletedCount,
  }: {
    platform: CleanPlatformType;
    deletedCount: number;
  }): Promise<void> {
    try {
      this.isForegroundRunning = false;
      this.finishForegroundRunner();

      if (Platform.OS === 'android') {
        await notifee.stopForegroundService();
        await notifee.cancelNotification('cleanly_cleaning_progress');
        await notifee.cancelDisplayedNotification('cleanly_cleaning_progress');
      }

      await this.initNotificationChannels();
      const config = getPlatformConfig(platform);

      await notifee.displayNotification({
        id: 'cleanly_cleaning_stopped',
        title: `Nettoyage ${config.displayName} interrompu`,
        body: `Processus arrêté. ${deletedCount} élément${deletedCount > 1 ? 's ont' : ' a'} été supprimé${deletedCount > 1 ? 's' : ''}.`,
        android: {
          channelId: 'cleanly_results',
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur notifyCleanStopped:', e);
    }
  }

  /**
   * Alerte l'utilisateur que des messages anciens dépassent sa règle de rétention (FEAT-06)
   */
  async notifyRetentionAlert({
    platform,
    accountName,
    expiredCount,
    retentionDays,
  }: {
    platform: CleanPlatformType;
    accountName: string;
    expiredCount: number;
    retentionDays: number;
  }): Promise<void> {
    try {
      await this.initNotificationChannels();
      const config = getPlatformConfig(platform);
      const daysText =
        retentionDays === -2
          ? 'Tous les messages'
          : retentionDays === 1
          ? '24 heures'
          : `${retentionDays} jours`;

      await notifee.displayNotification({
        id: `retention_${platform}`,
        title: `Auto-Clean ${config.displayName} : purge prête`,
        body: `Des messages de ${accountName} dépassent votre règle de rétention (${daysText}). Touchez pour exécuter.`,
        android: {
          channelId: 'cleanly_retention',
          color: config.brandColor,
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur notifyRetentionAlert:', e);
    }
  }

  /**
   * Notification immédiate après la sauvegarde pour confirmer que la tâche est activée & armée
   */
  async notifyRetentionScheduled({
    platform,
    accountName,
    retentionDays,
    frequency,
  }: {
    platform: CleanPlatformType;
    accountName: string;
    retentionDays: number;
    frequency: string;
  }): Promise<void> {
    try {
      await this.initNotificationChannels();
      const config = getPlatformConfig(platform);
      const daysText =
        retentionDays === -2
          ? 'Tous les messages'
          : retentionDays === 1
          ? '24 heures'
          : `${retentionDays} jours`;
      const freqText =
        frequency === 'daily'
          ? 'quotidien'
          : frequency === 'weekly'
          ? 'hebdomadaire'
          : 'mensuel';

      await notifee.displayNotification({
        id: `retention_scheduled_${platform}`,
        title: `Auto-Clean ${config.displayName} programmé`,
        body: `Règle active pour ${accountName} (> ${daysText}) • Passage : ${freqText}.`,
        android: {
          channelId: 'cleanly_retention',
          color: config.brandColor,
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur notifyRetentionScheduled:', e);
    }
  }

  /**
   * Planifie un réveil natif du système (AlarmManager Android / iOS Background)
   * Déclenche la notification même si l'application a été tuée / fermée
   */
  async scheduleRetentionTrigger(rule: RetentionRule): Promise<void> {
    try {
      await this.initNotificationChannels();
      const config = getPlatformConfig(rule.platform);
      const triggerId = `trigger_retention_${rule.id}`;

      // Annuler l'ancien trigger s'il existait
      try {
        await notifee.cancelTriggerNotification(triggerId);
      } catch (e) {
        // Ignorer
      }

      if (!rule.enabled || !rule.nextRunAt) return;

      const daysText =
        rule.retentionDays === -2
          ? 'Tous les messages'
          : rule.retentionDays === 1
          ? '24 heures'
          : `${rule.retentionDays} jours`;

      // Si l'échéance est passée, déclencher dans 5 secondes
      const fireTime = rule.nextRunAt > Date.now() ? rule.nextRunAt : Date.now() + 5000;

      const repeatFreq =
        rule.frequency === 'daily'
          ? RepeatFrequency.DAILY
          : rule.frequency === 'weekly'
          ? RepeatFrequency.WEEKLY
          : RepeatFrequency.NONE;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: fireTime,
        repeatFrequency: repeatFreq,
        alarmManager: {
          type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        },
      };

      await notifee.createTriggerNotification(
        {
          id: triggerId,
          title: `Auto-Clean ${config.displayName} : purge prête`,
          body: `Vos messages de plus de ${daysText} sont prêts à être nettoyés. Touchez pour lancer la purge.`,
          data: {
            ruleId: rule.id,
            platform: rule.platform,
            accountId: rule.accountId,
            action: 'auto_clean_ready',
          },
          android: {
            channelId: 'cleanly_retention',
            color: config.brandColor,
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            sound: 'default',
          },
        },
        trigger
      );
    } catch (e) {
      console.warn('[CleanNotificationService] Erreur scheduleRetentionTrigger:', e);
    }
  }

  /**
   * Annule le trigger natif d'une règle (ex: suppression de règle ou désactivation)
   */
  async cancelRetentionTrigger(ruleId: string): Promise<void> {
    try {
      await notifee.cancelTriggerNotification(`trigger_retention_${ruleId}`);
    } catch (e) {
      // Ignorer si inexistant
    }
  }

  /**
   * Synchronise tous les triggers natifs pour l'ensemble des règles actives
   */
  async syncAllRetentionTriggers(rules: RetentionRule[]): Promise<void> {
    for (const rule of rules) {
      if (rule.enabled) {
        await this.scheduleRetentionTrigger(rule);
      } else {
        await this.cancelRetentionTrigger(rule.id);
      }
    }
  }
}

export const cleanNotificationService = new CleanNotificationService();
