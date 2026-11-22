// NetworkCard — Clean Light theme
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../constants/theme';

type PlatformIconConfig =
  | { lib: 'fa5'; name: string }
  | { lib: 'mci'; name: string };

const PLATFORM_ICONS: Record<string, PlatformIconConfig> = {
  discord: { lib: 'fa5', name: 'discord' },
  twitter: { lib: 'fa5', name: 'twitter' },
  reddit: { lib: 'fa5', name: 'reddit' },
  mastodon: { lib: 'fa5', name: 'mastodon' },
  youtube: { lib: 'fa5', name: 'youtube' },
  bluesky: { lib: 'mci', name: 'cloud-outline' },
  threads: { lib: 'mci', name: 'at' },
  teams: { lib: 'mci', name: 'microsoft-teams' },
};

type Props = {
  platformId: string;
  name: string;
  color: string;
  isConnected: boolean;
  deletionCount?: number;
  onConnect: () => void;
  onClean?: () => void;
};

export function NetworkCard({ platformId, name, color, isConnected, deletionCount = 0, onConnect, onClean }: Props) {
  const iconConfig = PLATFORM_ICONS[platformId];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Icône */}
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          {iconConfig?.lib === 'fa5' ? (
            <FontAwesome5 name={iconConfig.name as any} size={22} color={color} brand />
          ) : iconConfig?.lib === 'mci' ? (
            <MaterialCommunityIcons name={iconConfig.name as any} size={22} color={color} />
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.status, isConnected && { color: theme.accent.green }]}>
            {isConnected ? '● Connecté' : '○ Non connecté'}
          </Text>
        </View>

        {/* Badge suppression */}
        {isConnected && deletionCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.accent.amber + '20' }]}>
            <Text style={[styles.badgeText, { color: theme.accent.amber }]}>{deletionCount}</Text>
          </View>
        )}
      </View>

      {/* Action */}
      {isConnected ? (
        <TouchableOpacity
          style={[styles.cleanBtn, { backgroundColor: color }]}
          onPress={onClean}
          activeOpacity={0.85}
        >
          <Text style={styles.cleanBtnText}>🧹 Nettoyer</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.connectBtn, { borderColor: color }]}
          onPress={onConnect}
          activeOpacity={0.85}
        >
          <Text style={[styles.connectBtnText, { color }]}>Se connecter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    marginBottom: 10,
    gap: 12,
    // Ombre Facebook card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48, height: 48, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { color: theme.text.primary, fontSize: 15, fontWeight: '700' },
  status: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  badge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cleanBtn: {
    borderRadius: theme.radius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cleanBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  connectBtn: {
    borderRadius: theme.radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFF',
  },
  connectBtnText: { fontWeight: '700', fontSize: 14 },
});
