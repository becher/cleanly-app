// Écran Historique — liste des suppressions effectuées
// Pour l'instant vide — sera alimenté par la queue SQLite

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen() {
  const { t } = useTranslation();

  // TODO : lire depuis src/store/taskStore (deletionHistory)
  const history: HistoryItem[] = [];

  return (
    <ScrollView style={styles.page}>
      {history.length === 0 ? (
        // État vide
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
          <Text style={styles.emptyText}>
            Les posts supprimés apparaîtront ici.
          </Text>
        </View>
      ) : (
        // Liste des suppressions
        history.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))
      )}
    </ScrollView>
  );
}

// Type d'un item d'historique
type HistoryItem = {
  id: string;
  platform: string;
  contentType: string;
  deletedAt: string;
  count: number;
};

// Composant : ligne d'historique
function HistoryRow({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Text style={styles.platform}>{item.platform}</Text>
      <Text style={styles.count}>
        {item.count} {t('history.deleted')}
      </Text>
      <Text style={styles.date}>{item.deletedAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    color: '#F8F8FF',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#5A5A70',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  platform: {
    color: '#F8F8FF',
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    color: '#6C63FF',
    fontSize: 13,
    marginTop: 4,
  },
  date: {
    color: '#5A5A70',
    fontSize: 12,
    marginTop: 4,
  },
});
