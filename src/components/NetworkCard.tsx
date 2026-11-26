// NetworkCard — Clean Light theme
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';
import { retentionService } from '../services/retentionService';
import type { RetentionRule } from '../types';

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
  retentionRule?: RetentionRule;
  onConfigureRetention?: () => void;
};

export function NetworkCard({
  platformId,
  name,
  color,
  isConnected,
  deletionCount = 0,
  onConnect,
  onClean,
  retentionRule,
  onConfigureRetention,
}: Props) {
  const iconConfig = PLATFORM_ICONS[platformId];
  const isRetentionActive = retentionRule?.enabled;

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

      {/* Ligne Auto-Clean par plateforme si connectée */}
      {isConnected && (
        <TouchableOpacity
          style={[
            styles.retentionRow,
            isRetentionActive ? styles.retentionRowActive : styles.retentionRowInactive,
          ]}
          onPress={onConfigureRetention}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isRetentionActive ? 'shield-checkmark' : 'shield-outline'}
            size={16}
            color={isRetentionActive ? '#10B981' : theme.text.muted}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[
                  styles.retentionTitle,
                  isRetentionActive && { color: '#10B981', fontWeight: '700' },
                ]}
              >
                {isRetentionActive ? 'Auto-Clean actif' : 'Auto-Clean désactivé'}
              </Text>
              {isRetentionActive && (
                <Text style={styles.retentionBadgeNext}>
                  • {retentionService.formatNextRun(retentionRule)}
                </Text>
              )}
            </View>
            <Text style={styles.retentionSub} numberOfLines={1}>
              {isRetentionActive
                ? retentionService.formatRuleSummary(retentionRule)
                : 'Touchez pour configurer la purge automatique'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={15}
            color={isRetentionActive ? '#10B981' : theme.text.muted}
          />
        </TouchableOpacity>
      )}

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
    gap: 10,
    // Ombre Facebook card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { color: theme.text.primary, fontSize: 15, fontWeight: '700' },
  status: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  badge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  retentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  retentionRowActive: {
    backgroundColor: '#10B9810A',
    borderColor: '#10B98140',
  },
  retentionRowInactive: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
  },
  retentionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.primary,
  },
  retentionBadgeNext: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  retentionSub: {
    fontSize: 10.5,
    color: theme.text.muted,
    marginTop: 1,
  },
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
