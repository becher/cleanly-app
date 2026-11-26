// Composant de configuration Auto-Clean & Rétention — FEAT-06 Cleanly
// Supporte les menus déroulants (dropdowns compacts), test rapide 1 min, notifications Notifee et réinitialisation
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme, PLATFORM_COLORS } from '../constants/theme';
import { useRetentionStore } from '../store/retentionStore';
import { useAuthStore } from '../store/authStore';
import { retentionService } from '../services/retentionService';
import { cleanNotificationService } from '../services/cleanNotificationService';
import type { PlatformAccount, RetentionRule } from '../types';

interface RetentionModalProps {
  visible: boolean;
  onClose: () => void;
  onTriggerClean?: (
    account: PlatformAccount,
    days: number,
    stealthMode?: boolean,
    ignorePinned?: boolean
  ) => void;
  embedded?: boolean;
  initialAccountId?: string;
}

const RETENTION_PERIODS = [
  { days: 0, label: '⚡ 1 minute (Test rapide)', desc: 'Purge les messages envoyés il y a plus de 60s', icon: 'flash' },
  { days: 1, label: '24 heures', desc: 'Conserve uniquement les messages du jour', icon: 'today-outline' },
  { days: 7, label: '7 jours (1 semaine)', desc: 'Historique court d’une semaine', icon: 'calendar-outline' },
  { days: 14, label: '14 jours (2 semaines)', desc: '2 semaines de grâce', icon: 'calendar-outline' },
  { days: 30, label: '30 jours (1 mois - Recommandé)', desc: 'Garde uniquement le dernier mois', icon: 'calendar-number-outline' },
  { days: 90, label: '90 jours (3 mois)', desc: 'Historique trimestriel', icon: 'time-outline' },
  { days: 180, label: '6 mois', desc: 'Historique semestriel', icon: 'time-outline' },
  { days: 365, label: '1 an (365 jours)', desc: 'Conserve l’année en cours', icon: 'archive-outline' },
];

const FREQUENCIES: { id: '1min' | 'daily' | 'weekly' | 'monthly'; label: string; desc: string; icon: string }[] = [
  { id: '1min', label: '⚡ Dans 1 minute (Test immédiat)', desc: 'Déclenche l’alerte dans 60 secondes chrono !', icon: 'flash-outline' },
  { id: 'daily', label: 'Quotidien (chaque jour)', desc: 'Vérification automatique chaque matin', icon: 'today-outline' },
  { id: 'weekly', label: 'Hebdomadaire (Recommandé)', desc: 'Vérification une fois par semaine', icon: 'calendar-outline' },
  { id: 'monthly', label: 'Mensuel', desc: 'Vérification une fois par mois', icon: 'time-outline' },
];

const SCOPES: { id: 'all' | 'dms' | 'guilds'; title: string; desc: string; icon: string }[] = [
  { id: 'all', title: 'Tout le compte (DMs + Serveurs)', desc: 'Nettoyage complet de l’historique', icon: 'globe-outline' },
  { id: 'dms', title: 'Messages Privés (DMs) seuls', desc: 'Ne touche jamais aux serveurs', icon: 'chatbubbles-outline' },
  { id: 'guilds', title: 'Serveurs uniquement', desc: 'Conserve vos conversations privées', icon: 'server-outline' },
];

