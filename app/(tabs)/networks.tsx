// Réseaux — Clean Light theme
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, PLATFORM_COLORS } from '../../src/constants/theme';

const PHASE1 = [
  { id: 'discord',  name: 'Discord',          lib: 'fa5', icon: 'discord'          },
  { id: 'twitter',  name: 'X / Twitter',       lib: 'fa5', icon: 'twitter'          },
  { id: 'reddit',   name: 'Reddit',            lib: 'fa5', icon: 'reddit'           },
  { id: 'mastodon', name: 'Mastodon',          lib: 'fa5', icon: 'mastodon'         },
  { id: 'youtube',  name: 'YouTube',           lib: 'fa5', icon: 'youtube'          },
  { id: 'bluesky',  name: 'Bluesky',           lib: 'mci', icon: 'butterfly-outline'},
  { id: 'threads',  name: 'Threads',           lib: 'mci', icon: 'at'               },
  { id: 'teams',    name: 'Microsoft Teams',   lib: 'mci', icon: 'microsoft-teams'  },
] as const;

const PHASE2 = [
  { id: 'instagram', name: 'Instagram', lib: 'fa5', icon: 'instagram' },
  { id: 'facebook',  name: 'Facebook',  lib: 'fa5', icon: 'facebook'  },
  { id: 'linkedin',  name: 'LinkedIn',  lib: 'fa5', icon: 'linkedin'  },
  { id: 'tiktok',   name: 'TikTok',    lib: 'fa5', icon: 'tiktok'    },
  { id: 'slack',    name: 'Slack',     lib: 'fa5', icon: 'slack'      },
] as const;

export default function NetworksScreen() {
  function handleConnect(name: string) {
    Alert.alert(`Connecter ${name}`, 'Authentification OAuth disponible bientôt.', [{ text: 'OK' }]);
  }

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibles</Text>
        {PHASE1.map((p) => (
          <PlatformRow
            key={p.id}
            id={p.id} name={p.name} lib={p.lib} icon={p.icon}
            available onConnect={() => handleConnect(p.name)}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bientôt disponibles</Text>
        {PHASE2.map((p) => (
          <PlatformRow
            key={p.id}
            id={p.id} name={p.name} lib={p.lib} icon={p.icon}
            available={false} onConnect={() => {}}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function PlatformRow({ id, name, lib, icon, available, onConnect }: {
  id: string; name: string; lib: string; icon: string;
  available: boolean; onConnect: () => void;
}) {
  const color = PLATFORM_COLORS[id] ?? theme.accent.primary;
  return (
    <View style={[styles.row, !available && { opacity: 0.45 }]}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        {lib === 'fa5'
          ? <FontAwesome5 name={icon as any} size={22} color={color} brand />
          : <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        }
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={[styles.rowStatus, available && { color: theme.accent.green }]}>
          {available ? '● Prêt' : '○ Bientôt'}
        </Text>
      </View>
      {available ? (
        <TouchableOpacity
          style={[styles.connectBtn, { backgroundColor: color }]}
          onPress={onConnect} activeOpacity={0.85}
        >
          <Text style={styles.connectBtnText}>Connecter</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.soonBadge}>
          <Text style={styles.soonText}>Bientôt</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg.base },
  section: { padding: theme.space.md, paddingBottom: 0 },
  sectionTitle: {
    color: theme.text.primary,
    fontSize: 16, fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { color: theme.text.primary, fontSize: 15, fontWeight: '600' },
  rowStatus: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  connectBtn: {
    borderRadius: theme.radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  connectBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  soonBadge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.bg.raised,
  },
  soonText: { color: theme.text.muted, fontSize: 13, fontWeight: '600' },
});
