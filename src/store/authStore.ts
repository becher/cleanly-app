import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { PlatformAccount, Platform } from '../types';

interface AuthState {
  accounts: Record<string, PlatformAccount>;
  addAccount: (account: PlatformAccount) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  getToken: (platform: Platform) => Promise<string | null>;
  loadAccounts: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts: {},

  addAccount: async (account) => {
    // Stocker le token chiffré (AES-256-GCM via Android Keystore)
    await SecureStore.setItemAsync(
      `token_${account.id}`,
      account.token,
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
    // Stocker les métadonnées (sans le token)
    const { token, ...meta } = account;
    await SecureStore.setItemAsync(`account_${account.id}`, JSON.stringify(meta));
    set((state) => ({
      accounts: { ...state.accounts, [account.id]: account },
    }));
  },

  removeAccount: async (accountId) => {
    await SecureStore.deleteItemAsync(`token_${accountId}`);
    await SecureStore.deleteItemAsync(`account_${accountId}`);
    set((state) => {
      const { [accountId]: _, ...rest } = state.accounts;
      return { accounts: rest };
    });
  },

  getToken: async (platform) => {
    const accounts = get().accounts;
    const account = Object.values(accounts).find((a) => a.platform === platform);
    if (!account) return null;
    return SecureStore.getItemAsync(`token_${account.id}`);
  },

  loadAccounts: async () => {
    // Charger les comptes depuis SecureStore au démarrage
    // (implémentation complète à venir)
  },
}));
