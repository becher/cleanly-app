// Dashboard principal de Cleanly
// Affiche les réseaux connectés, stats et progressions en cours

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NetworkCard } from '../../src/components/NetworkCard';
import { DeletionProgress } from '../../src/components/DeletionProgress';
import { useAuthStore } from '../../src/store/authStore';
import { useTaskStore } from '../../src/store/taskStore';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const accounts = useAuthStore((s) => s.accounts);
  const activeTasks = useTaskStore((s) => s.activeTasks);

  const connectedCount = accounts.length;
  const inProgressCount = activeTasks.length;

  return (
    <ScrollView style={styles.page}>
      {/* Statistiques */}
      <View style={styles.statsRow}>
        <StatCard
          label={t('dashboard.connectedNetworks')}
          value={connectedCount}
          color="#6C63FF"
        />
        <StatCard
          label={t('dashboard.inProgress')}
          value={inProgressCount}
          color="#F59E0B"
        />
      </View>

      {/* Progressions actives */}
      {activeTasks.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>EN COURS</Text>
          {activeTasks.map((task) => (
            <DeletionProgress
              key={task.id}
              platform={task.platform}
              platformIcon={PLATFORM_ICONS[task.platform] ?? '🌐'}
              platformColor={PLATFORM_COLORS[task.platform] ?? '#6C63FF'}
              processed={task.processed}
              total={task.total}
              currentStatus={task.status === 'in_progress' ? 'Suppression en cours...' : undefined}
            />
          ))}
        </>
      )}

      {/* Bienvenue si rien de connecté */}
      {connectedCount === 0 && (
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeEmoji}>🧹</Text>
          <Text style={styles.welcomeTitle}>{t('welcome.title')}</Text>
          <Text style={styles.welcomeText}>{t('welcome.subtitle')}</Text>
        </View>
      )}

      {/* Réseaux connectés */}
      {connectedCount > 0 && (
        <>
          <Text style={styles.sectionLabel}>MES RÉSEAUX</Text>
          {accounts.map((account) => (
            <NetworkCard
              key={account.id}
              icon={PLATFORM_ICONS[account.platform] ?? '🌐'}
              name={account.displayName}
              color={PLATFORM_COLORS[account.platform] ?? '#6C63FF'}
              isConnected={true}
              onConnect={() => {}}
              onClean={() => {
                // TODO : lancer la suppression via deletionQueue
              }}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// --- Utilitaires ---

const PLATFORM_ICONS: Record<string, string> = {
  discord: '🟣', twitter: '🐦', reddit: '🟠',
  bluesky: '🦋', mastodon: '🐘', threads: '🧵',
  youtube: '▶️', teams: '💜',
};

const PLATFORM_COLORS: Record<string, string> = {
  discord: '#5865F2', twitter: '#000000', reddit: '#FF4500',
  bluesky: '#0085FF', mastodon: '#6364FF', threads: '#000000',
  youtube: '#FF0000', teams: '#6264A7',
};

// Composant : carte statistique
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statNumber, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#13131A', borderRadius: 12,
    padding: 16, borderLeftWidth: 3,
  },
  statNumber: { fontSize: 36, fontWeight: '700' },
  statLabel: { color: '#9B9BB0', fontSize: 13, marginTop: 4 },
  sectionLabel: {
    color: '#5A5A70', fontSize: 12, fontWeight: '600',
    letterSpacing: 1.2, marginBottom: 12,
  },
  welcomeBox: {
    backgroundColor: '#13131A', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24, gap: 8,
  },
  welcomeEmoji: { fontSize: 48 },
  welcomeTitle: { color: '#F8F8FF', fontSize: 20, fontWeight: '700' },
  welcomeText: { color: '#9B9BB0', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
