// Réseaux — avec boutons de connexion OAuth fonctionnels
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, PLATFORM_COLORS } from '../../src/constants/theme';
import { useConnect } from '../../src/hooks/useConnect';
import type { Platform } from '../../src/types';

const PHASE1: { id: Platform; name: string; lib: string; icon: string }[] = [
  { id: 'discord',  name: 'Discord',          lib: 'fa5', icon: 'discord'          },
  { id: 'twitter',  name: 'X / Twitter',       lib: 'fa5', icon: 'twitter'          },
  { id: 'reddit',   name: 'Reddit',            lib: 'fa5', icon: 'reddit'           },
  { id: 'mastodon', name: 'Mastodon',          lib: 'fa5', icon: 'mastodon'         },
  { id: 'youtube',  name: 'YouTube',           lib: 'fa5', icon: 'youtube'          },
  { id: 'bluesky',  name: 'Bluesky',           lib: 'mci', icon: 'butterfly-outline'},
  { id: 'threads',  name: 'Threads',           lib: 'mci', icon: 'at'               },
  { id: 'teams',    name: 'Microsoft Teams',   lib: 'mci', icon: 'microsoft-teams'  },
];

const PHASE2 = [
  { id: 'instagram', name: 'Instagram', lib: 'fa5', icon: 'instagram' },
  { id: 'facebook',  name: 'Facebook',  lib: 'fa5', icon: 'facebook'  },
  { id: 'linkedin',  name: 'LinkedIn',  lib: 'fa5', icon: 'linkedin'  },
  { id: 'tiktok',   name: 'TikTok',    lib: 'fa5', icon: 'tiktok'    },
  { id: 'slack',    name: 'Slack',     lib: 'fa5', icon: 'slack'      },
];

export default function NetworksScreen() {
  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibles</Text>
        {PHASE1.map((p) => (
          <ConnectRow key={p.id} platform={p} available />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bientôt disponibles</Text>
        {PHASE2.map((p) => (
          <StaticRow key={p.id} platform={p} />
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// Ligne avec vrai bouton OAuth
function ConnectRow({ platform }: { platform: { id: Platform; name: string; lib: string; icon: string }; available: boolean }) {
  const color = PLATFORM_COLORS[platform.id] ?? theme.accent.primary;
  const { connect, isConnecting } = useConnect(platform.id);

  return (
    <View style={styles.row}>
      <PlatformIcon lib={platform.lib} icon={platform.icon} color={color} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{platform.name}</Text>
        <Text style={[styles.rowStatus, { color: theme.accent.green }]}>● Prêt</Text>
      </View>
      <TouchableOpacity
        style={[styles.connectBtn, { backgroundColor: color }, isConnecting && { opacity: 0.6 }]}
        onPress={connect}
        disabled={isConnecting}
        activeOpacity={0.85}
      >
        {isConnecting
          ? <ActivityIndicator size="small" color="#FFF" />
          : <Text style={styles.connectBtnText}>Connecter</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// Ligne statique (phase 2)
function StaticRow({ platform }: { platform: { id: string; name: string; lib: string; icon: string } }) {
  const color = PLATFORM_COLORS[platform.id] ?? theme.text.muted;
  return (
    <View style={[styles.row, { opacity: 0.45 }]}>
      <PlatformIcon lib={platform.lib} icon={platform.icon} color={color} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{platform.name}</Text>
        <Text style={styles.rowStatus}>○ Bientôt</Text>
      </View>
      <View style={styles.soonBadge}>
        <Text style={styles.soonText}>Bientôt</Text>
      </View>
    </View>
  );
}

// Icône plateforme (FA5 ou MCI)
function PlatformIcon({ lib, icon, color }: { lib: string; icon: string; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      {lib === 'fa5'
        ? <FontAwesome5 name={icon as any} size={22} color={color} brand />
        : <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg.base },
  section: { padding: theme.space.md, paddingBottom: 0 },
  sectionTitle: { color: theme.text.primary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: 12, marginBottom: 8, gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 1,
  },
  iconBox: { width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowName: { color: theme.text.primary, fontSize: 15, fontWeight: '600' },
  rowStatus: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  connectBtn: { borderRadius: theme.radius.full, paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  connectBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  soonBadge: { borderRadius: theme.radius.full, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.bg.raised },
  soonText: { color: theme.text.muted, fontSize: 13, fontWeight: '600' },
});
