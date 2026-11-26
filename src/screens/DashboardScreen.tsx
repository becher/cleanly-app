// Dashboard — Thème Clean Light (Facebook / Instagram style)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useHistoryStore } from '../store/historyStore';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { DeletionProgress } from '../components/DeletionProgress';
import { NetworkCard } from '../components/NetworkCard';
import { DiscordCleanModal } from '../components/DiscordCleanModal';
import { RetentionModal } from '../components/RetentionModal';
import { useRetentionStore } from '../store/retentionStore';
import { retentionService } from '../services/retentionService';
import { cleanNotificationService } from '../services/cleanNotificationService';
import type { PlatformAccount } from '../types';

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const d = new Date(timestamp);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardScreen() {
  const accounts = useAuthStore((s) => s.accounts);
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const records = useHistoryStore((s) => s.records);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const totalDeleted = useHistoryStore((s) => s.getTotalDeleted());

  const [cleaningAccount, setCleaningAccount] = useState<PlatformAccount | null>(null);
  const [showRetentionView, setShowRetentionView] = useState(false);
  const [selectedRetentionAccountId, setSelectedRetentionAccountId] = useState<string | undefined>(undefined);
  const [retentionCleanDays, setRetentionCleanDays] = useState<number | undefined>(undefined);
  const [retentionGhostMode, setRetentionGhostMode] = useState<boolean | undefined>(undefined);
  const [retentionIgnorePinned, setRetentionIgnorePinned] = useState<boolean | undefined>(undefined);
  const [retentionScope, setRetentionScope] = useState<'all' | 'dms' | 'guilds' | undefined>(undefined);
  const [retentionKeyword, setRetentionKeyword] = useState<string | undefined>(undefined);
  const [retentionAutoStart, setRetentionAutoStart] = useState<boolean>(false);
  const [retentionSilentMode, setRetentionSilentMode] = useState<boolean>(false);
  const [retentionOnlyAttachments, setRetentionOnlyAttachments] = useState<boolean | undefined>(undefined);
  const [retentionOnlyLinks, setRetentionOnlyLinks] = useState<boolean | undefined>(undefined);
  const [retentionCleanReactions, setRetentionCleanReactions] = useState<boolean | undefined>(undefined);
  const [retentionAutoCloseDMs, setRetentionAutoCloseDMs] = useState<boolean | undefined>(undefined);

  const retentionRules = useRetentionStore((s) => s.rules);
  const anyActiveRule = retentionRules.find((r) => r.enabled);

  useEffect(() => {
    loadHistory();
    useRetentionStore.getState().loadRules().then(() => {
      retentionService.checkDueRetentionRules();
    });

    // Surveillance en direct de l'échéance Auto-Clean (toutes les 2 secondes)
    const timer = setInterval(async () => {
      const { rules } = useRetentionStore.getState();
      const accountsList = useAuthStore.getState().accounts;
      const now = Date.now();

      for (const rule of rules) {
        if (!rule.enabled || !rule.nextRunAt) continue;

        if (now >= rule.nextRunAt) {
          const account = accountsList.find((a) => a.id === rule.accountId);
          if (!account) continue;

          // Déclencher l'alerte sonore et visuelle Notifee
          await cleanNotificationService.notifyRetentionAlert({
            platform: rule.platform,
            accountName: account.displayName || account.username,
            expiredCount: 0,
            retentionDays: rule.retentionDays,
          });

          if (rule.executionMode === 'auto_background') {
            // Mode 100% Silencieux automatique : lance directement la purge
            await useRetentionStore.getState().updateRuleLastRun(rule.id, 0);
            handleClean(
              account,
              rule.retentionDays === 0 ? -1 : rule.retentionDays === -2 ? 0 : rule.retentionDays,
              rule.stealthMode,
              rule.ignorePinned,
              rule.targetScope,
              rule.keyword,
              true, // autoStart
              true, // silentMode
              rule.onlyWithAttachments,
              rule.onlyWithLinks,
              rule.cleanReactions,
              rule.autoCloseDMs
            );
          } else {
            // Mode avec confirmation : demande validation
            Alert.alert(
              '🛡️ Auto-Clean : Purge prête !',
              `Le délai d'Auto-Clean pour ${account.displayName || account.username} est atteint (${retentionService.formatRuleSummary(rule)}).\n\nVoulez-vous lancer le nettoyage maintenant ?`,
              [
                {
                  text: 'Plus tard',
                  style: 'cancel',
                  onPress: () => {
                    useRetentionStore.getState().updateRuleLastRun(rule.id, 0);
                  },
                },
                {
                  text: '🧹 Purger maintenant',
                  style: 'default',
                  onPress: () => {
                    useRetentionStore.getState().updateRuleLastRun(rule.id, 0);
                    handleClean(
                      account,
                      rule.retentionDays === 0 ? -1 : rule.retentionDays === -2 ? 0 : rule.retentionDays,
                      rule.stealthMode,
                      rule.ignorePinned,
                      rule.targetScope,
                      rule.keyword,
                      true, // autoStart direct
                      false, // silentMode
                      rule.onlyWithAttachments,
                      rule.onlyWithLinks,
                      rule.cleanReactions,
                      rule.autoCloseDMs
                    );
                  },
                },
              ]
            );
            await useRetentionStore.getState().updateRuleLastRun(rule.id, 0);
          }
          break;
        }
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [loadHistory]);

  const handleClean = (
    account: PlatformAccount,
    days?: number,
    stealthMode?: boolean,
    ignorePinned?: boolean,
    scope?: 'all' | 'dms' | 'guilds',
    keyword?: string,
    autoStart: boolean = false,
    silentMode: boolean = false,
    onlyWithAttachments?: boolean,
    onlyWithLinks?: boolean,
    cleanReactions?: boolean,
    autoCloseDMs?: boolean
  ) => {
    setRetentionCleanDays(days);
    setRetentionGhostMode(stealthMode);
    setRetentionIgnorePinned(ignorePinned);
    setRetentionScope(scope);
    setRetentionKeyword(keyword);
    setRetentionAutoStart(autoStart);
    setRetentionSilentMode(silentMode);
    setRetentionOnlyAttachments(onlyWithAttachments);
    setRetentionOnlyLinks(onlyWithLinks);
    setRetentionCleanReactions(cleanReactions);
    setRetentionAutoCloseDMs(autoCloseDMs);

    if (account.platform === 'discord') {
      setCleaningAccount(account);
    } else {
      Alert.alert('Bientôt disponible', `Le nettoyage pour ${account.displayName} arrive prochainement.`);
    }
  };

  const recentRecords = records.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      {showRetentionView ? (
        <RetentionModal
          visible={true}
          embedded={true}
          initialAccountId={selectedRetentionAccountId}
          onClose={() => {
            setShowRetentionView(false);
            setSelectedRetentionAccountId(undefined);
          }}
          onTriggerClean={(acc, days, stealth, pinned, scope, keyword, autoStart, silentMode, onlyAttachments, onlyLinks, cleanReactions, autoCloseDMs) => {
            setShowRetentionView(false);
            setSelectedRetentionAccountId(undefined);
            handleClean(acc, days, stealth, pinned, scope, keyword, autoStart, silentMode, onlyAttachments, onlyLinks, cleanReactions, autoCloseDMs);
          }}
        />
      ) : (
        <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
          {/* Statistiques en tête */}
          <View style={styles.statsRow}>
            <StatCard
              icon="git-network-outline"
              label="Réseaux"
              value={accounts.length}
              color={theme.accent.primary}
            />
            <StatCard
              icon="sparkles-outline"
              label="Nettoyés"
              value={totalDeleted}
              color={theme.accent.green}
            />
            <StatCard
              icon="checkmark-done-circle-outline"
              label="Sessions"
              value={records.length}
              color="#8B5CF6"
            />
          </View>

          {/* Progressions actives */}
          {activeTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En cours</Text>
          {activeTasks.map((task) => (
            <DeletionProgress
              key={task.id}
              platform={task.platform}
              platformIcon=""
              platformColor={PLATFORM_COLORS[task.platform] ?? theme.accent.primary}
              processed={task.processed}
              total={task.total}
              currentStatus="Suppression en cours..."
            />
          ))}
        </View>
      )}

      {/* Vide — aucun compte connecté */}
      {accounts.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Text style={{ fontSize: 40 }}>🧹</Text>
          </View>
          <Text style={styles.emptyTitle}>Bienvenue sur Cleanly</Text>
          <Text style={styles.emptyText}>
            Nettoyez vos publications, messages et traces sur vos réseaux sociaux en toute confidentialité.
          </Text>
        </View>
      )}

      {/* Comptes connectés */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes réseaux connectés</Text>
          {accounts.map((account) => {
            const rule = retentionRules.find((r) => r.accountId === account.id);
            return (
              <NetworkCard
                key={account.id}
                platformId={account.platform}
                name={account.displayName ?? account.platform}
                color={PLATFORM_COLORS[account.platform] ?? theme.accent.primary}
                isConnected
                retentionRule={rule}
                onConfigureRetention={() => {
                  setSelectedRetentionAccountId(account.id);
                  setShowRetentionView(true);
                }}
                onTriggerRetentionClean={() => {
                  Alert.alert(
                    '⚡ Purge Auto-Clean prête !',
                    `L'échéance d'Auto-Clean pour ${account.displayName || account.username} est atteinte.\n\nSouhaitez-vous lancer la purge des messages (${rule ? retentionService.formatRuleSummary(rule) : ''}) ?`,
                    [
                      {
                        text: 'Modifier la règle',
                        onPress: () => {
                          setSelectedRetentionAccountId(account.id);
                          setShowRetentionView(true);
                        },
                      },
                      {
                        text: '🧹 Purger maintenant',
                        style: 'default',
                        onPress: () => {
                          if (rule) {
                            useRetentionStore.getState().updateRuleLastRun(rule.id, 0);
                          }
                          handleClean(
                            account,
                            rule?.retentionDays === 0 ? -1 : rule?.retentionDays === -2 ? 0 : rule?.retentionDays,
                            rule?.stealthMode,
                            rule?.ignorePinned,
                            rule?.targetScope,
                            rule?.keyword,
                            true, // autoStart direct
                            rule?.executionMode === 'auto_background',
                            rule?.onlyWithAttachments,
                            rule?.onlyWithLinks,
                            rule?.cleanReactions,
                            rule?.autoCloseDMs
                          );
                        },
                      },
                    ]
                  );
                }}
                onConnect={() => {}}
                onClean={() => handleClean(account)}
              />
            );
          })}
        </View>
      )}

      {/* Activité récente de nettoyage */}
      {recentRecords.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derniers nettoyages</Text>
          <View style={styles.recentList}>
            {recentRecords.map((item) => {
              const pColor = PLATFORM_COLORS[item.platform] ?? theme.accent.primary;
              return (
                <View key={item.id} style={styles.recentItem}>
                  <View style={[styles.recentIconBox, { backgroundColor: `${pColor}18` }]}>
                    {item.platform === 'bluesky' || item.platform === 'threads' || item.platform === 'teams' ? (
                      <MaterialCommunityIcons
                        name={item.platform === 'bluesky' ? 'butterfly' : item.platform === 'threads' ? 'at' : 'microsoft-teams'}
                        size={16}
                        color={pColor}
                      />
                    ) : (
                      <FontAwesome5
                        name={item.platform === 'twitter' ? 'twitter' : item.platform}
                        size={14}
                        color={pColor}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {item.targetName}
                    </Text>
                    <Text style={styles.recentDate}>{formatRelativeDate(item.timestamp)}</Text>
                  </View>
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>-{item.deletedCount}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />

        </ScrollView>
      )}

      {/* Modale de nettoyage Discord — Toujours stable à la racine */}
      {cleaningAccount?.platform === 'discord' && (
        <DiscordCleanModal
          visible={true}
          token={cleaningAccount.token}
          userId={cleaningAccount.id.replace('discord_', '')}
          initialFilterDays={retentionCleanDays}
          initialGhostMode={retentionGhostMode}
          initialIgnorePinned={retentionIgnorePinned}
          initialScope={retentionScope}
          initialKeyword={retentionKeyword}
          autoStart={retentionAutoStart}
          silentMode={retentionSilentMode}
          initialOnlyAttachments={retentionOnlyAttachments}
          initialOnlyLinks={retentionOnlyLinks}
          initialCleanReactions={retentionCleanReactions}
          initialAutoCloseDMs={retentionAutoCloseDMs}
          onClose={() => {
            setCleaningAccount(null);
            setRetentionCleanDays(undefined);
            setRetentionGhostMode(undefined);
            setRetentionIgnorePinned(undefined);
            setRetentionScope(undefined);
            setRetentionKeyword(undefined);
            setRetentionAutoStart(false);
            setRetentionSilentMode(false);
            setRetentionOnlyAttachments(undefined);
            setRetentionOnlyLinks(undefined);
            setRetentionCleanReactions(undefined);
            setRetentionAutoCloseDMs(undefined);
          }}
          onFinished={(count) => {
            loadHistory();
          }}
        />
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statNum, { color }]}>{value.toLocaleString('fr-FR')}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    elevation: 1,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text.secondary,
    marginTop: 2,
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
  emptyCard: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 8,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  recentList: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    overflow: 'hidden',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    gap: 10,
  },
  recentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text.primary,
  },
  recentDate: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 2,
  },
  recentBadge: {
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  recentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.accent.red,
  },
  retentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
  },
  retentionBannerActive: {
    borderColor: '#10B98140',
    backgroundColor: '#10B98106',
  },
  retentionBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5865F212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retentionBannerIconActive: {
    backgroundColor: '#10B98118',
  },
  retentionBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.text.primary,
  },
  retentionBannerSub: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 1,
  },
  activePill: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
});
