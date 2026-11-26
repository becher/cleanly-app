// Store de gestion des règles de rétention (Auto-Clean) — FEAT-06 Cleanly
// Sauvegarde chiffrée locale avec fallback mémoire transparent

import { create } from 'zustand';
import type { RetentionRule } from '../types';

let EncryptedStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch {
  // Fallback
}

const memoryStore: Record<string, string> = {};

const safeStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (EncryptedStorage) {
        await EncryptedStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStore[key] = value;
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (EncryptedStorage) {
        const val = await EncryptedStorage.getItem(key);
        if (val !== undefined && val !== null) return val;
      }
    } catch {}
    return memoryStore[key] ?? null;
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (EncryptedStorage) {
        await EncryptedStorage.removeItem(key);
        return;
      }
    } catch {}
    delete memoryStore[key];
  },
};

const RETENTION_RULES_KEY = 'cleanly_retention_rules_v1';

interface RetentionState {
  rules: RetentionRule[];
  isLoaded: boolean;
  loadRules: () => Promise<void>;
  saveRule: (rule: RetentionRule) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  toggleRule: (ruleId: string, enabled: boolean) => Promise<void>;
  updateRuleLastRun: (ruleId: string, cleanedCount?: number) => Promise<void>;
  getRuleForAccount: (accountId: string) => RetentionRule | undefined;
}

export const useRetentionStore = create<RetentionState>((set, get) => ({
  rules: [],
  isLoaded: false,

  loadRules: async () => {
    try {
      const raw = await safeStorage.getItem(RETENTION_RULES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ rules: parsed, isLoaded: true });
          return;
        }
      }
    } catch (e) {
      console.warn('Erreur chargement retention rules:', e);
    }
    set({ rules: [], isLoaded: true });
  },

  saveRule: async (rule: RetentionRule) => {
    const current = get().rules;
    const exists = current.some((r) => r.id === rule.id);
    const updated = exists
      ? current.map((r) => (r.id === rule.id ? rule : r))
      : [...current, rule];

    set({ rules: updated });
    try {
      await safeStorage.setItem(RETENTION_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde retention rule:', e);
    }
  },

  deleteRule: async (ruleId: string) => {
    const updated = get().rules.filter((r) => r.id !== ruleId);
    set({ rules: updated });
    try {
      await safeStorage.setItem(RETENTION_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur suppression retention rule:', e);
    }
  },

  toggleRule: async (ruleId: string, enabled: boolean) => {
    const current = get().rules;
    const updated = current.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    set({ rules: updated });
    try {
      await safeStorage.setItem(RETENTION_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur toggle retention rule:', e);
    }
  },

  updateRuleLastRun: async (ruleId: string, cleanedCount: number = 0) => {
    const current = get().rules;
    const now = Date.now();
    const updated = current.map((r) => {
      if (r.id !== ruleId) return r;
      // Calcul du prochain run selon la fréquence
      let intervalMs = 24 * 3600 * 1000; // daily
      if (r.frequency === '1min') intervalMs = 60 * 1000;
      if (r.frequency === 'weekly') intervalMs = 7 * 24 * 3600 * 1000;
      if (r.frequency === 'monthly') intervalMs = 30 * 24 * 3600 * 1000;

      return {
        ...r,
        lastRunAt: now,
        nextRunAt: now + intervalMs,
        autoCleanedCount: (r.autoCleanedCount ?? 0) + cleanedCount,
      };
    });

    set({ rules: updated });
    try {
      await safeStorage.setItem(RETENTION_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur mise à jour last run retention rule:', e);
    }
  },

  getRuleForAccount: (accountId: string) => {
    return get().rules.find((r) => r.accountId === accountId);
  },
}));
