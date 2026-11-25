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
import { shareMessagesBackup, saveBackupLocally } from '../utils/backupService';
import { CustomAlertModal, CustomAlertButton } from './CustomAlertModal';
import { cleanNotificationService } from '../services/cleanNotificationService';
import { detectPII } from '../utils/piiDetector';
import {
  getDiscordGuilds,
  getDiscordChannels,
  getDiscordDirectMessages,
  getDiscordMessages,
  deleteDiscordMessage,
  editDiscordMessage,
  closeDiscordDMChannel,
  deleteDiscordReaction,
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

// Helpers grammaticaux français : suppression des (s) et accord dynamique selon la quantité
const plural = (count: number, singular: string, pluralForm: string) =>
  count > 1 ? pluralForm : singular;

const formatCount = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count > 1 ? pluralForm : singular}`;

interface CustomAlertState {
  visible: boolean;
  type?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  buttons: CustomAlertButton[];
}

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
    desc: 'Vitesse fluide et équilibrée',
    tag: 'Recommandé',
  },
  {
    ms: 1000,
    title: '🛡️ Prudent (1 seconde) — Anti-ban',
    desc: 'Protection anti-ban Discord pour gros volumes',
    tag: 'Anti-ban',
  },
  {
    ms: 250,
    title: '⚡ Rapide (250 ms)',
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
  const [isGhostModeEnabled, setIsGhostModeEnabled] = useState(false); // Mode Furtif (Ghosting Anti-Logs)
  const [speedDelayMs, setSpeedDelayMs] = useState<number>(500); // 500ms normal
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

  // Messages trouvés & Sélection individuelle
  const [scannedMessages, setScannedMessages] = useState<DiscordMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [messageSearch, setMessageSearch] = useState('');
  const [filterPIIOnly, setFilterPIIOnly] = useState(false); // FEAT-02 : Filtre Données Sensibles (PII Shield)
  const [autoCloseDMs, setAutoCloseDMs] = useState(false); // FEAT-03 : Fermeture automatique des DMs nettoyés
  const [isCleanReactionsEnabled, setIsCleanReactionsEnabled] = useState(true); // FEAT-04 : Nettoyage Réactions Emojis
  const [isBackupEnabled, setIsBackupEnabled] = useState(true);

  // Exécution de la suppression
  const [deletedCount, setDeletedCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pauseRef = useRef(false);
  const stopRef = useRef(false);
  const scanAbortedRef = useRef(false);

  // Reset à l'ouverture
  const [customAlert, setCustomAlert] = useState<CustomAlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (
    title: string,
    message: string,
    buttons: CustomAlertButton[] = [{ text: 'OK', style: 'primary' }],
    type: 'info' | 'warning' | 'danger' | 'success' = 'info'
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons,
      type,
    });
  };

  const closeAlert = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

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
      setIsGhostModeEnabled(false);
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

  // Choisir Tous les Serveurs (Nettoyage Global en 1 seule fois)
  const handleSelectAllGuilds = () => {
    setSelectedGuild({
      id: 'all_guilds',
      name: 'Tous les Serveurs (Global)',
    });
    setChannels([]);
    setSelectedChannelIds(new Set());
    setStep('filter_options'); // Passer directement aux filtres !
  };

  // Filtrer les salons selon la recherche
  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return channels;
    const q = channelSearch.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, channelSearch]);

  // Savoir si tous les salons affichés sont cochés
  const isAllFilteredChannelsSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((c) => selectedChannelIds.has(c.id));

  // Savoir si certains salons affichés sont cochés (état partiel)
  const isSomeFilteredChannelsSelected =
    !isAllFilteredChannelsSelected &&
    filteredChannels.some((c) => selectedChannelIds.has(c.id));

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
    const next = new Set(selectedChannelIds);
    if (isAllFilteredChannelsSelected) {
      // Décocher les salons visibles
      filteredChannels.forEach((c) => next.delete(c.id));
    } else {
      // Cocher tous les salons visibles
      filteredChannels.forEach((c) => next.add(c.id));
    }
    setSelectedChannelIds(next);
  };

  // 3. Scanner les messages sur les salons sélectionnés ou tous les serveurs (Optimisé & Parallélisé)
  const handleStartScan = async () => {
    if (selectedGuild?.id !== 'all_guilds' && selectedChannelIds.size === 0) {
      showAlert(
        'Sélection requise',
        'Veuillez sélectionner au moins un salon avant de lancer la recherche.',
        [{ text: 'Compris', style: 'primary', icon: 'checkmark' }],
        'warning'
      );
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
      // CAS 1 : Nettoyage global sur TOUS les serveurs Discord
      if (selectedGuild?.id === 'all_guilds') {
        setLoadingText(`Scan global sur ${formatCount(guilds.length, 'serveur', 'serveurs')}...`);
        const BATCH_SIZE = 3;
        let processedGuilds = 0;
        const trimmedKeyword = filterKeyword.trim();
        // L'API Discord messages/search n'indexe pas les termes de moins de 3 caractères et ne supporte pas les sous-chaînes (substrings).
        // Si le mot-clé fait moins de 3 caractères (ex: "he"), on ne passe pas "content" à Discord pour éviter un résultat vide,
        // et on filtre directement en mémoire avec matchesFilters.
        const useDiscordContent = trimmedKeyword.length >= 3;

        for (let i = 0; i < guilds.length; i += BATCH_SIZE) {
          if (scanAbortedRef.current) break;
          const batch = guilds.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (g) => {
              try {
                let searchRes = await searchDiscordGuildMessages(token, g.id, {
                  authorId: userId,
                  content: useDiscordContent ? trimmedKeyword : undefined,
                  has: onlyWithAttachments ? 'file' : onlyWithLinks ? 'link' : undefined,
                });

                // Fallback si 0 résultat avec content (ex: mot partiel/préfixe comme "hel" pour "hello" que Discord Search n'attrape pas)
                if (
                  useDiscordContent &&
                  (!searchRes || !searchRes.messages || searchRes.messages.length === 0)
                ) {
                  const fallbackRes = await searchDiscordGuildMessages(token, g.id, {
                    authorId: userId,
                    has: onlyWithAttachments ? 'file' : onlyWithLinks ? 'link' : undefined,
                  });
                  if (fallbackRes && fallbackRes.messages && fallbackRes.messages.length > 0) {
                    searchRes = fallbackRes;
                  }
                }

                if (searchRes && Array.isArray(searchRes.messages)) {
                  for (const msg of searchRes.messages) {
                    if (matchesFilters(msg)) {
                      allFound.push({
                        ...msg,
                        channel_name: g.name,
                      });
                    }
                  }
                }
              } catch (e) {
                console.warn(`Erreur scan serveur ${g.name}:`, e);
              }
            })
          );

          processedGuilds += batch.length;
          setLoadingText(
            `Analyse : ${Math.min(processedGuilds, guilds.length)}/${guilds.length} ${plural(guilds.length, 'serveur', 'serveurs')} • ${formatCount(allFound.length, 'message trouvé', 'messages trouvés')}`
          );
        }
      } else {
        // CAS 2 : Serveur unique ou DMs
        let fastSearchSuccess = false;
        if (selectedGuild && selectedGuild.id !== 'dms') {
          try {
            const trimmedKeyword = filterKeyword.trim();
            const useDiscordContent = trimmedKeyword.length >= 3;

            let searchRes = await searchDiscordGuildMessages(token, selectedGuild.id, {
              authorId: userId,
              content: useDiscordContent ? trimmedKeyword : undefined,
              has: onlyWithAttachments ? 'file' : onlyWithLinks ? 'link' : undefined,
            });

            // Fallback si mot partiel ou sous-chaîne non trouvée par l'index Discord
            if (
              useDiscordContent &&
              (!searchRes || !searchRes.messages || searchRes.messages.length === 0)
            ) {
              const fallbackRes = await searchDiscordGuildMessages(token, selectedGuild.id, {
                authorId: userId,
                has: onlyWithAttachments ? 'file' : onlyWithLinks ? 'link' : undefined,
              });
              if (fallbackRes && fallbackRes.messages && fallbackRes.messages.length > 0) {
                searchRes = fallbackRes;
              }
            }

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
              `Analyse : ${Math.min(processedCount, channelList.length)}/${channelList.length} ${plural(channelList.length, 'salon', 'salons')} • ${formatCount(allFound.length, 'message trouvé', 'messages trouvés')}`
            );
          }
        }
      }

      setScannedMessages(allFound);
      setSelectedMessageIds(new Set(allFound.map((m) => m.id))); // Tous cochés par défaut

      if (allFound.length === 0) {
        showAlert(
          'Aucun message trouvé',
          'Aucun message ne correspond à vos critères de recherche.',
          [{ text: 'Modifier les filtres', style: 'primary', icon: 'options-outline' }],
          'info'
        );
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

  // FEAT-02 : Nombre de messages contenant des données personnelles sensibles (PII Shield)
  const piiMessagesCount = useMemo(() => {
    return scannedMessages.filter((m) => detectPII(m.content).hasPII).length;
  }, [scannedMessages]);

  // Filtrer les messages trouvés selon la recherche locale et le filtre PII Shield
  const filteredScannedMessages = useMemo(() => {
    let result = scannedMessages;

    // 1. Filtre PII Shield Données Sensibles
    if (filterPIIOnly) {
      result = result.filter((m) => detectPII(m.content).hasPII);
    }

    // 2. Filtre de recherche textuelle
    if (messageSearch.trim()) {
      const q = messageSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.content?.toLowerCase().includes(q) ||
          m.channel_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [scannedMessages, messageSearch, filterPIIOnly]);

  // Nombre de messages cochés PARMI ceux visibles dans le filtre de recherche
  const selectedFilteredCount = useMemo(() => {
    return filteredScannedMessages.filter((m) => selectedMessageIds.has(m.id)).length;
  }, [filteredScannedMessages, selectedMessageIds]);

  // Savoir si un filtre de recherche ou PII est actuellement actif
  const isMessageFilterActive = messageSearch.trim().length > 0 || filterPIIOnly;

  // Sélectionner UNIQUEMENT les messages filtrés (ajuste la sélection aux résultats du filtre)
  const selectOnlyFilteredMessages = () => {
    setSelectedMessageIds(new Set(filteredScannedMessages.map((m) => m.id)));
  };

  const isAllFilteredMessagesSelected =
    filteredScannedMessages.length > 0 &&
    filteredScannedMessages.every((m) => selectedMessageIds.has(m.id));

  const isSomeFilteredMessagesSelected =
    !isAllFilteredMessagesSelected &&
    filteredScannedMessages.some((m) => selectedMessageIds.has(m.id));

  const isAllMessagesSelected =
    scannedMessages.length > 0 && selectedMessageIds.size === scannedMessages.length;

  const toggleAllMessages = () => {
    const next = new Set(selectedMessageIds);
    if (isAllFilteredFilteredSelected()) {
      filteredScannedMessages.forEach((m) => next.delete(m.id));
    } else {
      filteredScannedMessages.forEach((m) => next.add(m.id));
    }
    setSelectedMessageIds(next);
  };

  const isAllFilteredFilteredSelected = () => {
    return (
      filteredScannedMessages.length > 0 &&
      filteredScannedMessages.every((m) => selectedMessageIds.has(m.id))
    );
  };

  // Ouvrir le dialogue de sauvegarde des messages sélectionnés
  const handleOpenBackupPrompt = () => {
    const messagesToBackup = scannedMessages.filter((m) => selectedMessageIds.has(m.id));
    if (messagesToBackup.length === 0) {
      showAlert(
        'Sélection requise',
        'Veuillez sélectionner au moins un message à sauvegarder.',
        [{ text: 'D’accord', style: 'primary', icon: 'checkmark' }],
        'warning'
      );
      return;
    }

    const targetName =
      selectedGuild?.id === 'all_guilds'
        ? `Tous les serveurs (${formatCount(guilds.length, 'serveur', 'serveurs')})`
        : selectedGuild?.id === 'dms'
          ? 'Messages Privés (DMs)'
          : `${selectedGuild?.name ?? 'Discord'} (${formatCount(selectedChannelIds.size, 'salon', 'salons')})`;

    showAlert(
      'Sauvegarder les messages',
      `Choisissez le format d'exportation pour vos ${formatCount(messagesToBackup.length, 'message', 'messages')} :`,
      [
        {
          text: 'Fichier Texte (.TXT)',
          style: 'primary',
          icon: 'document-text-outline',
          onPress: () => shareMessagesBackup(messagesToBackup, targetName, 'txt'),
        },
        {
          text: 'Données complètes (.JSON)',
          style: 'default',
          icon: 'code-slash-outline',
          onPress: () => shareMessagesBackup(messagesToBackup, targetName, 'json'),
        },
        { text: 'Annuler', style: 'cancel', icon: 'close-outline' },
      ],
      'info'
    );
  };

  // 4. Lancer la suppression
  const handleConfirmDeletion = () => {
    if (selectedMessageIds.size === 0) {
      showAlert(
        'Sélection requise',
        'Veuillez cocher au moins un message à supprimer.',
        [{ text: 'Compris', style: 'primary', icon: 'checkmark' }],
        'warning'
      );
      return;
    }

    const backupNotice = isBackupEnabled
      ? 'Une copie de sauvegarde sera enregistrée dans vos archives Cleanly.'
      : 'Attention : la sauvegarde de précaution est désactivée.';

    const ghostNotice = isGhostModeEnabled
      ? '\n\n👻 Mode Furtif actif : les messages seront anonymisés avant suppression définitive pour préserver votre vie privée vis-à-vis des outils de surveillance et de logs.'
      : '';

    showAlert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer définitivement ${formatCount(selectedMessageIds.size, 'message', 'messages')} ?\n\n${backupNotice}${ghostNotice}`,
      [
        { text: 'Annuler', style: 'cancel', icon: 'close-outline' },
        {
          text: `Supprimer`,
          style: 'destructive',
          icon: 'trash',
          onPress: executeDeletion,
        },
      ],
      'danger'
    );
  };

  const recordCleanHistory = async (deleted: number, total: number, isInterrupted: boolean) => {
    if (deleted === 0 && total === 0) return;
    try {
      const targetName =
        selectedGuild?.id === 'all_guilds'
          ? `Tous les serveurs (${guilds.length} serveurs)`
          : selectedGuild?.id === 'dms'
            ? 'Messages Privés (DMs)'
            : `${selectedGuild?.name ?? 'Discord'} (${selectedChannelIds.size} salon${selectedChannelIds.size > 1 ? 's' : ''})`;

      const dateOpt = DATE_FILTER_OPTIONS.find((o) => o.days === filterDays);
      const speedOpt = SPEED_OPTIONS.find((o) => o.ms === speedDelayMs);

      const messagesToDelete = scannedMessages.filter((m) => selectedMessageIds.has(m.id));

      const newRecord = await useHistoryStore.getState().addRecord({
        platform: 'discord',
        targetName,
        deletedCount: deleted,
        totalTargeted: total,
        status: isInterrupted ? 'interrupted' : 'completed',
        hasBackup: isBackupEnabled && messagesToDelete.length > 0,
        filters: {
          keyword: filterKeyword.trim() || undefined,
          dateFilterTitle: dateOpt?.title,
          onlyWithAttachments: onlyWithAttachments || undefined,
          onlyWithLinks: onlyWithLinks || undefined,
          ignorePinned,
          speedTitle: speedOpt?.title,
          ghostMode: isGhostModeEnabled || undefined,
        },
      });

      // Sauvegarde locale chiffrée si activée par la checkbox
      if (isBackupEnabled && newRecord && newRecord.id && messagesToDelete.length > 0) {
        await saveBackupLocally(newRecord.id, messagesToDelete);
      }
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

    // Démarre la notification persistante d'arrière-plan (Foreground Service Android & iOS)
    await cleanNotificationService.requestPermission();
    await cleanNotificationService.startCleanProgress({
      platform: 'discord',
      targetCount: messagesToDelete.length,
      initialCount: 0,
      isGhostMode: isGhostModeEnabled,
    });

    for (let i = 0; i < messagesToDelete.length; i++) {
      if (stopRef.current) break;

      // Attente si en pause
      while (pauseRef.current && !stopRef.current) {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));
      }

      const msg = messagesToDelete[i];
      setCurrentStatus(
        isGhostModeEnabled
          ? `[👻 Furtif] #${msg.channel_name ?? 'salon'} : anonymisation & suppression...`
          : `[#${msg.channel_name ?? 'salon'}] "${msg.content.slice(0, 30)}..."`
      );

      try {
        // FEAT-04 : Retirer mes réactions emoji posées
        if (isCleanReactionsEnabled && Array.isArray(msg.reactions)) {
          for (const r of msg.reactions) {
            if (r.me) {
              try {
                await deleteDiscordReaction(token, msg.channel_id, msg.id, r.emoji);
              } catch (e) {
                // Ignorer
              }
            }
          }
        }

        if (isGhostModeEnabled) {
          // Écrase le message avec '.' pour tromper les bots de logs avant suppression
          await editDiscordMessage(token, msg.channel_id, msg.id, '.');
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 60));
        }

        await deleteDiscordMessage(token, msg.channel_id, msg.id, speedDelayMs);
        count++;
        setDeletedCount(count);

        // Mise à jour de la notification native d'arrière-plan
        cleanNotificationService.updateCleanProgress({
          platform: 'discord',
          currentCount: count,
          targetCount: messagesToDelete.length,
          isPaused: false,
        });
      } catch (err) {
        console.warn('Erreur suppression message:', err);
      }
    }

    if (!stopRef.current) {
      setDeletedCount(messagesToDelete.length);
      setCurrentStatus('✅ Nettoyage terminé avec succès !');

      // FEAT-03 : Fermeture automatique des DMs nettoyés si l'option est activée
      if (autoCloseDMs && selectedGuild?.id === '@me') {
        setCurrentStatus('🔒 Masquage et fermeture des DMs nettoyés...');
        const cleanedChannelIds = Array.from(selectedChannelIds);
        for (const chId of cleanedChannelIds) {
          try {
            await closeDiscordDMChannel(token, chId);
          } catch (e) {
            console.warn('Erreur fermeture DM:', e);
          }
        }
      }

      // Notification finale de succès avec vibration / son
      await cleanNotificationService.notifyCleanComplete({
        platform: 'discord',
        deletedCount: count,
      });

      // Laisser l'utilisateur admirer la barre pleine à 100% et le compteur complet pendant exactement 1 seconde
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } else {
      setCurrentStatus(`Arrêt demandé : ${formatCount(count, 'message supprimé', 'messages supprimés')}.`);

      // Notification d'interruption
      await cleanNotificationService.notifyCleanStopped({
        platform: 'discord',
        deletedCount: count,
      });

      await new Promise<void>((resolve) => setTimeout(() => resolve(), 800));
    }

    await recordCleanHistory(count, messagesToDelete.length, stopRef.current);
    setStep('complete');
    onFinished?.(count);
  };

  const handleFinishAndClose = () => {
    setStep('select_guild');
    setSelectedChannelIds(new Set());
    setScannedMessages([]);
    setSelectedMessageIds(new Set());
    setDeletedCount(0);
    onClose();
  };

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    pauseRef.current = next;

    const total = scannedMessages.filter((m) => selectedMessageIds.has(m.id)).length;
    cleanNotificationService.updateCleanProgress({
      platform: 'discord',
      currentCount: deletedCount,
      targetCount: total,
      isPaused: next,
    });
  };

  const stopDeletion = () => {
    showAlert(
      'Interrompre le nettoyage ?',
      'Voulez-vous vraiment stopper la suppression en cours ? Les messages déjà supprimés ne peuvent pas être restaurés.',
      [
        {
          text: 'Continuer',
          style: 'cancel',
          icon: 'play-outline',
        },
        {
          text: 'Arrêter',
          style: 'destructive',
          icon: 'stop-circle-outline',
          onPress: () => {
            stopRef.current = true;
            // Arrête immédiatement le service d'arrière-plan et retire la notification de progression
            cleanNotificationService.notifyCleanStopped({
              platform: 'discord',
              deletedCount,
            });
          },
        },
      ],
      'warning'
    );
  };

  // Gestion du retour physique Android (Hardware Back Button) et bouton retour header
  const handleBackAction = () => {
    // 0. Si une alerte personnalisée est ouverte, la refermer en priorité
    if (customAlert.visible) {
      closeAlert();
      return true;
    }

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
      showAlert(
        'Suppression en cours',
        'Une opération de nettoyage est active. Voulez-vous vraiment stopper le nettoyage et quitter ?',
        [
          { text: 'Poursuivre la suppression', style: 'cancel', icon: 'play-outline' },
          {
            text: 'Stopper et quitter',
            style: 'destructive',
            icon: 'exit-outline',
            onPress: () => {
              stopRef.current = true;
              onClose();
            },
          },
        ],
        'danger'
      );
      return true;
    }

    // 3. Navigation progressive étape par étape
    if (step === 'preview_messages') {
      setStep('filter_options');
      return true;
    }

    if (step === 'filter_options') {
      if (selectedGuild?.id === 'all_guilds') {
        setStep('select_guild');
      } else {
        setStep('select_channels');
      }
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

  // Sous-titre du header dynamique avec alignement du serveur et salon(s) sélectionné(s)
  const headerSubtitle = useMemo(() => {
    if (!selectedGuild) return null;
    if (selectedGuild.id === 'all_guilds') {
      return `Scan Global • ${guilds.length} serveurs`;
    }
    if (selectedGuild.id === 'dms') {
      if (selectedChannelIds.size === 1) {
        const id = Array.from(selectedChannelIds)[0];
        const dm = channels.find((c) => c.id === id);
        return dm ? `DMs • ${dm.name}` : 'Messages Privés (DMs)';
      }
      if (selectedChannelIds.size > 1) {
        return `DMs • ${selectedChannelIds.size} conversations`;
      }
      return 'Messages Privés (DMs)';
    }

    if (selectedChannelIds.size === 1) {
      const id = Array.from(selectedChannelIds)[0];
      const ch = channels.find((c) => c.id === id);
      return `${selectedGuild.name} • #${ch?.name ?? 'salon'}`;
    }
    if (selectedChannelIds.size > 1) {
      return `${selectedGuild.name} • ${selectedChannelIds.size} salons`;
    }
    return selectedGuild.name;
  }, [selectedGuild, selectedChannelIds, channels, guilds]);

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
            <Text style={styles.headerTitle} numberOfLines={1}>
              Nettoyage Discord
            </Text>
            {headerSubtitle && (
              <View style={styles.headerGuildRow}>
                {selectedGuild?.id === 'all_guilds' ? (
                  <Ionicons name="globe-outline" size={13} color="#8B5CF6" style={{ marginRight: 4 }} />
                ) : getGuildIconUrl(selectedGuild?.id, selectedGuild?.icon) ? (
                  <Image
                    source={{ uri: getGuildIconUrl(selectedGuild?.id, selectedGuild?.icon)! }}
                    style={styles.headerGuildIcon}
                  />
                ) : (
                  <Ionicons
                    name={selectedGuild?.id === 'dms' ? 'chatbubbles' : 'server-outline'}
                    size={13}
                    color="#5865F2"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={styles.headerSub} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRightPlaceholder} />
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
                  Choisissez un serveur, vos messages privés ou un scan global.
                </Text>

                {/* Option 1 : TOUS LES SERVEURS (Scan Global en 1 clic) */}
                <TouchableOpacity
                  style={[styles.itemCard, styles.globalCard]}
                  onPress={handleSelectAllGuilds}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarBox, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="globe-outline" size={22} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.itemTitle, { color: '#8B5CF6', fontWeight: '800' }]}>
                        Tous les Serveurs (Global)
                      </Text>
                      <View style={styles.fastPill}>
                        <Text style={styles.fastPillText}>RAPIDE</Text>
                      </View>
                    </View>
                    <Text style={styles.itemSub}>
                      Rechercher et nettoyer sur l’ensemble de vos {guilds.length} serveurs en une seule fois
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
                </TouchableOpacity>

                {/* Option 2 : Messages Privés (DMs) */}
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
            {/* ================= ÉTAPE 2 : SÉLECTION DES SALONS (FILTRE EN HAUT / RÉSULTATS EN BAS) ================= */}
            {step === 'select_channels' && (
              <View style={{ flex: 1 }}>
                {/* 1. ZONE FIXE EN HAUT : EN-TÊTE SERVEUR + ZONE DE RECHERCHE (FILTRE) + CHECKBOX TABLEAU */}
                <View style={styles.channelsTopFilterContainer}>
                  {/* Carte Récapitulative du Serveur avec Logo */}
                  {selectedGuild && (
                    <View style={styles.serverCardHeaderCompact}>
                      {getGuildIconUrl(selectedGuild.id, selectedGuild.icon) ? (
                        <Image
                          source={{ uri: getGuildIconUrl(selectedGuild.id, selectedGuild.icon)! }}
                          style={styles.serverCardImgSmall}
                        />
                      ) : (
                        <View style={[styles.avatarBoxSmall, { backgroundColor: '#5865F2' }]}>
                          {selectedGuild.id === 'dms' ? (
                            <Ionicons name="chatbubbles" size={16} color="#FFF" />
                          ) : (
                            <Text style={styles.guildInitialsSmall}>
                              {selectedGuild.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.serverCardTitle} numberOfLines={1}>
                          {selectedGuild.name}
                        </Text>
                        <Text style={styles.serverCardSub}>
                          {channels.length} salon{channels.length > 1 ? 's' : ''} disponible{channels.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Zone de Recherche = LE FILTRE EN HAUT */}
                  <View style={styles.filterSearchBarBox}>
                    <Ionicons name="search" size={17} color={theme.text.muted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.filterSearchInput}
                      placeholder="Filtrer les salons par nom..."
                      placeholderTextColor={theme.text.muted}
                      value={channelSearch}
                      onChangeText={setChannelSearch}
                    />
                    {channelSearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setChannelSearch('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color={theme.text.muted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Barre d'en-tête du tableau : Checkbox Tout Cocher + Compteur résultats */}
                  <View style={styles.tableHeaderRow}>
                    <TouchableOpacity
                      style={styles.tableSelectAllBtn}
                      onPress={toggleAllChannels}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          isAllFilteredChannelsSelected
                            ? 'checkbox'
                            : isSomeFilteredChannelsSelected
                              ? 'remove-circle'
                              : 'square-outline'
                        }
                        size={22}
                        color={
                          isAllFilteredChannelsSelected || isSomeFilteredChannelsSelected
                            ? '#5865F2'
                            : theme.text.muted
                        }
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.tableSelectAllText,
                          (isAllFilteredChannelsSelected || isSomeFilteredChannelsSelected) && styles.tableSelectAllTextActive,
                        ]}
                      >
                        {isAllFilteredChannelsSelected
                          ? 'Tous les salons cochés'
                          : isSomeFilteredChannelsSelected
                            ? 'Sélection partielle'
                            : 'Tout cocher'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.tableStatsBadge}>
                      <Text style={styles.tableStatsBadgeText}>
                        {selectedChannelIds.size} / {channels.length} sélectionné{selectedChannelIds.size > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2. ZONE BASSE SCROLLABLE : LES RÉSULTATS DU TABLEAU */}
                <ScrollView style={styles.channelsResultScroll} showsVerticalScrollIndicator={false}>
                  {filteredChannels.length === 0 ? (
                    <View style={styles.emptyTableBox}>
                      <Ionicons name="filter-outline" size={36} color={theme.text.muted} />
                      <Text style={styles.emptyTableTitle}>Aucun salon trouvé</Text>
                      <Text style={styles.emptyTableSub}>
                        Aucun salon ne correspond à votre filtre « {channelSearch} »
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tableContainer}>
                      {filteredChannels.map((c, index) => {
                        const isChecked = selectedChannelIds.has(c.id);
                        const isLast = index === filteredChannels.length - 1;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.tableRow,
                              isChecked && styles.tableRowSelected,
                              !isLast && styles.tableRowBorder,
                            ]}
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
                              <Text
                                style={[
                                  styles.tableRowText,
                                  isChecked && styles.tableRowTextSelected,
                                ]}
                                numberOfLines={1}
                              >
                                #{c.name}
                              </Text>
                            </View>
                            {isChecked && (
                              <Ionicons name="checkmark-sharp" size={16} color="#5865F2" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={{ height: 90 }} />
                </ScrollView>

                {/* 3. FOOTER FIXE : BOUTON CONTINUER */}
                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, selectedChannelIds.size === 0 && { opacity: 0.5 }]}
                    onPress={() => setStep('filter_options')}
                    disabled={selectedChannelIds.size === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>
                      Continuer avec {selectedChannelIds.size} salon{selectedChannelIds.size > 1 ? 's' : ''} →
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

                  {/* 1. Mot-clé / Recherche de texte */}
                  <View style={styles.filterCard}>
                    <View style={styles.filterHeaderRow}>
                      <Ionicons name="search-outline" size={18} color="#5865F2" style={{ marginRight: 8 }} />
                      <Text style={styles.filterLabel}>Filtrer par mot-clé ou texte</Text>
                    </View>
                    <Text style={styles.filterSubDesc}>
                      Seuls les messages contenant ce texte seront ciblés (laisser vide pour tout cibler).
                    </Text>

                    <View style={[styles.filterSearchBarBox, { marginTop: 8, marginBottom: 0 }]}>
                      <Ionicons name="search" size={17} color={theme.text.muted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.filterSearchInput}
                        placeholder="Ex : mot de passe, secret, lien, discord.gg..."
                        placeholderTextColor={theme.text.muted}
                        value={filterKeyword}
                        onChangeText={setFilterKeyword}
                      />
                      {filterKeyword.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setFilterKeyword('')}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={18} color={theme.text.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
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

                  <View style={{ height: 40 }} />
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
                {/* 1. ZONE FIXE EN HAUT : RÉCAPITULATIF + FILTRE DE RECHERCHE + CHECKBOX TOUT COCHER */}
                <View style={styles.previewTopFilterContainer}>
                  {/* En-tête : Titre & Compteur global synchronisés avec le filtre */}
                  <View style={styles.previewHeaderCompact}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.previewTitle}>
                        {isMessageFilterActive
                          ? `🎯 ${formatCount(filteredScannedMessages.length, 'message filtré', 'messages filtrés')}`
                          : `🎯 ${formatCount(scannedMessages.length, 'message trouvé', 'messages trouvés')}`}
                      </Text>
                      <Text style={styles.previewSub}>
                        {isMessageFilterActive
                          ? `${formatCount(selectedFilteredCount, 'sélectionné', 'sélectionnés')} dans le filtre • ${selectedMessageIds.size} au total`
                          : `${formatCount(selectedMessageIds.size, 'sélectionné', 'sélectionnés')} • ~${estimatedSeconds}s de suppression`}
                      </Text>
                    </View>
                    <View style={[styles.tableStatsBadge, isMessageFilterActive && styles.tableStatsBadgeFiltered]}>
                      <Text style={[styles.tableStatsBadgeText, isMessageFilterActive && styles.tableStatsBadgeTextFiltered]}>
                        {isMessageFilterActive
                          ? `${selectedFilteredCount} / ${filteredScannedMessages.length}`
                          : `${selectedMessageIds.size} / ${scannedMessages.length}`}
                      </Text>
                    </View>
                  </View>

                  {/* Zone de Recherche = LE FILTRE EN HAUT */}
                  <View style={[styles.filterSearchBarBox, { marginTop: 4, marginBottom: 6 }]}>
                    <Ionicons name="search" size={17} color={theme.text.muted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.filterSearchInput}
                      placeholder="Filtrer dans les messages trouvés..."
                      placeholderTextColor={theme.text.muted}
                      value={messageSearch}
                      onChangeText={setMessageSearch}
                    />
                    {messageSearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setMessageSearch('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color={theme.text.muted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Ligne des filtres intelligents : PII Shield (FEAT-02) */}
                  <View style={styles.quickFiltersRow}>
                    <TouchableOpacity
                      style={[
                        styles.quickFilterChip,
                        filterPIIOnly && styles.quickFilterChipActivePII,
                        piiMessagesCount > 0 && !filterPIIOnly && styles.quickFilterChipHasPII,
                      ]}
                      onPress={() => setFilterPIIOnly(!filterPIIOnly)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={filterPIIOnly ? 'shield-checkmark' : 'shield-outline'}
                        size={13}
                        color={filterPIIOnly ? '#DC2626' : (piiMessagesCount > 0 ? '#D97706' : theme.text.secondary)}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.quickFilterChipText,
                          filterPIIOnly && styles.quickFilterChipTextActivePII,
                          piiMessagesCount > 0 && !filterPIIOnly && { color: '#B45309', fontWeight: '700' },
                        ]}
                      >
                        🛡️ Données sensibles
                      </Text>
                      {piiMessagesCount > 0 && (
                        <View
                          style={[
                            styles.quickFilterCountBadge,
                            filterPIIOnly ? styles.quickFilterCountBadgeActivePII : styles.quickFilterCountBadgeWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickFilterCountText,
                              filterPIIOnly ? styles.quickFilterCountTextActivePII : styles.quickFilterCountTextWarning,
                            ]}
                          >
                            {piiMessagesCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Barre d'en-tête du tableau : Checkbox Tout Cocher sous le filtre */}
                  <View style={styles.tableHeaderRow}>
                    <TouchableOpacity
                      style={styles.tableSelectAllBtn}
                      onPress={toggleAllMessages}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          isAllFilteredMessagesSelected
                            ? 'checkbox'
                            : isSomeFilteredMessagesSelected
                              ? 'remove-circle'
                              : 'square-outline'
                        }
                        size={21}
                        color={
                          isAllFilteredMessagesSelected || isSomeFilteredMessagesSelected
                            ? theme.accent.red
                            : theme.text.muted
                        }
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.tableSelectAllText,
                          (isAllFilteredMessagesSelected || isSomeFilteredMessagesSelected) && {
                            color: theme.accent.red,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {isAllFilteredMessagesSelected
                          ? isMessageFilterActive
                            ? `Tous les ${filteredScannedMessages.length} filtrés cochés`
                            : 'Tous les messages cochés'
                          : isSomeFilteredMessagesSelected
                            ? `Sélection partielle (${selectedFilteredCount}/${filteredScannedMessages.length})`
                            : isMessageFilterActive
                              ? `Cocher les ${filteredScannedMessages.length} filtrés`
                              : 'Tout cocher'}
                      </Text>
                    </TouchableOpacity>

                    {/* Action rapide : isoler la sélection aux seuls messages filtrés si applicable */}
                    {isMessageFilterActive && selectedMessageIds.size > selectedFilteredCount ? (
                      <TouchableOpacity
                        onPress={selectOnlyFilteredMessages}
                        style={styles.isolateFilterBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="funnel" size={11} color="#5865F2" style={{ marginRight: 4 }} />
                        <Text style={styles.isolateFilterBtnText}>
                          Garder uniquement ces {filteredScannedMessages.length}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.previewShowingCountText}>
                        {formatCount(filteredScannedMessages.length, 'affiché', 'affichés')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* 2. ZONE BASSE SCROLLABLE : LES RÉSULTATS DU TABLEAU */}
                <ScrollView style={styles.messagesResultScroll} showsVerticalScrollIndicator={false}>
                  {filteredScannedMessages.length === 0 ? (
                    <View style={styles.emptyTableBox}>
                      <Ionicons name="filter-outline" size={36} color={theme.text.muted} />
                      <Text style={styles.emptyTableTitle}>Aucun message trouvé</Text>
                      <Text style={styles.emptyTableSub}>
                        Aucun message ne correspond à votre filtre « {messageSearch} »
                      </Text>
                    </View>
                  ) : (
                    filteredScannedMessages.map((msg) => {
                      const isChecked = selectedMessageIds.has(msg.id);
                      const piiResult = detectPII(msg.content);
                      const dateFormatted = new Date(msg.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <TouchableOpacity
                          key={msg.id}
                          style={[
                            styles.messageCard,
                            isChecked && styles.messageCardSelected,
                            !isChecked && piiResult.hasPII && styles.messageCardPIIHighlight,
                          ]}
                          onPress={() => toggleMessage(msg.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isChecked ? theme.accent.red : (piiResult.hasPII ? '#DC2626' : theme.text.muted)}
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

                            {/* Badges PII Shield Données Sensibles (FEAT-02) */}
                            {piiResult.hasPII && (
                              <View style={styles.piiBadgesRow}>
                                {piiResult.badges.map((b, idx) => (
                                  <View key={idx} style={styles.piiTag}>
                                    <Ionicons name="shield-alert" size={10} color="#DC2626" style={{ marginRight: 3 }} />
                                    <Text style={styles.piiTagText}>{b}</Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {/* Badges médias */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <View style={styles.mediaBadge}>
                                <Ionicons name="image" size={12} color="#5865F2" style={{ marginRight: 4 }} />
                                <Text style={styles.mediaBadgeText}>{formatCount(msg.attachments.length, 'fichier', 'fichiers')}</Text>
                              </View>
                            )}

                            {/* Badges Réactions Emojis (FEAT-04) */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <View style={styles.reactionsRow}>
                                {msg.reactions.map((r, rIdx) => (
                                  <View
                                    key={rIdx}
                                    style={[styles.reactionBadge, r.me && styles.reactionBadgeMe]}
                                  >
                                    <Text style={styles.reactionEmojiText}>{r.emoji.name}</Text>
                                    <Text style={[styles.reactionCountText, r.me && styles.reactionCountTextMe]}>
                                      {r.count}
                                    </Text>
                                    {r.me && (
                                      <Text style={styles.reactionMeIndicator}>✓</Text>
                                    )}
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                  <View style={{ height: 80 }} />
                </ScrollView>

                {/* Footer suppression : Options de sécurité & Méthode de suppression ultra-compacte */}
                <View style={styles.previewBottomBar}>
                  <View style={styles.cleanOptionsContainer}>
                    {/* Ligne 1 : Les 2 options de sécurité côte-à-côte avec vrais boutons et switches tactiles */}
                    <View style={styles.securityTogglesRow}>
                      {/* Option Sauvegarde (Backup) */}
                      <TouchableOpacity
                        style={[
                          styles.securityToggleCard,
                          isBackupEnabled && styles.securityToggleCardBackupActive,
                        ]}
                        onPress={() => setIsBackupEnabled(!isBackupEnabled)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.securityToggleLeft}>
                          <Ionicons
                            name={isBackupEnabled ? 'shield-checkmark' : 'shield-outline'}
                            size={16}
                            color={isBackupEnabled ? '#10B981' : theme.text.muted}
                            style={{ marginRight: 6 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.securityToggleTitle,
                                isBackupEnabled && { color: '#10B981', fontWeight: '700' },
                              ]}
                              numberOfLines={1}
                            >
                              Sauvegarde
                            </Text>
                            <Text style={styles.securityToggleSub} numberOfLines={1}>
                              {isBackupEnabled ? 'Archive locale ✓' : 'Sans archive'}
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={isBackupEnabled}
                          onValueChange={setIsBackupEnabled}
                          trackColor={{ true: '#10B981', false: theme.bg.raised }}
                          thumbColor={isBackupEnabled ? '#FFF' : '#A0AEC0'}
                          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        />
                      </TouchableOpacity>

                      {/* Option Mode Furtif */}
                      <TouchableOpacity
                        style={[
                          styles.securityToggleCard,
                          isGhostModeEnabled && styles.securityToggleCardGhostActive,
                        ]}
                        onPress={() => setIsGhostModeEnabled(!isGhostModeEnabled)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.securityToggleLeft}>
                          <Ionicons
                            name={isGhostModeEnabled ? 'eye-off' : 'eye-off-outline'}
                            size={16}
                            color={isGhostModeEnabled ? '#8B5CF6' : theme.text.muted}
                            style={{ marginRight: 6 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.securityToggleTitle,
                                isGhostModeEnabled && { color: '#8B5CF6', fontWeight: '700' },
                              ]}
                              numberOfLines={1}
                            >
                              Mode Furtif
                            </Text>
                            <Text style={styles.securityToggleSub} numberOfLines={1}>
                              {isGhostModeEnabled ? 'Anti-logs actif ✓' : 'Désactivé'}
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={isGhostModeEnabled}
                          onValueChange={setIsGhostModeEnabled}
                          trackColor={{ true: '#8B5CF6', false: theme.bg.raised }}
                          thumbColor={isGhostModeEnabled ? '#FFF' : '#A0AEC0'}
                          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* FEAT-03 : Option spécifique aux Messages Privés (DMs) */}
                    {selectedGuild?.id === '@me' && (
                      <TouchableOpacity
                        style={[
                          styles.speedCompactBar,
                          { marginTop: 6 },
                          autoCloseDMs && { borderColor: '#5865F260', backgroundColor: '#5865F20A' },
                        ]}
                        onPress={() => setAutoCloseDMs(!autoCloseDMs)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.speedCompactLeft}>
                          <Ionicons
                            name={autoCloseDMs ? 'close-circle' : 'close-circle-outline'}
                            size={14}
                            color={autoCloseDMs ? '#5865F2' : theme.text.secondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.speedCompactLabel}>Fermer les DMs :</Text>
                          <Text style={[styles.speedCompactValue, autoCloseDMs && { color: '#5865F2' }]}>
                            {autoCloseDMs ? 'Masquer le fil ✓' : 'Laisser ouvert'}
                          </Text>
                        </View>
                        <Switch
                          value={autoCloseDMs}
                          onValueChange={setAutoCloseDMs}
                          trackColor={{ true: '#5865F2', false: theme.bg.raised }}
                          thumbColor={autoCloseDMs ? '#FFF' : '#A0AEC0'}
                          style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                        />
                      </TouchableOpacity>
                    )}

                    {/* Ligne 2 : Sélecteur de méthode de suppression compact (1 seule ligne) */}
                    <TouchableOpacity
                      style={[styles.speedCompactBar, isSpeedDropdownOpen && styles.speedCompactBarActive]}
                      onPress={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.speedCompactLeft}>
                        <Ionicons
                          name={speedDelayMs === 1000 ? 'shield-checkmark' : 'speedometer-outline'}
                          size={14}
                          color={speedDelayMs === 1000 ? '#10B981' : '#5865F2'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.speedCompactLabel}>Vitesse :</Text>
                        <Text
                          style={[
                            styles.speedCompactValue,
                            speedDelayMs === 1000 && { color: '#10B981', fontWeight: '700' },
                          ]}
                        >
                          {(SPEED_OPTIONS.find((o) => o.ms === speedDelayMs) ?? SPEED_OPTIONS[0]).title}
                        </Text>
                      </View>

                      <View style={styles.speedCompactRight}>
                        <Text style={styles.speedCompactEstimate}>~{estimatedSeconds}s estimées</Text>
                        <Ionicons
                          name={isSpeedDropdownOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={theme.text.secondary}
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Menu déroulant de vitesse si ouvert */}
                    {isSpeedDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        {SPEED_OPTIONS.map((opt, idx) => {
                          const isSelected = speedDelayMs === opt.ms;
                          const isAntiBanOpt = opt.ms === 1000;
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
                              <View
                                style={[
                                  styles.summaryIconMini,
                                  {
                                    backgroundColor: isAntiBanOpt ? '#10B98115' : '#5865F215',
                                    marginRight: 10,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={isAntiBanOpt ? 'shield-checkmark' : 'speedometer-outline'}
                                  size={14}
                                  color={isAntiBanOpt ? '#10B981' : '#5865F2'}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text
                                    style={[
                                      styles.dropdownItemTitle,
                                      isSelected && styles.dropdownItemTitleSelected,
                                      isAntiBanOpt && { color: '#10B981' },
                                    ]}
                                  >
                                    {opt.title}
                                  </Text>
                                </View>
                                <Text style={styles.dropdownItemDesc}>{opt.desc}</Text>
                              </View>
                              {isSelected && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={isAntiBanOpt ? '#10B981' : '#5865F2'}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Bandeau de synchronisation si un filtre est actif avec des messages hors filtre */}
                  {isMessageFilterActive && selectedMessageIds.size > selectedFilteredCount && (
                    <View style={styles.filterSyncWarningBar}>
                      <Ionicons name="information-circle" size={15} color="#D97706" style={{ marginRight: 6 }} />
                      <Text style={styles.filterSyncWarningText} numberOfLines={1}>
                        {formatCount(selectedFilteredCount, 'sélectionné visible', 'sélectionnés visibles')} •{' '}
                        {selectedMessageIds.size - selectedFilteredCount > 1
                          ? `${selectedMessageIds.size - selectedFilteredCount} autres hors filtre`
                          : '1 autre hors filtre'}
                      </Text>
                      <TouchableOpacity
                        onPress={selectOnlyFilteredMessages}
                        style={styles.filterSyncWarningBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.filterSyncWarningBtnText}>Garder ces {selectedFilteredCount}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Bouton d'action final */}
                  <TouchableOpacity
                    style={[styles.deleteBtn, selectedMessageIds.size === 0 && { opacity: 0.5 }]}
                    onPress={handleConfirmDeletion}
                    disabled={selectedMessageIds.size === 0}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteBtnText}>
                      {isMessageFilterActive && selectedMessageIds.size === selectedFilteredCount
                        ? selectedFilteredCount > 1
                          ? `Supprimer les ${selectedFilteredCount} messages filtrés`
                          : 'Supprimer le message filtré'
                        : isMessageFilterActive
                          ? `Supprimer ${selectedMessageIds.size} messages (${selectedFilteredCount} filtrés)`
                          : `Supprimer ${formatCount(selectedMessageIds.size, 'message', 'messages')}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= ÉTAPE 5 : SUPPRESSION EN COURS ================= */}
            {step === 'deleting' && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.deletingScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Cercle d'animation moderne & indicateur de statut */}
                <View style={styles.deletingIconWrapper}>
                  <View
                    style={[
                      styles.deletingIconOuter,
                      percent === 100 && styles.deletingIconOuterSuccess,
                      isPaused && styles.deletingIconOuterPaused,
                    ]}
                  >
                    <View
                      style={[
                        styles.deletingIconInner,
                        percent === 100 && styles.deletingIconInnerSuccess,
                        isPaused && styles.deletingIconInnerPaused,
                      ]}
                    >
                      <Ionicons
                        name={
                          percent === 100
                            ? 'checkmark-done'
                            : isPaused
                              ? 'pause'
                              : 'trash-outline'
                        }
                        size={32}
                        color={
                          percent === 100
                            ? '#10B981'
                            : isPaused
                              ? '#F59E0B'
                              : '#5865F2'
                        }
                      />
                    </View>
                  </View>
                </View>

                {/* 2. Titre et sous-titre de l'opération */}
                <Text style={styles.deletingMainTitle}>
                  {percent === 100
                    ? 'Nettoyage terminé !'
                    : isPaused
                      ? 'Nettoyage en pause'
                      : 'Suppression en cours'}
                </Text>
                <Text style={styles.deletingTargetSub} numberOfLines={1}>
                  {headerSubtitle || 'Nettoyage de vos messages'}
                </Text>

                {/* 3. Dashboard des métriques clés (3 cartes) */}
                <View style={styles.metricsDashboardRow}>
                  {/* Carte Progression */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricCardHeader}>
                      <Ionicons name="pie-chart-outline" size={13} color="#5865F2" />
                      <Text style={styles.metricCardLabel}>Progression</Text>
                    </View>
                    <Text style={[styles.metricCardValue, percent === 100 && { color: '#10B981' }]}>
                      {percent}%
                    </Text>
                  </View>

                  {/* Carte Traités */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricCardHeader}>
                      <Ionicons name="trash-outline" size={13} color={theme.accent.red} />
                      <Text style={styles.metricCardLabel}>Supprimés</Text>
                    </View>
                    <Text style={styles.metricCardValue}>
                      {deletedCount} <Text style={styles.metricCardValueTotal}>/ {targetCount}</Text>
                    </Text>
                  </View>

                  {/* Carte Temps estimé */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricCardHeader}>
                      <Ionicons name="time-outline" size={13} color="#F59E0B" />
                      <Text style={styles.metricCardLabel}>Restant</Text>
                    </View>
                    <Text style={[styles.metricCardValue, { color: '#F59E0B' }]}>
                      {percent === 100 ? '0s' : `~${estimatedSeconds}s`}
                    </Text>
                  </View>
                </View>

                {/* 4. Barre de progression moderne */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrackModern}>
                    <View
                      style={[
                        styles.progressBarModern,
                        {
                          width: `${percent}%`,
                          backgroundColor: percent === 100 ? '#10B981' : '#5865F2',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabelsRow}>
                    <Text style={styles.progressPercentSub}>
                      {formatCount(deletedCount, 'message supprimé', 'messages supprimés')}
                    </Text>
                    <Text style={styles.progressPercentSub}>
                      {targetCount - deletedCount > 0
                        ? `${targetCount - deletedCount} restant${targetCount - deletedCount > 1 ? 's' : ''}`
                        : 'Complet'}
                    </Text>
                  </View>
                </View>

                {/* 5. Badges des options actives */}
                <View style={styles.liveSecurityTagsRow}>
                  {speedDelayMs === 1000 ? (
                    <View style={styles.liveSecurityTag}>
                      <Ionicons name="shield-checkmark" size={11} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.liveSecurityTagText}>Protection Anti-ban (1s)</Text>
                    </View>
                  ) : (
                    <View style={[styles.liveSecurityTag, { backgroundColor: '#5865F212', borderColor: '#5865F230' }]}>
                      <Ionicons name="speedometer-outline" size={11} color="#5865F2" style={{ marginRight: 4 }} />
                      <Text style={[styles.liveSecurityTagText, { color: '#5865F2' }]}>Vitesse rapide ({speedDelayMs}ms)</Text>
                    </View>
                  )}
                  {isGhostModeEnabled && (
                    <View style={[styles.liveSecurityTag, { backgroundColor: '#8B5CF612', borderColor: '#8B5CF630' }]}>
                      <Ionicons name="eye-off" size={11} color="#8B5CF6" style={{ marginRight: 4 }} />
                      <Text style={[styles.liveSecurityTagText, { color: '#8B5CF6' }]}>Mode Furtif</Text>
                    </View>
                  )}
                  {isBackupEnabled && (
                    <View style={[styles.liveSecurityTag, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
                      <Ionicons name="save-outline" size={11} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={[styles.liveSecurityTagText, { color: '#10B981' }]}>Sauvegarde</Text>
                    </View>
                  )}
                </View>

                {/* 6. Contrôles Pause / Arrêter */}
                {percent < 100 && (
                  <View style={styles.deletingActionButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.deletingActionBtn,
                        isPaused && styles.deletingActionBtnResume,
                      ]}
                      onPress={togglePause}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPaused ? 'play' : 'pause'}
                        size={17}
                        color={isPaused ? '#10B981' : theme.text.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.deletingActionBtnText,
                          isPaused && { color: '#10B981' },
                        ]}
                      >
                        {isPaused ? 'Reprendre' : 'Pause'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.deletingActionBtn, styles.deletingActionBtnStop]}
                      onPress={stopDeletion}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="stop" size={17} color={theme.accent.red} style={{ marginRight: 6 }} />
                      <Text style={[styles.deletingActionBtnText, { color: theme.accent.red }]}>
                        Arrêter
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            {/* ================= ÉTAPE 6 : TERMINÉ (ERGONOMIE MODERNE & BOUTON FIXE) ================= */}
            {step === 'complete' && (
              <View style={{ flex: 1 }}>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.completeScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Icône de succès avec double halo */}
                  <View style={styles.completeIconWrapper}>
                    <View style={styles.completeIconOuter}>
                      <View style={styles.completeIconInner}>
                        <Ionicons name="checkmark-sharp" size={38} color="#FFF" />
                      </View>
                    </View>
                  </View>

                  {/* Titre & sous-titre */}
                  <Text style={styles.completeTitle}>Nettoyage réussi !</Text>
                  <Text style={styles.completeSubtitle}>
                    Les messages ciblés ont été définitivement purgés avec succès de votre compte Discord.
                  </Text>

                  {/* Grande carte statistique percutante */}
                  <View style={styles.completeStatCard}>
                    <Text style={styles.completeStatNumber}>-{deletedCount}</Text>
                    <Text style={styles.completeStatLabel}>
                      message{deletedCount > 1 ? 's' : ''} effacé{deletedCount > 1 ? 's' : ''} au total
                    </Text>
                  </View>

                  {/* Récapitulatif de la session */}
                  <View style={styles.completeSummaryCard}>
                    <Text style={styles.summaryCardHeaderTitle}>RÉCAPITULATIF DE LA SESSION</Text>

                    {/* Cible */}
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <View style={[styles.summaryIconMini, { backgroundColor: '#5865F215' }]}>
                          <Ionicons name="server" size={13} color="#5865F2" />
                        </View>
                        <Text style={styles.summaryRowLabel}>Cible</Text>
                      </View>
                      <Text style={styles.summaryRowValue} numberOfLines={1}>
                        {selectedGuild?.id === 'all_guilds'
                          ? 'Tous les serveurs'
                          : selectedGuild?.id === 'dms'
                            ? 'Messages Privés (DMs)'
                            : selectedGuild?.name ?? 'Discord'}
                      </Text>
                    </View>

                    {/* Salons (si serveur individuel) */}
                    {selectedGuild?.id !== 'all_guilds' && selectedGuild?.id !== 'dms' && (
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryRowLeft}>
                          <View style={[styles.summaryIconMini, { backgroundColor: '#8B5CF615' }]}>
                            <Ionicons name="chatbubbles" size={13} color="#8B5CF6" />
                          </View>
                          <Text style={styles.summaryRowLabel}>Salons</Text>
                        </View>
                        <Text style={styles.summaryRowValue}>
                          {selectedChannelIds.size} salon{selectedChannelIds.size > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}

                    {/* Méthode appliquée */}
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <View
                          style={[
                            styles.summaryIconMini,
                            { backgroundColor: speedDelayMs === 1000 ? '#10B98115' : '#5865F215' },
                          ]}
                        >
                          <Ionicons
                            name={speedDelayMs === 1000 ? 'shield-checkmark' : 'speedometer-outline'}
                            size={13}
                            color={speedDelayMs === 1000 ? '#10B981' : '#5865F2'}
                          />
                        </View>
                        <Text style={styles.summaryRowLabel}>
                          {speedDelayMs === 1000 ? 'Anti-ban' : 'Vitesse'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.summaryRowValue,
                          speedDelayMs === 1000 && { color: '#10B981', fontWeight: '700' },
                        ]}
                      >
                        {speedDelayMs === 1000 ? 'Anti-ban (1s / message)' : `${speedDelayMs} ms / message`}
                      </Text>
                    </View>

                    {/* Mode Furtif (si actif) */}
                    {isGhostModeEnabled && (
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryRowLeft}>
                          <View style={[styles.summaryIconMini, { backgroundColor: '#8B5CF615' }]}>
                            <Ionicons name="eye-off" size={13} color="#8B5CF6" />
                          </View>
                          <Text style={styles.summaryRowLabel}>Mode Furtif</Text>
                        </View>
                        <Text style={[styles.summaryRowValue, { color: '#8B5CF6', fontWeight: '700' }]}>
                          Anti-Logs Actif 👻
                        </Text>
                      </View>
                    )}

                    {/* Historique Cleanly */}
                    <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <View style={styles.summaryRowLeft}>
                        <View style={[styles.summaryIconMini, { backgroundColor: '#F59E0B15' }]}>
                          <Ionicons name="time" size={13} color="#F59E0B" />
                        </View>
                        <Text style={styles.summaryRowLabel}>Historique</Text>
                      </View>
                      <Text style={[styles.summaryRowValue, { color: '#10B981', fontWeight: '700' }]}>
                        Sauvegardé localement ✓
                      </Text>
                    </View>
                  </View>

                  {/* Bouton d'export de la sauvegarde post-suppression */}
                  <TouchableOpacity
                    style={styles.completeBackupBtn}
                    onPress={handleOpenBackupPrompt}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={17} color="#5865F2" style={{ marginRight: 8 }} />
                    <Text style={styles.completeBackupBtnText}>
                      Exporter la sauvegarde ({deletedCount} messages)
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 16 }} />
                </ScrollView>

                {/* Footer FIXE EN BAS avec bouton Terminé */}
                <View style={styles.completeFixedBottomBar}>
                  <TouchableOpacity
                    style={styles.completePrimaryBtn}
                    onPress={handleFinishAndClose}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.completePrimaryBtnText}>Terminé</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeSecondaryBtn}
                    onPress={() => {
                      setStep('select_guild');
                      setSelectedChannelIds(new Set());
                      setScannedMessages([]);
                      setSelectedMessageIds(new Set());
                      setDeletedCount(0);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#5865F2" style={{ marginRight: 6 }} />
                    <Text style={styles.completeSecondaryBtnText}>Nettoyer un autre serveur</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Modale de Dialogue / Alerte personnalisée Multiplateforme (iOS & Android) */}
        <CustomAlertModal
          visible={customAlert.visible}
          type={customAlert.type}
          title={customAlert.title}
          message={customAlert.message}
          buttons={customAlert.buttons}
          onClose={closeAlert}
        />
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text.primary,
  },
  headerSub: {
    fontSize: 12,
    color: theme.text.secondary,
    flexShrink: 1,
  },
  headerRightPlaceholder: {
    width: 36,
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
  globalCard: {
    borderColor: '#8B5CF680',
    backgroundColor: '#8B5CF60C',
    borderWidth: 1.5,
  },
  fastPill: {
    backgroundColor: '#8B5CF625',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fastPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
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
    marginTop: 1,
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
  // Nouveaux styles pour la sélection des salons (Filtre en haut / Résultats en bas)
  channelsTopFilterContainer: {
    backgroundColor: theme.bg.base,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  serverCardHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#5865F225',
    marginBottom: 10,
  },
  serverCardImgSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarBoxSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guildInitialsSmall: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSearchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  filterSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text.primary,
    padding: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableSelectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  tableSelectAllTextActive: {
    color: '#5865F2',
    fontWeight: '700',
  },
  tableStatsBadge: {
    backgroundColor: '#5865F215',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  tableStatsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5865F2',
  },
  channelsResultScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tableContainer: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
  },
  tableRowSelected: {
    backgroundColor: '#5865F20A',
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  tableRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  tableRowTextSelected: {
    color: '#5865F2',
    fontWeight: '700',
  },
  emptyTableBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text.primary,
    marginTop: 10,
  },
  emptyTableSub: {
    fontSize: 12,
    color: theme.text.muted,
    marginTop: 4,
    textAlign: 'center',
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
  filterSubDesc: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 6,
    lineHeight: 16,
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
  previewBottomBar: {
    padding: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    gap: 10,
  },
  speedSelectorBox: {
    backgroundColor: theme.bg.raised,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  speedSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text.primary,
  },
  speedEstimationText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.accent.amber,
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
  deletingScrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  deletingIconWrapper: {
    marginBottom: 12,
  },
  deletingIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#5865F212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletingIconOuterSuccess: {
    backgroundColor: '#10B98115',
  },
  deletingIconOuterPaused: {
    backgroundColor: '#F59E0B15',
  },
  deletingIconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deletingIconInnerSuccess: {
    backgroundColor: '#FFF',
  },
  deletingIconInnerPaused: {
    backgroundColor: '#FFF',
  },
  deletingMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text.primary,
    marginBottom: 3,
    textAlign: 'center',
  },
  deletingTargetSub: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  metricsDashboardRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    padding: 10,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.text.muted,
  },
  metricCardValue: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text.primary,
  },
  metricCardValueTotal: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.text.muted,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressTrackModern: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.bg.raised,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarModern: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressPercentSub: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  liveConsoleCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    padding: 12,
    marginBottom: 20,
    elevation: 1,
  },
  liveConsoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveConsoleHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.text.muted,
    letterSpacing: 0.5,
  },
  liveSpeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveSpeedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5865F2',
  },
  liveConsoleMessage: {
    fontSize: 12,
    color: theme.text.secondary,
    lineHeight: 17,
    fontFamily: 'monospace',
    backgroundColor: theme.bg.raised,
    padding: 8,
    borderRadius: theme.radius.sm,
    marginBottom: 10,
  },
  liveSecurityTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  liveSecurityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98112',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98125',
  },
  liveSecurityTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  deletingActionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deletingActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    borderWidth: 0,
    backgroundColor: theme.bg.raised,
  },
  deletingActionBtnResume: {
    backgroundColor: '#10B98118',
  },
  deletingActionBtnStop: {
    backgroundColor: '#EF444415',
  },
  deletingActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text.primary,
  },
  completeScrollContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  completeIconWrapper: {
    marginBottom: 16,
  },
  completeIconOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#22C55E18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeIconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: 13,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  completeStatCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    elevation: 1,
  },
  completeStatNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.accent.red,
    letterSpacing: 0.5,
  },
  completeStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
    marginTop: 2,
  },
  completeSummaryCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.lg,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    elevation: 1,
  },
  summaryCardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.text.muted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  summaryRowLabel: {
    fontSize: 13,
    color: theme.text.secondary,
    fontWeight: '600',
  },
  summaryRowValue: {
    fontSize: 13,
    color: theme.text.primary,
    fontWeight: '700',
    maxWidth: '55%',
  },
  completeFixedBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    gap: 8,
  },
  antibanBadge: {
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  antibanBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  completeActionsBox: {
    width: '100%',
    gap: 10,
  },
  completePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    elevation: 2,
  },
  completePrimaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completeSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F212',
    borderWidth: 1,
    borderColor: '#5865F230',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  completeSecondaryBtnText: {
    color: '#5865F2',
    fontSize: 14,
    fontWeight: '700',
  },
  completeBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F212',
    borderWidth: 1,
    borderColor: '#5865F230',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    width: '100%',
    marginBottom: 8,
  },
  completeBackupBtnText: {
    color: '#5865F2',
    fontSize: 13,
    fontWeight: '700',
  },
  backupCheckboxBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  backupCheckboxBarActive: {
    backgroundColor: '#5865F208',
  },
  backupCheckboxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.primary,
  },
  backupCheckboxTitleActive: {
    color: '#5865F2',
    fontWeight: '700',
  },
  backupCheckboxSub: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 2,
  },
  backupActiveBadge: {
    backgroundColor: '#5865F218',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#5865F240',
    marginLeft: 8,
  },
  backupActiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5865F2',
    letterSpacing: 0.5,
  },
  // Nouveaux styles pour preview_messages (Filtre en haut, radiobox backup, résultats en bas)
  previewTopFilterContainer: {
    backgroundColor: theme.bg.base,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  previewHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewShowingCountText: {
    fontSize: 11,
    color: theme.text.muted,
    fontWeight: '600',
  },
  tableStatsBadgeFiltered: {
    backgroundColor: '#8B5CF618',
    borderColor: '#8B5CF640',
  },
  tableStatsBadgeTextFiltered: {
    color: '#8B5CF6',
  },
  isolateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F212',
    borderWidth: 1,
    borderColor: '#5865F230',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  isolateFilterBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5865F2',
  },
  backupRadioGroup: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  },
  backupRadioGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.text.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  backupRadioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  backupRadioItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  backupRadioItemActive: {
    borderColor: '#10B981',
    backgroundColor: '#10B9810C',
  },
  backupRadioItemActiveDanger: {
    borderColor: theme.accent.red,
    backgroundColor: '#FA3E3E0C',
  },
  backupRadioItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  backupRadioItemTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  backupRadioItemTextDanger: {
    color: theme.accent.red,
    fontWeight: '700',
  },
  backupRadioMiniBadge: {
    marginLeft: 4,
  },
  filterSyncWarningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  filterSyncWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginRight: 6,
  },
  filterSyncWarningBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  filterSyncWarningBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  messagesResultScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  antiLogsBadge: {
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  antiLogsBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  ghostModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  ghostModeBarActive: {
    borderColor: '#8B5CF660',
    backgroundColor: '#8B5CF608',
  },
  ghostModeBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ghostModeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostModeBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.primary,
  },
  ghostModeMiniBadge: {
    backgroundColor: theme.bg.raised,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 6,
  },
  ghostModeMiniBadgeActive: {
    backgroundColor: '#8B5CF625',
  },
  ghostModeMiniBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.text.muted,
  },
  ghostModeMiniBadgeTextActive: {
    color: '#8B5CF6',
  },
  ghostModeBarSub: {
    fontSize: 10,
    color: theme.text.secondary,
    marginTop: 1,
  },
  tableSelectAllCompactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  cleanOptionsContainer: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    gap: 6,
  },
  securityTogglesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  securityToggleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  securityToggleCardBackupActive: {
    borderColor: '#10B98160',
    backgroundColor: '#10B98108',
  },
  securityToggleCardGhostActive: {
    borderColor: '#8B5CF660',
    backgroundColor: '#8B5CF608',
  },
  securityToggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  securityToggleTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text.primary,
  },
  securityToggleSub: {
    fontSize: 9,
    color: theme.text.muted,
    marginTop: 0.5,
  },
  speedCompactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bg.raised,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  speedCompactBarActive: {
    borderColor: '#5865F260',
    backgroundColor: '#5865F208',
  },
  speedCompactLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedCompactLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.text.secondary,
    marginRight: 4,
  },
  speedCompactValue: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text.primary,
  },
  speedCompactRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedCompactEstimate: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.text.muted,
  },
  ghostModeDeletingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#8B5CF618',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#8B5CF630',
  },
  ghostModeDeletingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  // Nouveaux styles FEAT-02 : PII Shield (Filtre Données Sensibles)
  quickFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  quickFilterChipActivePII: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444450',
  },
  quickFilterChipHasPII: {
    borderColor: '#D9770650',
    backgroundColor: '#FEF3C7',
  },
  quickFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  quickFilterChipTextActivePII: {
    color: '#DC2626',
    fontWeight: '700',
  },
  quickFilterCountBadge: {
    backgroundColor: theme.bg.raised,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 5,
  },
  quickFilterCountBadgeActivePII: {
    backgroundColor: '#DC2626',
  },
  quickFilterCountBadgeWarning: {
    backgroundColor: '#D97706',
  },
  quickFilterCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.text.muted,
  },
  quickFilterCountTextActivePII: {
    color: '#FFF',
  },
  quickFilterCountTextWarning: {
    color: '#FFF',
  },
  messageCardPIIHighlight: {
    borderColor: '#F59E0B60',
    backgroundColor: '#FFFDF5',
  },
  piiBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  piiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderColor: '#EF444435',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  piiTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  // Nouveaux styles FEAT-04 : Réactions Emojis
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  reactionBadgeMe: {
    backgroundColor: '#5865F215',
    borderColor: '#5865F240',
  },
  reactionEmojiText: {
    fontSize: 12,
    marginRight: 3,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  reactionCountTextMe: {
    color: '#5865F2',
    fontWeight: '700',
  },
  reactionMeIndicator: {
    fontSize: 8,
    color: '#5865F2',
    fontWeight: '900',
    marginLeft: 2,
  },
});
