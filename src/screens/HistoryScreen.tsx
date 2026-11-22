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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { useHistoryStore, HistoryRecord } from '../store/historyStore';
import { loadLocalBackup, shareMessagesBackup } from '../utils/backupService';
import type { Platform } from '../types';
import type { DiscordMessage } from '../api/discord';

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

  // Consultation de l'archive sauvegardée
  const [viewingBackupRecord, setViewingBackupRecord] = useState<HistoryRecord | null>(null);
  const [backupMessages, setBackupMessages] = useState<DiscordMessage[]>([]);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [backupSearch, setBackupSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenBackup = async (record: HistoryRecord) => {
    setViewingBackupRecord(record);
    setIsBackupLoading(true);
    setBackupSearch('');
    const msgs = await loadLocalBackup(record.id);
    setBackupMessages(msgs ?? []);
    setIsBackupLoading(false);
  };

  const handleExportFromModal = () => {
    if (!viewingBackupRecord || backupMessages.length === 0) return;

    Alert.alert(
      '📤 Exporter et Envoyer la sauvegarde',
      `Choisissez le format pour envoyer ces ${backupMessages.length} message(s) archivé(s) :`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '📄 Fichier Texte (.TXT)',
          onPress: () => shareMessagesBackup(backupMessages, viewingBackupRecord.targetName, 'txt'),
        },
        {
          text: '📊 Données (.JSON)',
          onPress: () => shareMessagesBackup(backupMessages, viewingBackupRecord.targetName, 'json'),
        },
      ]
    );
  };

  const filteredBackupMessages = useMemo(() => {
    if (!backupSearch.trim()) return backupMessages;
    const query = backupSearch.toLowerCase();
    return backupMessages.filter(
      (m) =>
        m.content?.toLowerCase().includes(query) ||
        m.channel_name?.toLowerCase().includes(query)
    );
  }, [backupMessages, backupSearch]);

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
              onOpenBackup={() => handleOpenBackup(item)}
            />
          ))
        )}
      </View>

      <View style={{ height: 32 }} />

      {/* ================= MODALE DE CONSULTATION DE L'ARCHIVE ================= */}
      <Modal
        visible={!!viewingBackupRecord}
        animationType="slide"
        onRequestClose={() => setViewingBackupRecord(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header de la modale d'archive */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setViewingBackupRecord(null)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </TouchableOpacity>

            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {viewingBackupRecord?.targetName ?? 'Archive'}
              </Text>
              <Text style={styles.modalSub}>
                {backupMessages.length} message{backupMessages.length > 1 ? 's' : ''} archivé{backupMessages.length > 1 ? 's' : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleExportFromModal}
              style={styles.modalHeaderActionBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={22} color="#5865F2" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche dans l'archive */}
          <View style={styles.modalSearchBox}>
            <Ionicons name="search" size={17} color={theme.text.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Rechercher dans les messages archivés..."
              placeholderTextColor={theme.text.muted}
              value={backupSearch}
              onChangeText={setBackupSearch}
            />
            {backupSearch.length > 0 && (
              <TouchableOpacity onPress={() => setBackupSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Contenu : Loader ou Liste des messages archivés */}
          {isBackupLoading ? (
            <View style={styles.modalCenterBox}>
              <ActivityIndicator size="large" color="#5865F2" />
              <Text style={styles.modalLoadingText}>Chargement de la sauvegarde chiffrée...</Text>
            </View>
          ) : filteredBackupMessages.length === 0 ? (
            <View style={styles.modalCenterBox}>
              <Ionicons name="folder-open-outline" size={48} color={theme.text.muted} />
              <Text style={styles.modalEmptyTitle}>Aucun message trouvé</Text>
              <Text style={styles.modalEmptySub}>
                {backupSearch
                  ? 'Aucun message ne correspond à vos critères de recherche.'
                  : 'Aucun message présent dans cette archive.'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredBackupMessages.map((msg, idx) => {
                const msgDate = new Date(msg.timestamp);
                const dateStr = isNaN(msgDate.getTime())
                  ? msg.timestamp
                  : msgDate.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                return (
                  <View key={msg.id ?? idx} style={styles.archiveItemCard}>
                    <View style={styles.archiveItemHeader}>
                      <View style={styles.archiveChannelBadge}>
                        <Text style={styles.archiveChannelText}>
                          #{msg.channel_name ?? msg.channel_id}
                        </Text>
                      </View>
                      <Text style={styles.archiveDateText}>{dateStr}</Text>
                    </View>

                    <Text style={styles.archiveContentText}>
                      {msg.content || '(Message sans texte / média uniquement)'}
                    </Text>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <View style={styles.archiveMediaBadge}>
                        <Ionicons name="image-outline" size={13} color="#5865F2" style={{ marginRight: 5 }} />
                        <Text style={styles.archiveMediaText}>
                          {msg.attachments.length} pièce{msg.attachments.length > 1 ? 's' : ''} jointe{msg.attachments.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Barre fixe en bas : Bouton Exporter et Envoyer */}
          <View style={styles.modalBottomBar}>
            <TouchableOpacity
              style={[styles.modalExportBtn, backupMessages.length === 0 && { opacity: 0.5 }]}
              onPress={handleExportFromModal}
              disabled={backupMessages.length === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.modalExportBtnText}>
                Exporter & Envoyer ({backupMessages.length} messages)
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

function HistoryCard({
  record,
  onDelete,
  onOpenBackup,
}: {
  record: HistoryRecord;
  onDelete: () => void;
  onOpenBackup?: () => void;
}) {
  const pColor = PLATFORM_COLORS[record.platform] ?? theme.accent.primary;
  const isCompleted = record.status === 'completed';

  const handleExportBackup = async () => {
    const msgs = await loadLocalBackup(record.id);
    if (!msgs || msgs.length === 0) {
      Alert.alert('Information', 'Cette session ne contient pas de copie de sauvegarde disponible.');
      return;
    }

    Alert.alert(
      '💾 Exporter la sauvegarde',
      `Session : ${record.targetName} (${msgs.length} messages sauvegardés)`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '📄 Fichier Texte (.TXT)',
          onPress: () => shareMessagesBackup(msgs, record.targetName, 'txt'),
        },
        {
          text: '📊 Données (.JSON)',
          onPress: () => shareMessagesBackup(msgs, record.targetName, 'json'),
        },
      ]
    );
  };

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

      {/* Bouton pour consulter et exporter la sauvegarde */}
      {record.hasBackup && (
        <View style={styles.backupActionsContainer}>
          <TouchableOpacity
            style={styles.backupViewBtn}
            onPress={onOpenBackup}
            activeOpacity={0.75}
          >
            <Ionicons name="eye-outline" size={14} color="#5865F2" style={{ marginRight: 6 }} />
            <Text style={styles.backupViewBtnText}>Voir l’archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backupShareBtn}
            onPress={handleExportBackup}
            activeOpacity={0.75}
          >
            <Ionicons name="paper-plane-outline" size={13} color="#5865F2" style={{ marginRight: 5 }} />
            <Text style={styles.backupShareBtnText}>Exporter & Envoyer</Text>
          </TouchableOpacity>
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
  backupActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#5865F220',
    marginTop: 10,
    paddingTop: 10,
  },
  backupViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F215',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  backupViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5865F2',
  },
  backupShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#5865F230',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  backupShareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5865F2',
  },
  // Styles de la modale de consultation d'archive
  modalContainer: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  modalHeader: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  modalCloseBtn: {
    padding: 6,
    marginRight: 6,
  },
  modalHeaderCenter: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text.primary,
  },
  modalSub: {
    fontSize: 11,
    color: '#5865F2',
    fontWeight: '600',
    marginTop: 1,
  },
  modalHeaderActionBtn: {
    padding: 6,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text.primary,
    padding: 0,
  },
  modalCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.text.secondary,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
    marginTop: 12,
  },
  modalEmptySub: {
    fontSize: 12,
    color: theme.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  archiveItemCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  archiveItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  archiveChannelBadge: {
    backgroundColor: '#5865F215',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  archiveChannelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5865F2',
  },
  archiveDateText: {
    fontSize: 11,
    color: theme.text.muted,
  },
  archiveContentText: {
    fontSize: 13,
    color: theme.text.primary,
    lineHeight: 18,
  },
  archiveMediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  archiveMediaText: {
    fontSize: 11,
    color: '#5865F2',
    fontWeight: '600',
  },
  modalBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  },
  modalExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F2',
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    elevation: 2,
  },
  modalExportBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
