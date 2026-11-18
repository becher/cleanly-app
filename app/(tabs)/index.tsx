// Dashboard — Clean Light theme (Facebook/Instagram style)
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { NetworkCard } from '../../src/components/NetworkCard';
import { DeletionProgress } from '../../src/components/DeletionProgress';
import { useAuthStore } from '../../src/store/authStore';
import { useTaskStore } from '../../src/store/taskStore';
import { theme, PLATFORM_COLORS } from '../../src/constants/theme';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const accounts = useAuthStore((s) => s.accounts);
  const activeTasks = useTaskStore((s) => s.activeTasks);

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="git-network-outline"
          label={t('dashboard.connectedNetworks')}
          value={accounts.length}
          color={theme.accent.primary}
        />
        <StatCard
          icon="trash-outline"
          label={t('dashboard.inProgress')}
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

      {/* Vide — aucun compte */}
      {accounts.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Text style={{ fontSize: 40 }}>🧹</Text>
          </View>
          <Text style={styles.emptyTitle}>{t('welcome.title')}</Text>
          <Text style={styles.emptyText}>{t('welcome.subtitle')}</Text>
          <TouchableOpacity style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>{t('welcome.cta')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comptes connectés */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes réseaux</Text>
          {accounts.map((account) => (
            <NetworkCard
              key={account.id}
              platformId={account.platform}
              name={account.displayName ?? account.platform}
              color={PLATFORM_COLORS[account.platform] ?? theme.accent.primary}
              isConnected
              onConnect={() => {}}
              onClean={() => {}}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: number; color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg.base },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: theme.space.md,
    paddingBottom: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    alignItems: 'flex-start',
    gap: 4,
    // Ombre légère (style Facebook card)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  statLabel: { color: theme.text.secondary, fontSize: 12, fontWeight: '500' },

  section: { padding: theme.space.md, paddingTop: theme.space.md },
  sectionTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  // État vide — style card Facebook
  emptyCard: {
    backgroundColor: theme.bg.surface,
    margin: theme.space.md,
    borderRadius: theme.radius.xl,
    padding: theme.space.xl,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: theme.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: theme.accent.primary,
    borderRadius: theme.radius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    color: theme.text.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
});
