// Store d'authentification — comptes connectés
// Tokens chiffrés via react-native-encrypted-storage (AES-256-GCM + Android Keystore)
// avec fallback mémoire transparent

import { create } from 'zustand';
import { PlatformAccount, Platform } from '../types';

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

interface AuthState {
  accounts: PlatformAccount[];
  addAccount: (account: PlatformAccount) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  getToken: (platform: Platform) => Promise<string | null>;
  loadAccounts: () => Promise<void>;
}

const ACCOUNTS_INDEX_KEY = 'cleanly_accounts_index';

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts: [],

  addAccount: async (account) => {
    await safeStorage.setItem(`token_${account.id}`, account.token);

    const { token, ...meta } = account;
    await safeStorage.setItem(`account_${account.id}`, JSON.stringify(meta));

    const currentIds = get().accounts.map((a) => a.id);
    if (!currentIds.includes(account.id)) {
      const newIds = [...currentIds, account.id];
      await safeStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(newIds));
    }

    set((state) => ({
      accounts: [
        ...state.accounts.filter((a) => a.id !== account.id),
        account,
      ],
    }));
  },

  removeAccount: async (accountId) => {
    await safeStorage.removeItem(`token_${accountId}`);
    await safeStorage.removeItem(`account_${accountId}`);

    const newIds = get().accounts
      .filter((a) => a.id !== accountId)
      .map((a) => a.id);
    await safeStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(newIds));

    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== accountId),
    }));
  },

  getToken: async (platform) => {
    const account = get().accounts.find((a) => a.platform === platform);
    if (!account) return null;
    return safeStorage.getItem(`token_${account.id}`);
  },

  loadAccounts: async () => {
    try {
      const indexJson = await safeStorage.getItem(ACCOUNTS_INDEX_KEY);
      if (!indexJson) return;

      const ids: string[] = JSON.parse(indexJson);
      const accounts: PlatformAccount[] = [];

      for (const id of ids) {
        const metaJson = await safeStorage.getItem(`account_${id}`);
        const token = await safeStorage.getItem(`token_${id}`);
        if (metaJson && token) {
          accounts.push({ ...JSON.parse(metaJson), token });
        }
      }

      set({ accounts });
    } catch (e) {
      console.warn('Erreur chargement comptes:', e);
    }
  },
}));
