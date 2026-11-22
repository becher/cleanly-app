// Historique — Suppressions effectuées
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';

export function HistoryScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.centerContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="time-outline" size={36} color={theme.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>Aucun historique</Text>
      <Text style={styles.emptySubtitle}>
        Les suppressions terminées s'afficheront ici avec le détail des éléments nettoyés.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.bg.raised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
