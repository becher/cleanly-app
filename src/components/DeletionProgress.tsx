// DeletionProgress — Clean Light theme
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  platform: string;
  platformIcon: string;
  platformColor: string;
  processed: number;
  total: number;
  currentStatus?: string;
};

export function DeletionProgress({ platform, platformColor, processed, total, currentStatus }: Props) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: platformColor + '15' }]}>
          <Text style={{ fontSize: 18 }}>🧹</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{platform}</Text>
          <Text style={styles.count}>{processed} / {total} supprimés</Text>
        </View>
        <Text style={[styles.percent, { color: platformColor }]}>{percent}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${percent}%` as any, backgroundColor: platformColor }]} />
      </View>
      {currentStatus && <Text style={styles.status}>{currentStatus}</Text>}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 40, height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { color: theme.text.primary, fontSize: 14, fontWeight: '700' },
  count: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  percent: { fontSize: 18, fontWeight: '800' },
  barBg: {
    height: 6,
    backgroundColor: theme.bg.raised,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  status: { color: theme.text.muted, fontSize: 12 },
});
