// Hook useConnect — gère la connexion OAuth pour chaque plateforme
// Utilise authStore pour sauvegarder les tokens dans SecureStore

import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { connectDiscord, getDiscordAvatarUrl } from '../api/discord-oauth';
import type { Platform } from '../types';

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';

export function useConnect(platformId: Platform) {
  const [state, setState] = useState<ConnectState>('idle');
  const addAccount = useAuthStore((s) => s.addAccount);

  async function connect() {
    setState('connecting');
    try {
      switch (platformId) {
        case 'discord': {
          const { token, profile } = await connectDiscord();

          await addAccount({
            id:          `discord_${profile.id}`,
            platform:    'discord',
            username:    profile.username,
            displayName: profile.global_name ?? profile.username,
            avatar:      getDiscordAvatarUrl(profile.id, profile.avatar),
            token:       token.accessToken,
            // Stocker aussi le refresh token si présent
            ...(token.refreshToken && { refreshToken: token.refreshToken }),
          } as any);

          setState('success');
          break;
        }

        // Autres plateformes → à implémenter
        case 'twitter':
        case 'reddit':
        case 'bluesky':
        case 'mastodon':
        case 'threads':
        case 'youtube':
        case 'teams':
          Alert.alert(
            'Bientôt disponible',
            `La connexion ${platformId} arrive dans la prochaine version.`,
            [{ text: 'OK' }]
          );
          setState('idle');
          break;

        default:
          setState('idle');
      }
    } catch (error: unknown) {
      setState('error');
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      // Ne pas logger le token (sécurité)
      if (!msg.includes('access_token')) {
        Alert.alert('Connexion échouée', msg);
      }
    }
  }

  return { connect, state, isConnecting: state === 'connecting' };
}
