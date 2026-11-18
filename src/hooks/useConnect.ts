// Hook useConnect — connexion OAuth
// Utilise import() dynamique → les modules natifs ne chargent QUE quand on clique

import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { isExpoGo } from '../utils/environment';
import type { Platform } from '../types';

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';

export function useConnect(platformId: Platform) {
  const [state, setState] = useState<ConnectState>('idle');
  const addAccount = useAuthStore((s) => s.addAccount);

  async function connect() {
    // Sur Expo Go : OAuth n'est pas supporté (expo-crypto natif requis)
    if (isExpoGo) {
      Alert.alert(
        '🔧 Dev build requis',
        'L\'authentification OAuth nécessite un build natif.\n\nCommande : eas build --profile development',
        [{ text: 'Compris' }]
      );
      return;
    }

    setState('connecting');
    try {
      switch (platformId) {
        case 'discord': {
          // import() dynamique — chargé uniquement au clic, pas au bundle
          const { connectDiscord, getDiscordAvatarUrl } =
            await import('../api/discord-oauth');

          const { token, profile } = await connectDiscord();

          await addAccount({
            id:           `discord_${profile.id}`,
            platform:     'discord',
            username:     profile.username,
            displayName:  profile.global_name ?? profile.username,
            avatar:       getDiscordAvatarUrl(profile.id, profile.avatar),
            token:        token.accessToken,
            refreshToken: token.refreshToken,
            connectedAt:  Date.now(),
          });

          setState('success');
          Alert.alert('✅ Connecté !', `Discord connecté en tant que ${profile.username}`);
          break;
        }

        default:
          Alert.alert(
            'Bientôt disponible',
            `La connexion ${platformId} arrive dans la prochaine version.`
          );
          setState('idle');
      }
    } catch (error: unknown) {
      setState('error');
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      if (!msg.toLowerCase().includes('token') && !msg.toLowerCase().includes('annulé')) {
        Alert.alert('Connexion échouée', msg);
      } else {
        setState('idle');
      }
    }
  }

  return { connect, state, isConnecting: state === 'connecting' };
}
