// Dashboard — Thème Clean Light (Facebook / Instagram style)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { DeletionProgress } from '../components/DeletionProgress';
import { NetworkCard } from '../components/NetworkCard';
import { DiscordCleanModal } from '../components/DiscordCleanModal';
import type { PlatformAccount } from '../types';

export function DashboardScreen() {
  const accounts = useAuthStore((s) => s.accounts);
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const [cleaningAccount, setCleaningAccount] = useState<PlatformAccount | null>(null);

  const handleClean = (account: PlatformAccount) => {
    if (account.platform === 'discord') {
      setCleaningAccount(account);
    } else {
      Alert.alert('Bientôt disponible', `Le nettoyage pour ${account.displayName} arrive prochainement.`);
    }
  };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* Statistiques en tête */}
      <View style={styles.statsRow}>
        <StatCard
          icon="git-network-outline"
          label="Réseaux connectés"
          value={accounts.length}
          color={theme.accent.primary}
        />
        <StatCard
          icon="trash-outline"
          label="En cours"
          value={activeTasks.length}
          color={theme.accent.amber}
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
          <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Connecter un premier réseau</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comptes connectés */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes réseaux connectés</Text>
          {accounts.map((account) => (
            <NetworkCard
              key={account.id}
              platformId={account.platform}
              name={account.displayName ?? account.platform}
              color={PLATFORM_COLORS[account.platform] ?? theme.accent.primary}
              isConnected
              onConnect={() => {}}
              onClean={() => handleClean(account)}
            />
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />

      {/* Modale de nettoyage Discord */}
      {cleaningAccount?.platform === 'discord' && (
        <DiscordCleanModal
          visible={true}
          token={cleaningAccount.token}
          userId={cleaningAccount.id.replace('discord_', '')}
          onClose={() => setCleaningAccount(null)}
          onFinished={(count) => {
            Alert.alert('Succès', `${count} message(s) supprimé(s) !`);
          }}
        />
      )}
    </ScrollView>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
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
  emptyBtn: {
    backgroundColor: theme.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
