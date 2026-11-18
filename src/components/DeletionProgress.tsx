// DeletionProgress — barre de progression d'une suppression en cours
// Affiche : plateforme, nombre traité / total, pourcentage

import { View, Text, StyleSheet } from 'react-native';

type Props = {
  platform: string;         // Ex : "Discord"
  platformIcon: string;     // Ex : "🟣"
  platformColor: string;    // Ex : "#5865F2"
  processed: number;        // Suppressions effectuées
  total: number;            // Total à supprimer
  currentStatus?: string;   // Message de statut optionnel
};

export function DeletionProgress({
  platform,
  platformIcon,
  platformColor,
  processed,
  total,
  currentStatus,
}: Props) {
  // Pourcentage (0 à 100)
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.icon}>{platformIcon}</Text>
        <View style={styles.info}>
          <Text style={styles.platform}>{platform}</Text>
          <Text style={styles.count}>
            {processed} / {total} supprimés
          </Text>
        </View>
        <Text style={[styles.percent, { color: platformColor }]}>{percent}%</Text>
      </View>

      {/* Barre de progression */}
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percent}%` as unknown as number,
              backgroundColor: platformColor,
            },
          ]}
        />
      </View>

      {/* Statut optionnel */}
      {currentStatus && (
        <Text style={styles.status}>{currentStatus}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  platform: {
    color: '#F8F8FF',
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    color: '#9B9BB0',
    fontSize: 12,
    marginTop: 2,
  },
  percent: {
    fontSize: 18,
    fontWeight: '700',
  },
  barBackground: {
    height: 6,
    backgroundColor: '#2A2A3A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  status: {
    color: '#5A5A70',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
