// Service de gestion et d'exécution des règles d'Auto-Clean (Rétention) — FEAT-06
import { useRetentionStore } from '../store/retentionStore';
import { useAuthStore } from '../store/authStore';
import { cleanNotificationService } from './cleanNotificationService';
import type { RetentionRule } from '../types';

export class RetentionService {
  /**
   * Vérifie au lancement ou lors du retour au premier plan si une règle est arrivée à échéance
   */
  async checkDueRetentionRules(): Promise<void> {
    const store = useRetentionStore.getState();
    if (!store.isLoaded) {
      await store.loadRules();
    }

    const { rules } = useRetentionStore.getState();
    const accounts = useAuthStore.getState().accounts;
    const now = Date.now();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Si l'échéance est dépassée (ou si jamais exécuté et délai écoulé)
      if (rule.nextRunAt && now >= rule.nextRunAt) {
        const account = accounts.find((a) => a.id === rule.accountId);
        if (!account) continue;

        // Déclencher une alerte intelligente de rappel pour ce compte
        await cleanNotificationService.notifyRetentionAlert({
          platform: rule.platform,
          accountName: account.displayName || account.username,
          expiredCount: 0, // Estimé lors du scan
          retentionDays: rule.retentionDays,
        });

        // Reprogrammer la prochaine exécution
        await store.updateRuleLastRun(rule.id, 0);
      }
    }
  }

  /**
   * Formatage convivial de la prochaine date d'exécution
   */
  formatNextRun(rule: RetentionRule): string {
    if (!rule.enabled) return 'Désactivé';
    if (!rule.nextRunAt) return 'Planification en attente';

    const diffMs = rule.nextRunAt - Date.now();
    if (diffMs <= 0) return 'Prêt maintenant';

    const diffHours = Math.ceil(diffMs / (3600 * 1000));
    if (diffHours < 24) return `Dans ~${diffHours}h`;

    const diffDays = Math.ceil(diffMs / (24 * 3600 * 1000));
    return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }

  /**
   * Libellé clair de la règle
   */
  formatRuleSummary(rule: RetentionRule): string {
    const periodMap: Record<number, string> = {
      7: '1 semaine',
      14: '2 semaines',
      30: '1 mois',
      90: '3 mois',
      180: '6 mois',
      365: '1 an',
    };
    const periodStr = periodMap[rule.retentionDays] ?? `${rule.retentionDays} jours`;

    const freqMap: Record<string, string> = {
      daily: 'chaque jour',
      weekly: 'chaque semaine',
      monthly: 'chaque mois',
    };
    const freqStr = freqMap[rule.frequency] ?? rule.frequency;

    const scopeMap: Record<string, string> = {
      all: 'DMs + Serveurs',
      dms: 'DMs seuls',
      guilds: 'Serveurs',
    };
    const scopeStr = scopeMap[rule.targetScope ?? 'all'] ?? 'DMs + Serveurs';

    return `Garder ${periodStr} max • ${scopeStr} • ${freqStr}`;
  }
}

export const retentionService = new RetentionService();
