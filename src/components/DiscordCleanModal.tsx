// Modale de Nettoyage Discord Avancée
// Inspirée des fonctionnalités d'Unpost & Undiscord
// Recherche de salons, multi-sélection, filtres texte/date/médias, prévisualisation et rate-limiting réglable

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
  BackHandler,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { theme } from '../constants/theme';
import { useHistoryStore } from '../store/historyStore';
import {
  getDiscordGuilds,
  getDiscordChannels,
  getDiscordDirectMessages,
  getDiscordMessages,
  deleteDiscordMessage,
  searchDiscordGuildMessages,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
} from '../api/discord';

type Props = {
  visible: boolean;
  token: string;
  userId: string;
  onClose: () => void;
  onFinished?: (deletedCount: number) => void;
};

type Step =
  | 'select_guild'
  | 'select_channels'
  | 'filter_options'
  | 'preview_messages'
  | 'deleting'
  | 'complete';

function getGuildIconUrl(guildId?: string, iconHash?: string | null): string | null {
  if (!guildId || !iconHash) return null;
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=128`;
}

const DATE_FILTER_OPTIONS = [
  {
    days: 0,
    title: 'Tous les messages',
    desc: 'Aucune limite de date, supprime tout l’historique',
    icon: 'infinite-outline',
  },
  {
    days: 1,
    title: 'Plus de 24 heures',
    desc: 'Messages envoyés il y a plus d’un jour',
    icon: 'today-outline',
  },
  {
    days: 7,
    title: 'Plus de 7 jours',
    desc: 'Messages de plus d’une semaine',
    icon: 'calendar-outline',
  },
  {
    days: 30,
    title: 'Plus de 30 jours (1 mois)',
    desc: 'Messages de plus d’un mois',
    icon: 'calendar-number-outline',
  },
  {
    days: 90,
    title: 'Plus de 90 jours (3 mois)',
    desc: 'Messages de plus d’un trimestre',
    icon: 'time-outline',
  },
  {
    days: 365,
    title: 'Plus de 1 an',
    desc: 'Anciennes traces de plus d’une année',
    icon: 'archive-outline',
  },
];

const SPEED_OPTIONS = [
  {
    ms: 500,
    title: 'Normal (500 ms) — Recommandé',
    desc: 'Protection anti-ban Discord équilibrée',
    tag: 'Recommandé',
  },
  {
    ms: 1000,
    title: 'Prudent (1 seconde)',
    desc: 'Sécurité maximale pour gros volumes (+100 messages)',
    tag: 'Max sécurité',
  },
  {
    ms: 250,
    title: 'Rapide (250 ms)',
    desc: 'Pour quelques messages récents',
    tag: 'Rapide',
  },
];

export function DiscordCleanModal({ visible, token, userId, onClose, onFinished }: Props) {
  const [step, setStep] = useState<Step>('select_guild');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Chargement en cours...');
  const [error, setError] = useState<string | null>(null);

  // Serveurs
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [guildSearch, setGuildSearch] = useState('');
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  // Salons & Multi-sélection
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());

  // Filtres avancés
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterDays, setFilterDays] = useState<number>(0); // 0 = tous
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(false);
  const [onlyWithLinks, setOnlyWithLinks] = useState(false);
  const [ignorePinned, setIgnorePinned] = useState(true);
  const [speedDelayMs, setSpeedDelayMs] = useState<number>(500); // 500ms normal
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

  // Messages trouvés & Sélection individuelle
  const [scannedMessages, setScannedMessages] = useState<DiscordMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Exécution de la suppression
  const [deletedCount, setDeletedCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pauseRef = useRef(false);
  const stopRef = useRef(false);
  const scanAbortedRef = useRef(false);

  // Reset à l'ouverture
  useEffect(() => {
    if (visible && token) {
      loadGuilds();
    } else {
      setStep('select_guild');
      setSelectedGuild(null);
      setGuildSearch('');
      setChannels([]);
      setChannelSearch('');
      setSelectedChannelIds(new Set());
      setFilterKeyword('');
      setFilterDays(0);
      setIsDateDropdownOpen(false);
      setIsSpeedDropdownOpen(false);
      setOnlyWithAttachments(false);
      setOnlyWithLinks(false);
      setIgnorePinned(true);
      setScannedMessages([]);
      setSelectedMessageIds(new Set());
      setDeletedCount(0);
      setError(null);
      stopRef.current = false;
      pauseRef.current = false;
    }
  }, [visible, token]);

  // 1. Charger les serveurs
  const loadGuilds = async () => {
    setLoading(true);
    setLoadingText('Chargement de vos serveurs Discord...');
    setError(null);
    try {
      const g = await getDiscordGuilds(token);
      setGuilds(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement serveurs');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les serveurs selon la recherche
  const filteredGuilds = useMemo(() => {
    if (!guildSearch.trim()) return guilds;
    const q = guildSearch.toLowerCase();
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, guildSearch]);

  // 2. Choisir un serveur
  const handleSelectGuild = async (guild: DiscordGuild) => {
    setSelectedGuild(guild);
    setLoading(true);
    setLoadingText(`Chargement des salons de ${guild.name}...`);
    setError(null);
    try {
      const chs = await getDiscordChannels(token, guild.id);
      const textChannels = chs.filter((c) => c.type === 0);
      setChannels(textChannels);
      setSelectedChannelIds(new Set(textChannels.map((c) => c.id))); // Tous cochés par défaut
      setStep('select_channels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement canaux');
    } finally {
      setLoading(false);
    }
  };

  // Choisir les Messages Privés (DMs)
  const handleSelectDMs = async () => {
    setSelectedGuild({ id: 'dms', name: 'Messages Privés (DMs)' });
    setLoading(true);
    setLoadingText('Chargement de vos conversations privées...');
    setError(null);
    try {
      const dms = await getDiscordDirectMessages(token);
      const formatted = dms.map((d) => ({
        ...d,
        name:
          d.recipients && d.recipients.length > 0
            ? d.recipients.map((r) => r.username).join(', ')
            : d.name || 'Conversation privée',
      }));
      setChannels(formatted);
      setSelectedChannelIds(new Set(formatted.map((c) => c.id)));
      setStep('select_channels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement DMs');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les salons selon la recherche
  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return channels;
    const q = channelSearch.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, channelSearch]);

  // Basculer la sélection d'un salon
  const toggleChannel = (channelId: string) => {
    const next = new Set(selectedChannelIds);
    if (next.has(channelId)) {
      next.delete(channelId);
    } else {
      next.add(channelId);
    }
    setSelectedChannelIds(next);
  };

  const selectAllChannels = () => {
    setSelectedChannelIds(new Set(channels.map((c) => c.id)));
  };

  const deselectAllChannels = () => {
    setSelectedChannelIds(new Set());
  };

  const isAllChannelsSelected = channels.length > 0 && selectedChannelIds.size === channels.length;
  const toggleAllChannels = () => {
    if (isAllChannelsSelected) {
      setSelectedChannelIds(new Set());
    } else {
      setSelectedChannelIds(new Set(channels.map((c) => c.id)));
    }
  };

  // 3. Scanner les messages sur les salons sélectionnés (Optimisé & Parallélisé)
  const handleStartScan = async () => {
    if (selectedChannelIds.size === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner au moins un salon.');
      return;
    }

    setLoading(true);
    setIsScanning(true);
    setError(null);
    scanAbortedRef.current = false;
    setLoadingText('Recherche instantanée des messages...');

    const thresholdDate =
      filterDays > 0 ? Date.now() - filterDays * 24 * 60 * 60 * 1000 : 0;
    const lowerKeyword = filterKeyword.trim().toLowerCase();
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const allFound: DiscordMessage[] = [];

    // Helper pour valider les filtres sur un message
    const matchesFilters = (msg: DiscordMessage) => {
      if (msg.author.id !== userId) return false;
      if (ignorePinned && msg.pinned) return false;
      if (thresholdDate > 0) {
        const msgDate = new Date(msg.timestamp).getTime();
        if (msgDate > thresholdDate) return false;
      }
      if (lowerKeyword && !msg.content.toLowerCase().includes(lowerKeyword)) {
        return false;
      }
      if (onlyWithAttachments && (!msg.attachments || msg.attachments.length === 0)) {
        return false;
      }
      if (onlyWithLinks && !linkRegex.test(msg.content)) {
        return false;
      }
      return true;
    };

    try {
      // Étape A : Tentative Fast Search API si on est sur un serveur Discord
      let fastSearchSuccess = false;
      if (selectedGuild && selectedGuild.id !== 'dms') {
        try {
          const searchRes = await searchDiscordGuildMessages(token, selectedGuild.id, {
            authorId: userId,
            content: filterKeyword.trim() || undefined,
            has: onlyWithAttachments ? 'file' : onlyWithLinks ? 'link' : undefined,
          });

          if (searchRes && Array.isArray(searchRes.messages) && searchRes.messages.length > 0) {
            for (const msg of searchRes.messages) {
              // Vérifier si le message appartient à l'un des salons sélectionnés
              if (selectedChannelIds.has(msg.channel_id)) {
                if (matchesFilters(msg)) {
                  const channelObj = channels.find((c) => c.id === msg.channel_id);
                  allFound.push({
                    ...msg,
                    channel_name: channelObj ? channelObj.name : msg.channel_id,
                  });
                }
              }
            }
            fastSearchSuccess = true;
          }
        } catch {
          // Fallback sur le scan direct des salons
        }
      }

      // Étape B : Si Fast Search non disponible ou DMs, scan parallèle par lots (Batch de 4 salons)
      if (!fastSearchSuccess) {
        const channelList = Array.from(selectedChannelIds);
        const BATCH_SIZE = 4;
        let processedCount = 0;

        for (let i = 0; i < channelList.length; i += BATCH_SIZE) {
          if (scanAbortedRef.current) break;

          const batch = channelList.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (channelId) => {
              const channelObj = channels.find((c) => c.id === channelId);
              const channelName = channelObj ? channelObj.name : channelId;

              try {
                const messages = await getDiscordMessages(token, channelId);
                for (const msg of messages) {
                  if (matchesFilters(msg)) {
                    allFound.push({
                      ...msg,
                      channel_name: channelName,
                    });
                  }
                }
              } catch (e) {
                console.warn(`Erreur scan salon ${channelId}:`, e);
              }
            })
          );

          processedCount += batch.length;
          setLoadingText(
            `Analyse : ${Math.min(processedCount, channelList.length)}/${channelList.length} salons • ${allFound.length} message(s) trouvé(s)`
          );
        }
      }

      setScannedMessages(allFound);
      setSelectedMessageIds(new Set(allFound.map((m) => m.id))); // Tous cochés par défaut

      if (allFound.length === 0) {
        Alert.alert('Aucun message', 'Aucun message ne correspond à vos filtres.');
      } else {
        setStep('preview_messages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur scan messages');
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  };

  // Basculer la sélection d'un message individuel
  const toggleMessage = (id: string) => {
    const next = new Set(selectedMessageIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMessageIds(next);
  };

  const selectAllMessages = () => {
    setSelectedMessageIds(new Set(scannedMessages.map((m) => m.id)));
  };

  const deselectAllMessages = () => {
    setSelectedMessageIds(new Set());
  };

  const isAllMessagesSelected =
    scannedMessages.length > 0 && selectedMessageIds.size === scannedMessages.length;
  const toggleAllMessages = () => {
    if (isAllMessagesSelected) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(scannedMessages.map((m) => m.id)));
    }
  };

  // 4. Lancer la suppression
  const handleConfirmDeletion = () => {
    if (selectedMessageIds.size === 0) {
      Alert.alert('Attention', 'Veuillez cocher au moins un message à supprimer.');
      return;
    }

    Alert.alert(
      '⚠️ Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer définitivement ${selectedMessageIds.size} message(s) ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: executeDeletion },
      ]
    );
  };

  const recordCleanHistory = async (deleted: number, total: number, isInterrupted: boolean) => {
    if (deleted === 0 && total === 0) return;
    try {
      const targetName =
        selectedGuild?.id === 'dms'
          ? 'Messages Privés (DMs)'
          : `${selectedGuild?.name ?? 'Discord'} (${selectedChannelIds.size} salon${selectedChannelIds.size > 1 ? 's' : ''})`;

      const dateOpt = DATE_FILTER_OPTIONS.find((o) => o.days === filterDays);
      const speedOpt = SPEED_OPTIONS.find((o) => o.ms === speedDelayMs);

      await useHistoryStore.getState().addRecord({
        platform: 'discord',
        targetName,
        deletedCount: deleted,
        totalTargeted: total,
        status: isInterrupted ? 'interrupted' : 'completed',
        filters: {
          keyword: filterKeyword.trim() || undefined,
          dateFilterTitle: dateOpt?.title,
          onlyWithAttachments: onlyWithAttachments || undefined,
          onlyWithLinks: onlyWithLinks || undefined,
          ignorePinned,
          speedTitle: speedOpt?.title,
        },
      });
    } catch (e) {
      console.warn('[DiscordCleanModal] Erreur enregistrement historique:', e);
    }
  };

  const executeDeletion = async () => {
    setStep('deleting');
    setDeletedCount(0);
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;

    const messagesToDelete = scannedMessages.filter((m) => selectedMessageIds.has(m.id));
    let count = 0;

    for (let i = 0; i < messagesToDelete.length; i++) {
      if (stopRef.current) break;

      // Attente si en pause
      while (pauseRef.current && !stopRef.current) {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));
      }

      const msg = messagesToDelete[i];
      setCurrentStatus(`[#${msg.channel_name ?? 'salon'}] "${msg.content.slice(0, 30)}..."`);

      try {
        await deleteDiscordMessage(token, msg.channel_id, msg.id, speedDelayMs);
        count++;
        setDeletedCount(count);
      } catch (err) {
        console.warn('Erreur suppression message:', err);
      }
    }

    await recordCleanHistory(count, messagesToDelete.length, stopRef.current);
    setStep('complete');
    onFinished?.(count);
  };

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    pauseRef.current = next;
  };

  const stopDeletion = () => {
    Alert.alert('Arrêter', 'Voulez-vous interrompre le nettoyage ?', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: () => {
          stopRef.current = true;
        },
      },
    ]);
  };

  // Gestion du retour physique Android (Hardware Back Button) et bouton retour header
  const handleBackAction = () => {
    // 1. Si un menu déroulant est ouvert, le refermer en priorité
    if (isDateDropdownOpen) {
      setIsDateDropdownOpen(false);
      return true;
    }
    if (isSpeedDropdownOpen) {
      setIsSpeedDropdownOpen(false);
      return true;
    }

    // 2. Si une suppression est en cours, confirmer avant d'interrompre
    if (step === 'deleting') {
      Alert.alert(
        'Suppression en cours',
        'Voulez-vous vraiment stopper le nettoyage et quitter ?',
        [
          { text: 'Continuer la suppression', style: 'cancel' },
          {
            text: 'Stopper et quitter',
            style: 'destructive',
            onPress: () => {
              stopRef.current = true;
              onClose();
            },
          },
        ]
      );
      return true;
    }

    // 3. Navigation progressive étape par étape
    if (step === 'preview_messages') {
      setStep('filter_options');
      return true;
    }

    if (step === 'filter_options') {
      setStep('select_channels');
      return true;
    }

    if (step === 'select_channels') {
      setStep('select_guild');
      return true;
    }

    if (step === 'select_guild' || step === 'complete') {
      onClose();
      return true;
    }

    return true; // Toujours consommer l'événement pour éviter de sauter vers l'accueil
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackAction);
    return () => sub.remove();
  }, [visible, step, isDateDropdownOpen, isSpeedDropdownOpen]);

  // Calculs dynamiques
  const targetCount = selectedMessageIds.size;
  const percent = targetCount > 0 ? Math.round((deletedCount / targetCount) * 100) : 0;
  const remainingCount = targetCount - deletedCount;
  const estimatedSeconds = Math.ceil((remainingCount * speedDelayMs) / 1000);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { handleBackAction(); }}>
      <SafeAreaView style={styles.container}>
        {/* Header Cleanly */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackAction}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={step === 'select_guild' || step === 'complete' ? 'close' : 'chevron-back'}
              size={24}
              color={theme.text.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Nettoyage Discord</Text>
            {selectedGuild && (
              <View style={styles.headerGuildRow}>
                {getGuildIconUrl(selectedGuild.id, selectedGuild.icon) ? (
                  <Image
                    source={{ uri: getGuildIconUrl(selectedGuild.id, selectedGuild.icon)! }}
                    style={styles.headerGuildIcon}
                  />
                ) : (
                  <Ionicons
                    name={selectedGuild.id === 'dms' ? 'chatbubbles' : 'server-outline'}
                    size={13}
                    color="#5865F2"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={styles.headerSub} numberOfLines={1}>
                  {selectedGuild.name}
                </Text>
              </View>
            )}
          </View>

          <View style={{ width: 32 }} />
        </View>

        {/* Loader */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#5865F2" />
            <Text style={styles.loadingText}>{loadingText}</Text>
            {isScanning && (
              <TouchableOpacity
                style={styles.stopScanBtn}
                onPress={() => {
                  scanAbortedRef.current = true;
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="stop-circle-outline" size={18} color={theme.accent.amber} />
                <Text style={styles.stopScanBtnText}>Afficher les messages déjà trouvés</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle" size={48} color={theme.accent.red} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={loadGuilds}>
              <Text style={styles.primaryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* ================= ÉTAPE 1 : CHOIX DU SERVEUR / DMS ================= */}
            {step === 'select_guild' && (
              <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>1. Où voulez-vous nettoyer ?</Text>
                <Text style={styles.sectionDesc}>
                  Choisissez vos messages privés ou un serveur Discord.
                </Text>

                {/* Option Messages Privés (DMs) */}
                <TouchableOpacity
                  style={[styles.itemCard, styles.dmCard]}
                  onPress={handleSelectDMs}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarBox, { backgroundColor: '#5865F2' }]}>
                    <Ionicons name="chatbubbles" size={20} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: '#5865F2', fontWeight: '700' }]}>
                      Messages Privés (DMs)
                    </Text>
                    <Text style={styles.itemSub}>Nettoyer vos conversations directes avec des personnes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#5865F2" />
                </TouchableOpacity>

                <View style={styles.separatorRow}>
                  <Text style={styles.sectionSubtitle}>Vos Serveurs Discord ({guilds.length})</Text>
                </View>

                {/* Barre de recherche serveur */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={theme.text.muted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un serveur..."
                    placeholderTextColor={theme.text.muted}
                    value={guildSearch}
                    onChangeText={setGuildSearch}
                  />
                  {guildSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setGuildSearch('')}>
                      <Ionicons name="close-circle" size={18} color={theme.text.muted} />
                    </TouchableOpacity>
                  )}
                </View>

                {filteredGuilds.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Aucun serveur correspondant</Text>
                  </View>
                ) : (
                  filteredGuilds.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.itemCard}
                      onPress={() => handleSelectGuild(g)}
                      activeOpacity={0.7}
                    >
                      {getGuildIconUrl(g.id, g.icon) ? (
                        <Image
                          source={{ uri: getGuildIconUrl(g.id, g.icon)! }}
                          style={styles.guildIconImg}
                        />
                      ) : (
                        <View style={[styles.avatarBox, { backgroundColor: '#5865F2' }]}>
                          <Text style={styles.guildInitials}>
                            {g.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{g.name}</Text>
                        <Text style={styles.itemSub}>Appuyer pour voir les salons</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
                    </TouchableOpacity>
                  ))
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}

            {/* ================= ÉTAPE 2 : SÉLECTION DES SALONS (MULTI-CHOIX) ================= */}
            {step === 'select_channels' && (
              <View style={{ flex: 1 }}>
                <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
                  {/* Carte Récapitulative du Serveur avec Logo */}
                  {selectedGuild && (
                    <View style={styles.serverCardHeader}>
                      {getGuildIconUrl(selectedGuild.id, selectedGuild.icon) ? (
                        <Image
                          source={{ uri: getGuildIconUrl(selectedGuild.id, selectedGuild.icon)! }}
                          style={styles.serverCardImg}
                        />
                      ) : (
                        <View style={[styles.avatarBox, { backgroundColor: '#5865F2' }]}>
                          {selectedGuild.id === 'dms' ? (
                            <Ionicons name="chatbubbles" size={20} color="#FFF" />
                          ) : (
                            <Text style={styles.guildInitials}>
                              {selectedGuild.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.serverCardTitle} numberOfLines={1}>
                          {selectedGuild.name}
                        </Text>
                        <Text style={styles.serverCardSub}>
                          {channels.length} salon{channels.length > 1 ? 's' : ''} disponible{channels.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.sectionTitle}>2. Sélectionnez les salons</Text>
                  <Text style={styles.sectionDesc}>
                    Cochez les salons à scanner pour vos messages.
                  </Text>

                  {/* Vraie Checkbox interactive Tout cocher / Tout décocher */}
                  <TouchableOpacity
                    style={[
                      styles.selectAllCheckboxBar,
                      isAllChannelsSelected && styles.selectAllCheckboxBarActive,
                    ]}
                    onPress={toggleAllChannels}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        isAllChannelsSelected
                          ? 'checkbox'
                          : selectedChannelIds.size > 0
                          ? 'remove-circle'
                          : 'square-outline'
                      }
                      size={22}
                      color={
                        isAllChannelsSelected || selectedChannelIds.size > 0
                          ? '#5865F2'
                          : theme.text.muted
                      }
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.selectAllCheckboxText,
                        isAllChannelsSelected && styles.selectAllCheckboxTextActive,
                      ]}
                    >
                      {isAllChannelsSelected ? 'Tous les salons cochés' : 'Tout cocher'}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <View
                      style={[
                        styles.countBadge,
                        isAllChannelsSelected && styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          isAllChannelsSelected && styles.countBadgeTextActive,
                        ]}
                      >
                        {selectedChannelIds.size} / {channels.length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Barre de recherche de salons */}
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={theme.text.muted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Rechercher un salon..."
                      placeholderTextColor={theme.text.muted}
                      value={channelSearch}
                      onChangeText={setChannelSearch}
                    />
                    {channelSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setChannelSearch('')}>
                        <Ionicons name="close-circle" size={18} color={theme.text.muted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredChannels.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>Aucun salon textuel trouvé</Text>
                    </View>
                  ) : (
                    filteredChannels.map((c) => {
                      const isChecked = selectedChannelIds.has(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.itemCard, isChecked && styles.itemCardSelected]}
                          onPress={() => toggleChannel(c.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isChecked ? '#5865F2' : theme.text.muted}
                            style={{ marginRight: 12 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, isChecked && { color: '#5865F2' }]}>
                              #{c.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                  <View style={{ height: 80 }} />
                </ScrollView>

                {/* Footer validation */}
                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, selectedChannelIds.size === 0 && { opacity: 0.5 }]}
                    onPress={() => setStep('filter_options')}
                    disabled={selectedChannelIds.size === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>
                      Continuer avec {selectedChannelIds.size} salon(s) →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= ÉTAPE 3 : FILTRES AVANCÉS & SCAN ================= */}
            {step === 'filter_options' && (
              <View style={{ flex: 1 }}>
                <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionTitle}>3. Filtres de recherche</Text>
                  <Text style={styles.sectionDesc}>
                    Ciblez précisément les messages à supprimer.
                  </Text>

                  {/* 1. Mot-clé */}
                  <View style={styles.filterCard}>
                    <Text style={styles.filterLabel}>🔍 Contient le mot ou texte :</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex : mot de passe, lien, secret... (laisser vide pour tout)"
                      placeholderTextColor={theme.text.muted}
                      value={filterKeyword}
                      onChangeText={setFilterKeyword}
                    />
                  </View>

                  {/* 2. Ancienneté — Liste déroulante compacte */}
                  <View style={styles.filterCard}>
                    <View style={styles.filterHeaderRow}>
                      <Ionicons name="calendar-outline" size={18} color="#5865F2" style={{ marginRight: 8 }} />
                      <Text style={styles.filterLabel}>Ancienneté des messages</Text>
                    </View>

                    {/* Bouton déroulant compact (1 seule ligne fermée) */}
                    <TouchableOpacity
                      style={[styles.dropdownBtn, isDateDropdownOpen && styles.dropdownBtnActive]}
                      onPress={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownLeft}>
                        <View style={styles.dropdownIconCircle}>
                          <Ionicons
                            name={
                              (DATE_FILTER_OPTIONS.find((o) => o.days === filterDays) ?? DATE_FILTER_OPTIONS[0]).icon
                            }
                            size={16}
                            color="#5865F2"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownValue}>
                            {(DATE_FILTER_OPTIONS.find((o) => o.days === filterDays) ?? DATE_FILTER_OPTIONS[0]).title}
                          </Text>
                          <Text style={styles.dropdownDesc} numberOfLines={1}>
                            {(DATE_FILTER_OPTIONS.find((o) => o.days === filterDays) ?? DATE_FILTER_OPTIONS[0]).desc}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isDateDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.text.secondary}
                      />
                    </TouchableOpacity>

                    {/* Menu déroulant dépliable */}
                    {isDateDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        {DATE_FILTER_OPTIONS.map((opt, idx) => {
                          const isSelected = filterDays === opt.days;
                          return (
                            <TouchableOpacity
                              key={opt.days}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemSelected,
                                idx < DATE_FILTER_OPTIONS.length - 1 && styles.dropdownItemBorder,
                              ]}
                              onPress={() => {
                                setFilterDays(opt.days);
                                setIsDateDropdownOpen(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={opt.icon}
                                size={18}
                                color={isSelected ? '#5865F2' : theme.text.muted}
                                style={{ marginRight: 12 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleSelected]}>
                                  {opt.title}
                                </Text>
                                <Text style={styles.dropdownItemDesc}>{opt.desc}</Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#5865F2" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* 3. Types de contenu */}
                  <View style={styles.filterCard}>
                    <View style={styles.filterHeaderRow}>
                      <Ionicons name="attach-outline" size={18} color="#5865F2" style={{ marginRight: 8 }} />
                      <Text style={styles.filterLabel}>Type de contenu & Protections</Text>
                    </View>

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchTitle}>Avec pièces jointes uniquement</Text>
                        <Text style={styles.switchSub}>Images, vidéos, fichiers PDF/ZIP</Text>
                      </View>
                      <Switch
                        value={onlyWithAttachments}
                        onValueChange={setOnlyWithAttachments}
                        trackColor={{ true: '#5865F2', false: theme.bg.raised }}
                      />
                    </View>

                    <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchTitle}>Avec liens URLs uniquement</Text>
                        <Text style={styles.switchSub}>Liens internet et aperçus</Text>
                      </View>
                      <Switch
                        value={onlyWithLinks}
                        onValueChange={setOnlyWithLinks}
                        trackColor={{ true: '#5865F2', false: theme.bg.raised }}
                      />
                    </View>

                    <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchTitle}>Ignorer les messages épinglés</Text>
                        <Text style={styles.switchSub}>Garder les messages importants ou annonces</Text>
                      </View>
                      <Switch
                        value={ignorePinned}
                        onValueChange={setIgnorePinned}
                        trackColor={{ true: '#5865F2', false: theme.bg.raised }}
                      />
                    </View>
                  </View>

                  {/* 4. Vitesse de suppression (Anti-ban) — Liste déroulante compacte */}
                  <View style={styles.filterCard}>
                    <View style={styles.filterHeaderRow}>
                      <Ionicons name="flash-outline" size={18} color="#5865F2" style={{ marginRight: 8 }} />
                      <Text style={styles.filterLabel}>Vitesse & Protection Anti-Ban</Text>
                    </View>

                    {/* Bouton déroulant compact */}
                    <TouchableOpacity
                      style={[styles.dropdownBtn, isSpeedDropdownOpen && styles.dropdownBtnActive]}
                      onPress={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownLeft}>
                        <View style={[styles.dropdownIconCircle, { backgroundColor: '#5865F215' }]}>
                          <Ionicons name="speedometer-outline" size={16} color="#5865F2" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownValue}>
                            {(SPEED_OPTIONS.find((o) => o.ms === speedDelayMs) ?? SPEED_OPTIONS[0]).title}
                          </Text>
                          <Text style={styles.dropdownDesc} numberOfLines={1}>
                            {(SPEED_OPTIONS.find((o) => o.ms === speedDelayMs) ?? SPEED_OPTIONS[0]).desc}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isSpeedDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.text.secondary}
                      />
                    </TouchableOpacity>

                    {/* Menu déroulant dépliable */}
                    {isSpeedDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        {SPEED_OPTIONS.map((opt, idx) => {
                          const isSelected = speedDelayMs === opt.ms;
                          return (
                            <TouchableOpacity
                              key={opt.ms}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemSelected,
                                idx < SPEED_OPTIONS.length - 1 && styles.dropdownItemBorder,
                              ]}
                              onPress={() => {
                                setSpeedDelayMs(opt.ms);
                                setIsSpeedDropdownOpen(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleSelected]}>
                                  {opt.title}
                                </Text>
                                <Text style={styles.dropdownItemDesc}>{opt.desc}</Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#5865F2" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <View style={{ height: 80 }} />
                </ScrollView>

                {/* Footer Scan */}
                <View style={styles.bottomBar}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleStartScan} activeOpacity={0.85}>
                    <Ionicons name="search" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Lancer le scan des messages</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= ÉTAPE 4 : PRÉVISUALISATION DES MESSAGES ================= */}
            {step === 'preview_messages' && (
              <View style={{ flex: 1 }}>
                <View style={styles.previewHeader}>
                  <View>
                    <Text style={styles.previewTitle}>
                      🎯 {scannedMessages.length} message(s) trouvé(s)
                    </Text>
                    <Text style={styles.previewSub}>
                      {selectedMessageIds.size} sélectionné(s) • ~{estimatedSeconds}s de suppression
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.previewCheckboxBtn,
                      isAllMessagesSelected && styles.previewCheckboxBtnActive,
                    ]}
                    onPress={toggleAllMessages}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        isAllMessagesSelected
                          ? 'checkbox'
                          : selectedMessageIds.size > 0
                          ? 'remove-circle'
                          : 'square-outline'
                      }
                      size={20}
                      color={
                        isAllMessagesSelected || selectedMessageIds.size > 0
                          ? theme.accent.red
                          : theme.text.muted
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.previewCheckboxText,
                        isAllMessagesSelected && styles.previewCheckboxTextActive,
                      ]}
                    >
                      {isAllMessagesSelected ? 'Tout coché' : 'Tout cocher'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
                  {scannedMessages.map((msg) => {
                    const isChecked = selectedMessageIds.has(msg.id);
                    const dateFormatted = new Date(msg.timestamp).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <TouchableOpacity
                        key={msg.id}
                        style={[styles.messageCard, isChecked && styles.messageCardSelected]}
                        onPress={() => toggleMessage(msg.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? theme.accent.red : theme.text.muted}
                          style={{ marginRight: 12, marginTop: 2 }}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={styles.messageMetaRow}>
                            <Text style={styles.messageChannel}>#{msg.channel_name}</Text>
                            <Text style={styles.messageDate}>{dateFormatted}</Text>
                          </View>

                          <Text style={styles.messageContent} numberOfLines={3}>
                            {msg.content || '(Message sans texte / média uniquement)'}
                          </Text>

                          {/* Badges médias */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <View style={styles.mediaBadge}>
                              <Ionicons name="image" size={12} color="#5865F2" style={{ marginRight: 4 }} />
                              <Text style={styles.mediaBadgeText}>{msg.attachments.length} fichier(s)</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: 80 }} />
                </ScrollView>

                {/* Footer suppression */}
                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={[styles.deleteBtn, selectedMessageIds.size === 0 && { opacity: 0.5 }]}
                    onPress={handleConfirmDeletion}
                    disabled={selectedMessageIds.size === 0}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteBtnText}>
                      Supprimer définitivement {selectedMessageIds.size} message(s)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= ÉTAPE 5 : SUPPRESSION EN COURS ================= */}
            {step === 'deleting' && (
              <View style={styles.deletingContainer}>
                <View style={styles.deletingIcon}>
                  <Text style={{ fontSize: 44 }}>🧹</Text>
                </View>

                <Text style={styles.deletingTitle}>Suppression en cours...</Text>
                <Text style={styles.deletingSub}>
                  Protection anti-ban active ({speedDelayMs} ms par message)
                </Text>

                {/* Barre de progression */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${percent}%` }]} />
                </View>

                <Text style={styles.percentText}>{percent}%</Text>
                <Text style={styles.countText}>
                  {deletedCount} / {targetCount} messages supprimés
                </Text>

                {remainingCount > 0 && (
                  <Text style={styles.timerText}>Temps restant estimé : ~{estimatedSeconds}s</Text>
                )}

                <Text style={styles.statusLog} numberOfLines={1}>
                  {currentStatus}
                </Text>

                {/* Contrôles Pause / Stop */}
                <View style={styles.controlRow}>
                  <TouchableOpacity style={styles.controlBtn} onPress={togglePause} activeOpacity={0.8}>
                    <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={theme.text.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.controlBtnText}>{isPaused ? 'Reprendre' : 'Pause'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, { borderColor: theme.accent.red }]}
                    onPress={stopDeletion}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stop" size={18} color={theme.accent.red} style={{ marginRight: 6 }} />
                    <Text style={[styles.controlBtnText, { color: theme.accent.red }]}>Arrêter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= ÉTAPE 6 : TERMINÉ ================= */}
            {step === 'complete' && (
              <View style={styles.centerBox}>
                <Ionicons name="checkmark-circle" size={76} color={theme.accent.green} />
                <Text style={styles.completeTitle}>Nettoyage terminé !</Text>
                <Text style={styles.completeSub}>
                  {deletedCount} message(s) ont été effacés avec succès.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Terminé</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
  },
  headerSub: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  pageContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 13,
    color: theme.text.secondary,
    marginBottom: 14,
  },
  separatorRow: {
    marginTop: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text.primary,
    padding: 0,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  itemCardSelected: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F208',
  },
  dmCard: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F208',
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guildIconImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  guildInitials: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerGuildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    maxWidth: 220,
  },
  headerGuildIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 5,
  },
  serverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5865F230',
    backgroundColor: '#5865F208',
  },
  serverCardImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  serverCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text.primary,
  },
  serverCardSub: {
    fontSize: 12,
    color: '#5865F2',
    fontWeight: '600',
    marginTop: 2,
  },
  selectAllCheckboxBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginBottom: 12,
  },
  selectAllCheckboxBarActive: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F20A',
  },
  selectAllCheckboxText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  selectAllCheckboxTextActive: {
    color: '#5865F2',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: theme.bg.raised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  countBadgeActive: {
    backgroundColor: '#5865F220',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text.muted,
  },
  countBadgeTextActive: {
    color: '#5865F2',
    fontWeight: '700',
  },
  previewCheckboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg.raised,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  previewCheckboxBtnActive: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444440',
  },
  previewCheckboxText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  previewCheckboxTextActive: {
    color: theme.accent.red,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text.primary,
  },
  itemSub: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    marginTop: 8,
  },
  emptyText: {
    color: theme.text.muted,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5865F2',
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5865F2',
  },
  filterCard: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text.primary,
  },
  filterSubtitle: {
    fontSize: 12,
    color: theme.text.secondary,
    marginBottom: 10,
  },
  radioList: {
    backgroundColor: theme.bg.base,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  radioRowSelected: {
    backgroundColor: '#5865F20A',
  },
  radioRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  radioIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioIconBoxSelected: {
    backgroundColor: '#5865F215',
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  radioTitleSelected: {
    color: '#5865F2',
    fontWeight: '700',
  },
  radioDesc: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: theme.bg.base,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text.primary,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.bg.raised,
  },
  filterChipActive: {
    backgroundColor: '#5865F2',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  // Dropdown compact (Ancienneté & Vitesse)
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bg.raised,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  dropdownBtnActive: {
    borderColor: '#5865F2',
    backgroundColor: '#FFF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#5865F215',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text.primary,
  },
  dropdownDesc: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 1,
  },
  dropdownMenu: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.md,
    marginTop: 6,
    overflow: 'hidden',
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemSelected: {
    backgroundColor: '#5865F20D',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  dropdownItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.primary,
  },
  dropdownItemTitleSelected: {
    color: '#5865F2',
    fontWeight: '700',
  },
  dropdownItemDesc: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  switchSub: {
    fontSize: 12,
    color: theme.text.muted,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F2',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent.red,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
  },
  previewSub: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 2,
  },
  messageCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  messageCardSelected: {
    borderColor: theme.accent.red,
    backgroundColor: '#FA3E3E08',
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageChannel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5865F2',
  },
  messageDate: {
    fontSize: 11,
    color: theme.text.muted,
  },
  messageContent: {
    fontSize: 13,
    color: theme.text.primary,
    lineHeight: 18,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#5865F215',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaBadgeText: {
    fontSize: 11,
    color: '#5865F2',
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stopScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.full,
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  stopScanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent.amber,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.accent.red,
    textAlign: 'center',
    marginBottom: 16,
  },
  deletingContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  deletingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 4,
  },
  deletingSub: {
    fontSize: 13,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.bg.raised,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.accent.red,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.accent.red,
    marginBottom: 2,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.accent.amber,
    marginBottom: 12,
  },
  statusLog: {
    fontSize: 12,
    color: theme.text.muted,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.default,
    backgroundColor: '#FFF',
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  completeSub: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});
