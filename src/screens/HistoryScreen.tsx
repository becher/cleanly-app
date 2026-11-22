// HistoryScreen — Historique complet des suppressions
// Affiche les sessions de nettoyage avec détails, filtres et statistiques

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { useHistoryStore, HistoryRecord } from '../store/historyStore';
import type { Platform } from '../types';

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

const PLATFORM_NAMES: Record<string, string> = {
  discord: 'Discord',
  twitter: 'X / Twitter',
  reddit: 'Reddit',
  mastodon: 'Mastodon',
  youtube: 'YouTube',
  bluesky: 'Bluesky',
  threads: 'Threads',
  teams: 'Microsoft Teams',
};

export function HistoryScreen() {
  const records = useHistoryStore((s) => s.records);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const deleteRecord = useHistoryStore((s) => s.deleteRecord);
  const totalDeleted = useHistoryStore((s) => s.getTotalDeleted());

  const [selectedFilter, setSelectedFilter] = useState<'all' | Platform>('all');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredRecords = useMemo(() => {
    if (selectedFilter === 'all') return records;
    return records.filter((r) => r.platform === selectedFilter);
  }, [records, selectedFilter]);

  // Liste des plateformes ayant au moins un record
  const availablePlatforms = useMemo(() => {
    const set = new Set(records.map((r) => r.platform));
    return Array.from(set);
  }, [records]);

  const handleClearAll = () => {
    Alert.alert(
      'Effacer tout l’historique',
      'Voulez-vous vraiment supprimer tout l’historique des sessions de nettoyage ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ]
    );
  };

  const handleDeleteItem = (id: string, targetName: string) => {
    Alert.alert(
      'Supprimer de l’historique',
      `Retirer la session « ${targetName} » de la liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteRecord(id),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* 1. Carte Résumé des Statistiques */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Total messages nettoyés</Text>
            <Text style={styles.summaryNumber}>{totalDeleted.toLocaleString('fr-FR')}</Text>
          </View>
          <View style={styles.summaryIconBox}>
            <Ionicons name="sparkles" size={26} color="#FFF" />
          </View>
        </View>

        <View style={styles.summaryFooter}>
          <View style={styles.summarySubItem}>
            <Ionicons name="checkmark-done-circle-outline" size={16} color={theme.text.secondary} />
            <Text style={styles.summarySubText}>
              {records.length} session{records.length > 1 ? 's' : ''} au total
            </Text>
          </View>

          {records.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={14} color={theme.accent.red} />
              <Text style={styles.clearBtnText}>Effacer tout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Filtres par onglets */}
      {availablePlatforms.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
              Tous ({records.length})
            </Text>
          </TouchableOpacity>

          {availablePlatforms.map((p) => {
            const count = records.filter((r) => r.platform === p).length;
            const isSelected = selectedFilter === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedFilter(p as Platform)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {PLATFORM_NAMES[p] ?? p} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 3. Liste des cartes d'historique */}
      <View style={styles.listSection}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="time-outline" size={40} color={theme.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>Aucun historique</Text>
            <Text style={styles.emptySub}>
              {records.length === 0
                ? "Vos sessions de suppression s'afficheront ici avec le nombre de messages nettoyés et les filtres appliqués."
                : 'Aucune session ne correspond à ce filtre.'}
            </Text>
          </View>
        ) : (
          filteredRecords.map((item) => (
            <HistoryCard
              key={item.id}
              record={item}
              onDelete={() => handleDeleteItem(item.id, item.targetName)}
            />
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function HistoryCard({
  record,
  onDelete,
}: {
  record: HistoryRecord;
  onDelete: () => void;
}) {
  const pColor = PLATFORM_COLORS[record.platform] ?? theme.accent.primary;
  const isCompleted = record.status === 'completed';

  return (
    <View style={styles.card}>
      {/* Ligne haute : Icône plateforme + Cible + Date + Bouton delete */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.platformIconBox, { backgroundColor: `${pColor}18` }]}>
            {record.platform === 'bluesky' || record.platform === 'threads' || record.platform === 'teams' ? (
              <MaterialCommunityIcons
                name={record.platform === 'bluesky' ? 'butterfly' : record.platform === 'threads' ? 'at' : 'microsoft-teams'}
                size={20}
                color={pColor}
              />
            ) : (
              <FontAwesome5
                name={record.platform === 'twitter' ? 'twitter' : record.platform}
                size={18}
                color={pColor}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.targetTitle} numberOfLines={1}>
              {record.targetName}
            </Text>
            <Text style={styles.dateText}>{formatRelativeDate(record.timestamp)}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={18} color={theme.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Ligne médiane : Badge messages supprimés + Statut */}
      <View style={styles.cardMiddle}>
        <View style={styles.badgeDeleted}>
          <Ionicons name="trash" size={14} color={theme.accent.red} style={{ marginRight: 6 }} />
          <Text style={styles.badgeDeletedText}>
            -{record.deletedCount} message{record.deletedCount > 1 ? 's' : ''}
          </Text>
        </View>

        <View
          style={[
            styles.badgeStatus,
            { backgroundColor: isCompleted ? '#22C55E15' : '#F59E0B15' },
          ]}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={isCompleted ? theme.accent.green : theme.accent.amber}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.badgeStatusText,
              { color: isCompleted ? theme.accent.green : theme.accent.amber },
            ]}
          >
            {isCompleted ? 'Terminé' : 'Interrompu'}
          </Text>
        </View>
      </View>

      {/* Ligne basse : Détails des filtres appliqués (si présents) */}
      {record.filters && (
        <View style={styles.filterTagsRow}>
          {record.filters.dateFilterTitle && (
            <View style={styles.tagBadge}>
              <Ionicons name="calendar-outline" size={11} color={theme.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>{record.filters.dateFilterTitle}</Text>
            </View>
          )}
          {record.filters.keyword && (
            <View style={styles.tagBadge}>
              <Ionicons name="search-outline" size={11} color={theme.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>« {record.filters.keyword} »</Text>
            </View>
          )}
          {record.filters.onlyWithAttachments && (
            <View style={styles.tagBadge}>
              <Ionicons name="attach-outline" size={11} color={theme.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>Médias seuls</Text>
            </View>
          )}
          {record.filters.onlyWithLinks && (
            <View style={styles.tagBadge}>
              <Ionicons name="link-outline" size={11} color={theme.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>Liens seuls</Text>
            </View>
          )}
          {record.filters.speedTitle && (
            <View style={styles.tagBadge}>
              <Ionicons name="speedometer-outline" size={11} color={theme.text.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>{record.filters.speedTitle}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg.base,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginBottom: 16,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.accent.primary,
  },
  summaryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    paddingTop: 12,
  },
  summarySubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summarySubText: {
    fontSize: 13,
    color: theme.text.secondary,
    fontWeight: '500',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: '#EF444410',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.accent.red,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  filterChipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  listSection: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 20,
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
    fontSize: 17,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 10,
  },
  platformIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text.primary,
  },
  dateText: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 2,
  },
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  badgeDeleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  badgeDeletedText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.accent.red,
  },
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  badgeStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    paddingTop: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: theme.text.secondary,
    fontWeight: '500',
  },
});