export function RetentionModal({ visible, onClose, onTriggerClean, embedded = false, initialAccountId }: RetentionModalProps) {
  const accounts = useAuthStore((s) => s.accounts);
  const rules = useRetentionStore((s) => s.rules);
  const saveRule = useRetentionStore((s) => s.saveRule);
  const deleteRule = useRetentionStore((s) => s.deleteRule);
  const loadRules = useRetentionStore((s) => s.loadRules);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '');

  // Rafraîchissement dynamique chaque seconde
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // États pour les menus déroulants (Dropdowns style vitesse)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  useEffect(() => {
    if (accounts.length === 0) {
      useAuthStore.getState().loadAccounts();
    }
    if (visible || embedded) {
      loadRules();
      if (initialAccountId) {
        setSelectedAccountId(initialAccountId);
      } else if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [visible, embedded, accounts, loadRules, selectedAccountId, initialAccountId]);

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // Règle actuelle ou valeurs par défaut
  const existingRule = rules.find((r) => r.accountId === currentAccount?.id);
  const activeRule: RetentionRule = existingRule ?? {
    id: `rule_${currentAccount?.id ?? 'default'}`,
    platform: currentAccount?.platform ?? 'discord',
    accountId: currentAccount?.id ?? '',
    accountName: currentAccount?.displayName ?? currentAccount?.username ?? 'Compte',
    enabled: false,
    retentionDays: 30,
    frequency: 'weekly',
    nextRunAt: Date.now() + 7 * 24 * 3600 * 1000,
    targetScope: 'all',
    stealthMode: true,
    ignorePinned: true,
    executionMode: 'notify_confirm',
    autoCleanedCount: 0,
  };

  const handleUpdate = async (patch: Partial<RetentionRule>) => {
    const targetAccount = currentAccount || accounts[0];
    if (!targetAccount) return;
    const updated: RetentionRule = {
      ...activeRule,
      ...patch,
      accountId: targetAccount.id,
      platform: targetAccount.platform,
      accountName: targetAccount.displayName || targetAccount.username,
    };
    await saveRule(updated);
  };

  const handleSaveAndSchedule = async () => {
    const targetAccount = currentAccount || accounts[0];
    if (!targetAccount) {
      Alert.alert('Compte requis', 'Veuillez d’abord connecter un compte dans l’onglet Réseaux.');
      return;
    }

    const intervalMs =
      activeRule.frequency === '1min'
        ? 60 * 1000
        : activeRule.frequency === 'daily'
        ? 24 * 3600 * 1000
        : activeRule.frequency === 'weekly'
        ? 7 * 24 * 3600 * 1000
        : 30 * 24 * 3600 * 1000;

    const updated: RetentionRule = {
      ...activeRule,
      enabled: true,
      accountId: targetAccount.id,
      platform: targetAccount.platform,
      accountName: targetAccount.displayName || targetAccount.username,
      nextRunAt: Date.now() + intervalMs,
    };

    await saveRule(updated);

    // 1. Notification immédiate Notifee sur le téléphone
    await cleanNotificationService.notifyRetentionScheduled({
      platform: targetAccount.platform,
      accountName: targetAccount.displayName || targetAccount.username,
      retentionDays: activeRule.retentionDays,
      frequency: activeRule.frequency,
    });

    // 2. Si le test 1 minute a été choisi, planifier le déclenchement dans 60s
    if (activeRule.frequency === '1min') {
      setTimeout(() => {
        cleanNotificationService.notifyRetentionAlert({
          platform: targetAccount.platform,
          accountName: targetAccount.displayName || targetAccount.username,
          expiredCount: 0,
          retentionDays: activeRule.retentionDays,
        });
      }, 60000);
    }

    const freqLabel =
      activeRule.frequency === '1min'
        ? 'dans 1 minute (test rapide)'
        : activeRule.frequency === 'daily'
        ? 'chaque jour'
        : activeRule.frequency === 'weekly'
        ? 'chaque semaine'
        : 'chaque mois';

    const daysLabel = activeRule.retentionDays === 0 ? '1 minute (test)' : `${activeRule.retentionDays} jours`;

    Alert.alert(
      '✅ Auto-Clean Planifié !',
      `Votre règle est active pour ${targetAccount.displayName || targetAccount.username}.\n\n• Délai : Plus de ${daysLabel}\n• Périmètre : ${activeRule.targetScope === 'dms' ? 'DMs seuls' : activeRule.targetScope === 'guilds' ? 'Serveurs seuls' : 'Tout le compte'}\n• Fréquence : ${freqLabel}\n\nUne notification de confirmation a été envoyée sur votre téléphone.`,
      [
        {
          text: 'Compris',
          onPress: () => onClose(),
        },
      ]
    );
  };

  const handleDeleteRule = () => {
    Alert.alert(
      'Supprimer la règle',
      'Voulez-vous désactiver l’Auto-Clean et supprimer cette planification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteRule(activeRule.id);
            Alert.alert('Règle supprimée', 'L’Auto-Clean a été réinitialisé pour ce compte.');
            onClose();
          },
        },
      ]
    );
  };

  const handleImmediateClean = () => {
    const targetAccount = currentAccount || accounts[0];
    if (!targetAccount) {
      Alert.alert('Compte requis', 'Veuillez d’abord connecter un compte dans l’onglet Réseaux.');
      return;
    }

    if (onTriggerClean) {
      onTriggerClean(
        targetAccount,
        activeRule.retentionDays === 0 ? -1 : activeRule.retentionDays,
        activeRule.stealthMode,
        activeRule.ignorePinned
      );
    }
  };

  const selectedPeriod = RETENTION_PERIODS.find((p) => p.days === activeRule.retentionDays) ?? RETENTION_PERIODS[4];
  const selectedFreq = FREQUENCIES.find((f) => f.id === activeRule.frequency) ?? FREQUENCIES[2];
  const selectedScope = SCOPES.find((s) => s.id === (activeRule.targetScope ?? 'all')) ?? SCOPES[0];

  const contentJSX = (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={embedded ? 'arrow-back' : 'close'} size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
          <Text style={styles.headerTitle}>Auto-Clean Discord</Text>
          <Text style={styles.headerSubtitle}>Hygiène numérique automatique</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de compte si plusieurs */}
        {accounts.length > 1 && (
          <View style={styles.accountTabs}>
            {accounts.map((acc) => {
              const isSel = acc.id === currentAccount?.id;
              const pColor = PLATFORM_COLORS[acc.platform] ?? theme.accent.primary;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountTab, isSel && { borderColor: pColor, backgroundColor: `${pColor}0D` }]}
                  onPress={() => setSelectedAccountId(acc.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accountTabText, isSel && { color: pColor, fontWeight: '700' }]}>
                    {acc.displayName || acc.username}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bannière principale Switch ON/OFF */}
        <View style={[styles.mainCard, activeRule.enabled && styles.mainCardActive]}>
          <View style={styles.mainCardHeader}>
            <View style={[styles.iconCircle, activeRule.enabled && styles.iconCircleActive]}>
              <Ionicons
                name={activeRule.enabled ? 'shield-checkmark' : 'shield-outline'}
                size={24}
                color={activeRule.enabled ? '#10B981' : theme.text.muted}
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.mainCardTitle}>
                {activeRule.enabled ? '🟢 Règle de rétention active' : '⚪ Auto-Clean désactivé'}
              </Text>
              <Text style={styles.mainCardDesc}>
                {activeRule.enabled
                  ? retentionService.formatRuleSummary(activeRule)
                  : 'Activez pour effacer vos anciens messages automatiquement'}
              </Text>
            </View>
            <Switch
              value={activeRule.enabled}
              onValueChange={(val) => handleUpdate({ enabled: val })}
              trackColor={{ true: '#10B981', false: theme.bg.raised }}
            />
          </View>

          {activeRule.enabled && (
            <View style={styles.scheduleBadge}>
              <Ionicons name="time-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.scheduleBadgeText}>
                Prochaine vérification : {retentionService.formatNextRun(activeRule)}
              </Text>
            </View>
          )}
        </View>

        {/* 1. Menu déroulant : Délai de rétention maximal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Délai de rétention (Ancienneté)</Text>
          <Text style={styles.sectionSubtitle}>
            Tout message plus ancien que cette durée sera ciblé pour suppression.
          </Text>

          <TouchableOpacity
            style={[styles.dropdownBtn, isPeriodDropdownOpen && styles.dropdownBtnActive]}
            onPress={() => {
              setIsPeriodDropdownOpen(!isPeriodDropdownOpen);
              setIsFrequencyDropdownOpen(false);
              setIsScopeDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name={selectedPeriod.icon as any} size={18} color="#5865F2" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownValue}>{selectedPeriod.label}</Text>
                <Text style={styles.dropdownDesc} numberOfLines={1}>
                  • {selectedPeriod.desc}
                </Text>
              </View>
            </View>
            <Ionicons name={isPeriodDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text.secondary} />
          </TouchableOpacity>

          {isPeriodDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {RETENTION_PERIODS.map((p, idx) => {
                const isSelected = activeRule.retentionDays === p.days;
                return (
                  <TouchableOpacity
                    key={p.days}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemSelected,
                      idx < RETENTION_PERIODS.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      handleUpdate({ retentionDays: p.days });
                      setIsPeriodDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={18}
                      color={isSelected ? '#5865F2' : theme.text.muted}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemTitle, isSelected && { color: '#5865F2', fontWeight: '700' }]}>
                        {p.label}
                      </Text>
                      <Text style={styles.dropdownItemSub}>{p.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#5865F2" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 2. Menu déroulant : Fréquence de passage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Fréquence de vérification</Text>
          <Text style={styles.sectionSubtitle}>
            À quel rythme Cleanly inspecte votre compte en arrière-plan.
          </Text>

          <TouchableOpacity
            style={[styles.dropdownBtn, isFrequencyDropdownOpen && styles.dropdownBtnActive]}
            onPress={() => {
              setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen);
              setIsPeriodDropdownOpen(false);
              setIsScopeDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name={selectedFreq.icon as any} size={18} color="#5865F2" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownValue}>{selectedFreq.label}</Text>
                <Text style={styles.dropdownDesc} numberOfLines={1}>
                  • {selectedFreq.desc}
                </Text>
              </View>
            </View>
            <Ionicons name={isFrequencyDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text.secondary} />
          </TouchableOpacity>

          {isFrequencyDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {FREQUENCIES.map((f, idx) => {
                const isSelected = activeRule.frequency === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemSelected,
                      idx < FREQUENCIES.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      handleUpdate({ frequency: f.id });
                      setIsFrequencyDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={f.icon as any}
                      size={18}
                      color={isSelected ? '#5865F2' : theme.text.muted}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemTitle, isSelected && { color: '#5865F2', fontWeight: '700' }]}>
                        {f.label}
                      </Text>
                      <Text style={styles.dropdownItemSub}>{f.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#5865F2" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Menu déroulant : Périmètre ciblé (Où nettoyer ?) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Périmètre ciblé (Où nettoyer ?)</Text>
          <Text style={styles.sectionSubtitle}>
            Choisissez les espaces où la purge s'appliquera sur Discord.
          </Text>

          <TouchableOpacity
            style={[styles.dropdownBtn, isScopeDropdownOpen && styles.dropdownBtnActive]}
            onPress={() => {
              setIsScopeDropdownOpen(!isScopeDropdownOpen);
              setIsPeriodDropdownOpen(false);
              setIsFrequencyDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name={selectedScope.icon as any} size={18} color="#5865F2" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownValue}>{selectedScope.title}</Text>
                <Text style={styles.dropdownDesc} numberOfLines={1}>
                  • {selectedScope.desc}
                </Text>
              </View>
            </View>
            <Ionicons name={isScopeDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text.secondary} />
          </TouchableOpacity>

          {isScopeDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {SCOPES.map((sc, idx) => {
                const isSelected = (activeRule.targetScope ?? 'all') === sc.id;
                return (
                  <TouchableOpacity
                    key={sc.id}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemSelected,
                      idx < SCOPES.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      handleUpdate({ targetScope: sc.id });
                      setIsScopeDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={sc.icon as any}
                      size={18}
                      color={isSelected ? '#5865F2' : theme.text.muted}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemTitle, isSelected && { color: '#5865F2', fontWeight: '700' }]}>
                        {sc.title}
                      </Text>
                      <Text style={styles.dropdownItemSub}>{sc.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#5865F2" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. Protections avancées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Protections avancées</Text>
          <View style={styles.cardBox}>
            <View style={styles.switchOptionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.switchOptionTitle}>👻 Mode Furtif (Anti-Logs)</Text>
                <Text style={styles.switchOptionSub}>
                  Brouille le contenu avant suppression pour éviter les captures de bots espions.
                </Text>
              </View>
              <Switch
                value={activeRule.stealthMode}
                onValueChange={(val) => handleUpdate({ stealthMode: val })}
                trackColor={{ true: '#5865F2', false: theme.bg.raised }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchOptionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.switchOptionTitle}>📌 Conserver les messages épinglés</Text>
                <Text style={styles.switchOptionSub}>
                  Ne jamais purger les messages importants ou annonces épinglés.
                </Text>
              </View>
              <Switch
                value={activeRule.ignorePinned}
                onValueChange={(val) => handleUpdate({ ignorePinned: val })}
                trackColor={{ true: '#5865F2', false: theme.bg.raised }}
              />
            </View>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.bottomSection}>
          {/* Bouton principal vert : Sauvegarder et Armer la planification */}
          <TouchableOpacity
            style={styles.saveAndScheduleBtn}
            onPress={handleSaveAndSchedule}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveAndScheduleBtnText}>Sauvegarder & Armer la planification</Text>
          </TouchableOpacity>

          {/* Bouton secondaire violet : Test de purge manuelle immédiate */}
          <TouchableOpacity
            style={styles.actionCleanNowBtnOutline}
            onPress={handleImmediateClean}
            activeOpacity={0.75}
          >
            <Ionicons name="flash-outline" size={16} color="#5865F2" style={{ marginRight: 6 }} />
            <Text style={styles.actionCleanNowBtnOutlineText}>
              Tester une purge manuelle tout de suite (Optionnel)
            </Text>
          </TouchableOpacity>

          {/* Bouton rouge : Supprimer la règle et réinitialiser */}
          {existingRule && (
            <TouchableOpacity
              style={styles.deleteRuleBtn}
              onPress={handleDeleteRule}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.deleteRuleBtnText}>Supprimer cette règle d’Auto-Clean</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );

  if (embedded) {
    return contentJSX;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {contentJSX}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    backgroundColor: '#FFF',
  },
  backBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.text.muted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  accountTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  accountTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FFF',
  },
  accountTabText: {
    fontSize: 12,
    color: theme.text.secondary,
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    marginBottom: 16,
  },
  mainCardActive: {
    borderColor: '#10B98140',
    backgroundColor: '#10B98106',
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#10B98118',
  },
  mainCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text.primary,
  },
  mainCardDesc: {
    fontSize: 11.5,
    color: theme.text.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98114',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    marginTop: 10,
  },
  scheduleBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#10B981',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.text.muted,
    marginBottom: 8,
  },
  // Dropdown compacts (style DiscordCleanModal)
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownBtnActive: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F206',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.text.primary,
  },
  dropdownDesc: {
    fontSize: 11,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  dropdownItemSub: {
    fontSize: 10.5,
    color: theme.text.muted,
    marginTop: 1,
  },
  cardBox: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchOptionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.text.primary,
  },
  switchOptionSub: {
    fontSize: 10.5,
    color: theme.text.muted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border.subtle,
  },
  bottomSection: {
    marginTop: 10,
    gap: 10,
  },
  saveAndScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveAndScheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  actionCleanNowBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F20D',
    borderWidth: 1,
    borderColor: '#5865F240',
    borderRadius: theme.radius.md,
    paddingVertical: 10,
  },
  actionCleanNowBtnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5865F2',
  },
  deleteRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  deleteRuleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
