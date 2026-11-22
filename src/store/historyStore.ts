// Store de l'historique des suppressions — persistance locale chiffrée
// Conserve chaque session de nettoyage avec détails (plateforme, cible, filtres, quantité)

import { create } from 'zustand';
import { Platform } from '../types';

let EncryptedStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch {}

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

const HISTORY_STORAGE_KEY = 'cleanly_deletion_history_v1';

export interface HistoryRecord {
  id: string;
  platform: Platform;
  accountName?: string;
  targetName: string; // Ex: "Serveur Discord > 3 salons" ou "Messages Privés (DMs)"
  deletedCount: number;
  totalTargeted: number;
  status: 'completed' | 'interrupted' | 'failed';
  timestamp: number;
  hasBackup?: boolean;
  filters?: {
    keyword?: string;
    dateFilterTitle?: string;
    onlyWithAttachments?: boolean;
    onlyWithLinks?: boolean;
    ignorePinned?: boolean;
    speedTitle?: string;
  };
}

interface HistoryState {
  records: HistoryRecord[];
  isLoaded: boolean;
  loadHistory: () => Promise<void>;
  addRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => Promise<HistoryRecord>;
  deleteRecord: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getTotalDeleted: () => number;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  isLoaded: false,

  loadHistory: async () => {
    try {
      const raw = await safeStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed: HistoryRecord[] = JSON.parse(raw);
        set({ records: Array.isArray(parsed) ? parsed : [], isLoaded: true });
        return;
      }
    } catch (err) {
      console.warn('[HistoryStore] Erreur chargement historique:', err);
    }
    set({ records: [], isLoaded: true });
  },

  addRecord: async (item) => {
    const newRecord: HistoryRecord = {
      ...item,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    const updated = [newRecord, ...get().records];
    set({ records: updated });

    try {
      await safeStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[HistoryStore] Erreur sauvegarde historique:', err);
    }

    return newRecord;
  },

  deleteRecord: async (id: string) => {
    const updated = get().records.filter((r) => r.id !== id);
    set({ records: updated });
    try {
      await safeStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[HistoryStore] Erreur suppression record:', err);
    }
  },

  clearHistory: async () => {
    set({ records: [] });
    try {
      await safeStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (err) {
      console.warn('[HistoryStore] Erreur vidage historique:', err);
    }
  },

  getTotalDeleted: () => {
    return get().records.reduce((acc, curr) => acc + (curr.deletedCount || 0), 0);
  },
}));
