// Réseaux — Connexion native aux plateformes
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { DiscordLoginModal } from '../components/DiscordLoginModal';
import { fetchDiscordProfile, getDiscordAvatarUrl } from '../api/discord-oauth';
import type { Platform } from '../types';

const PHASE1: { id: Platform; name: string; lib: 'fa5' | 'mci'; icon: string }[] = [
  { id: 'discord',  name: 'Discord',          lib: 'fa5', icon: 'discord'          },
  { id: 'twitter',  name: 'X / Twitter',       lib: 'fa5', icon: 'twitter'          },
  { id: 'reddit',   name: 'Reddit',            lib: 'fa5', icon: 'reddit'           },
  { id: 'mastodon', name: 'Mastodon',          lib: 'fa5', icon: 'mastodon'         },
  { id: 'youtube',  name: 'YouTube',           lib: 'fa5', icon: 'youtube'          },
  { id: 'bluesky',  name: 'Bluesky',           lib: 'mci', icon: 'butterfly'        },
  { id: 'threads',  name: 'Threads',           lib: 'mci', icon: 'at'               },
  { id: 'teams',    name: 'Microsoft Teams',   lib: 'mci', icon: 'microsoft-teams'  },
];

const PHASE2 = [
  { id: 'instagram', name: 'Instagram', lib: 'fa5' as const, icon: 'instagram' },
  { id: 'facebook',  name: 'Facebook',  lib: 'fa5' as const, icon: 'facebook'  },
  { id: 'linkedin',  name: 'LinkedIn',  lib: 'fa5' as const, icon: 'linkedin'  },
  { id: 'tiktok',   name: 'TikTok',    lib: 'fa5' as const, icon: 'tiktok'    },
];

export function NetworksScreen() {
  const accounts = useAuthStore((s) => s.accounts);
  const addAccount = useAuthStore((s) => s.addAccount);
  const removeAccount = useAuthStore((s) => s.removeAccount);

  const [loadingPlatform, setLoadingPlatform] = useState<Platform | null>(null);
  const [showDiscordLogin, setShowDiscordLogin] = useState(false);

  const handleStartConnect = (platformId: Platform) => {
    switch (platformId) {
      case 'discord':
        setShowDiscordLogin(true);
        break;

      default:
        Alert.alert('Bientôt disponible', `La connexion ${platformId} arrive dans la prochaine version.`);
    }
  };

  const handleDiscordSuccess = async (userToken: string) => {
    setLoadingPlatform('discord');
    try {
      const profile = await fetchDiscordProfile(userToken);
      await addAccount({
        id: `discord_${profile.id}`,
        platform: 'discord',
        username: profile.username,
        displayName: profile.global_name ?? profile.username,
        avatar: getDiscordAvatarUrl(profile.id, profile.avatar),
        token: userToken,
        connectedAt: Date.now(),
      });

      Alert.alert(
        '✅ Connecté avec succès !',
        `Bienvenue ${profile.global_name ?? profile.username} ! Vous avez désormais un accès complet à tous vos serveurs, salons et DMs.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur profil';
      Alert.alert('Erreur', msg);
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = (accountId: string, name: string) => {
    Alert.alert('Déconnexion', `Voulez-vous déconnecter ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: () => removeAccount(accountId) },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibles</Text>
          {PHASE1.map((p) => {
            const connectedAccount = accounts.find((a) => a.platform === p.id);
            const color = PLATFORM_COLORS[p.id] ?? theme.accent.primary;
            const isLoading = loadingPlatform === p.id;

            return (
              <View key={p.id} style={styles.row}>
                <PlatformIcon lib={p.lib} icon={p.icon} color={color} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{p.name}</Text>
                  {connectedAccount ? (
                    <Text style={[styles.rowStatus, { color: theme.accent.green }]}>
                      ● {connectedAccount.displayName}
                    </Text>
                  ) : (
                    <Text style={[styles.rowStatus, { color: theme.text.muted }]}>
                      Non connecté
                    </Text>
                  )}
                </View>

                {connectedAccount ? (
                  <TouchableOpacity
                    style={[styles.connectBtn, styles.disconnectBtn]}
                    onPress={() => handleDisconnect(connectedAccount.id, p.name)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.disconnectBtnText}>Déconnecter</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.connectBtn,
                      { backgroundColor: color },
                      isLoading && { opacity: 0.6 },
                    ]}
                    onPress={() => handleStartConnect(p.id)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.connectBtnText}>Connecter</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bientôt disponibles</Text>
          {PHASE2.map((p) => (
            <StaticRow key={p.id} platform={p} />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modale de connexion Discord intégrée pour accès total aux salons & messages */}
      <DiscordLoginModal
        visible={showDiscordLogin}
        onSuccess={handleDiscordSuccess}
        onClose={() => setShowDiscordLogin(false)}
      />
    </View>
  );
}

function StaticRow({
  platform,
}: {
  platform: { id: string; name: string; lib: 'fa5' | 'mci'; icon: string };
}) {
  return (
    <View style={[styles.row, { opacity: 0.55 }]}>
      <PlatformIcon lib={platform.lib} icon={platform.icon} color={theme.text.muted} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{platform.name}</Text>
        <Text style={styles.rowStatusMuted}>En cours de validation</Text>
      </View>
      <View style={styles.soonBadge}>
        <Text style={styles.soonText}>Bientôt</Text>
      </View>
    </View>
  );
}

function PlatformIcon({
  lib,
  icon,
  color,
}: {
  lib: 'fa5' | 'mci';
  icon: string;
  color: string;
}) {
  return (
    <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
      {lib === 'fa5' ? (
        <FontAwesome5 name={icon} size={20} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg.base,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text.primary,
  },
  rowStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rowStatusMuted: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 2,
  },
  connectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectBtn: {
    backgroundColor: theme.bg.raised,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  disconnectBtnText: {
    color: theme.accent.red,
    fontSize: 13,
    fontWeight: '600',
  },
  soonBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: theme.bg.raised,
    borderRadius: theme.radius.sm,
  },
  soonText: {
    fontSize: 12,
    color: theme.text.muted,
    fontWeight: '500',
  },
});
