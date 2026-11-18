// Store d'authentification — comptes connectés
// Tokens chiffrés via expo-secure-store (AES-256-GCM + Android Keystore)

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { PlatformAccount, Platform } from '../types';

interface AuthState {
  // Comptes comme tableau (plus pratique pour les listes UI)
  accounts: PlatformAccount[];
  addAccount: (account: PlatformAccount) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  getToken: (platform: Platform) => Promise<string | null>;
  loadAccounts: () => Promise<void>;
}

// Clé SecureStore pour la liste des IDs de comptes
const ACCOUNTS_INDEX_KEY = 'cleanly_accounts_index';

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts: [],

  addAccount: async (account) => {
    // 1. Stocker le token chiffré (jamais en clair dans le store)
    await SecureStore.setItemAsync(
      `token_${account.id}`,
      account.token,
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );

    // 2. Stocker les métadonnées (sans le token)
    const { token, ...meta } = account;
    await SecureStore.setItemAsync(`account_${account.id}`, JSON.stringify(meta));

    // 3. Mettre à jour l'index des IDs
    const currentIds = get().accounts.map((a) => a.id);
    if (!currentIds.includes(account.id)) {
      const newIds = [...currentIds, account.id];
      await SecureStore.setItemAsync(ACCOUNTS_INDEX_KEY, JSON.stringify(newIds));
    }

    // 4. Mettre à jour le state (avec token pour usage interne)
    set((state) => ({
      accounts: [
        ...state.accounts.filter((a) => a.id !== account.id),
        account,
      ],
    }));
  },

  removeAccount: async (accountId) => {
    // Supprimer les données SecureStore
    await SecureStore.deleteItemAsync(`token_${accountId}`);
    await SecureStore.deleteItemAsync(`account_${accountId}`);

    // Mettre à jour l'index
    const newIds = get().accounts
      .filter((a) => a.id !== accountId)
      .map((a) => a.id);
    await SecureStore.setItemAsync(ACCOUNTS_INDEX_KEY, JSON.stringify(newIds));

    // Mettre à jour le state
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== accountId),
    }));
  },

  getToken: async (platform) => {
    const account = get().accounts.find((a) => a.platform === platform);
    if (!account) return null;
    // Lire depuis SecureStore (source de vérité pour les tokens)
    return SecureStore.getItemAsync(`token_${account.id}`);
  },

  loadAccounts: async () => {
    // Charger les IDs depuis SecureStore
    const indexJson = await SecureStore.getItemAsync(ACCOUNTS_INDEX_KEY);
    if (!indexJson) return;

    const ids: string[] = JSON.parse(indexJson);
    const accounts: PlatformAccount[] = [];

    for (const id of ids) {
      const metaJson = await SecureStore.getItemAsync(`account_${id}`);
      const token = await SecureStore.getItemAsync(`token_${id}`);
      if (metaJson && token) {
        accounts.push({ ...JSON.parse(metaJson), token });
      }
    }

    set({ accounts });
  },
}));
