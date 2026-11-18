// Historique — Clean Light theme
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/constants/theme';

export default function HistoryScreen() {
  const history: any[] = []; // TODO: lire depuis SQLite

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="time-outline" size={36} color={theme.text.muted} />
          </View>
          <Text style={styles.emptyTitle}>Aucune suppression</Text>
          <Text style={styles.emptyText}>
            L'historique de tes suppressions apparaîtra ici.
          </Text>
        </View>
      ) : (
        <View style={{ padding: theme.space.md }}>
          {history.map((item: any) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.platform}>{item.platform}</Text>
              <Text style={styles.count}>{item.count} supprimés</Text>
              <Text style={styles.date}>{item.deletedAt}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg.base },
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
    width: 72, height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: theme.bg.raised,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: theme.text.primary, fontSize: 17, fontWeight: '700',
  },
  emptyText: {
    color: theme.text.secondary, fontSize: 14,
    textAlign: 'center', lineHeight: 20,
  },
  row: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  platform: { color: theme.text.primary, fontSize: 15, fontWeight: '600' },
  count: { color: theme.accent.primary, fontSize: 13, marginTop: 4 },
  date: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
});
