// Composant Modale de configuration des Règles d'Auto-Clean (Rétention) — FEAT-06 Cleanly
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
import type { PlatformAccount, RetentionRule } from '../types';

interface RetentionModalProps {
  visible: boolean;
  onClose: () => void;
  onTriggerClean?: (account: PlatformAccount, days: number) => void;
}

const RETENTION_PERIODS = [
  { days: 7, label: '7 jours', sub: 'Historique ultra-court' },
  { days: 14, label: '14 jours', sub: '2 semaines de grâce' },
  { days: 30, label: '30 jours', sub: '1 mois (Recommandé)' },
  { days: 90, label: '90 jours', sub: '1 trimestre' },
  { days: 180, label: '6 mois', sub: 'Semestriel' },
  { days: 365, label: '1 an', sub: 'Annuel' },
];

const FREQUENCIES: { id: 'daily' | 'weekly' | 'monthly'; label: string; icon: string }[] = [
  { id: 'daily', label: 'Quotidien', icon: 'today-outline' },
  { id: 'weekly', label: 'Hebdo', icon: 'calendar-outline' },
  { id: 'monthly', label: 'Mensuel', icon: 'time-outline' },
];

export function RetentionModal({ visible, onClose, onTriggerClean }: RetentionModalProps) {
  const accounts = useAuthStore((s) => s.accounts);
  const rules = useRetentionStore((s) => s.rules);
  const saveRule = useRetentionStore((s) => s.saveRule);
  const loadRules = useRetentionStore((s) => s.loadRules);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadRules();
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [visible, accounts, loadRules, selectedAccountId]);

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // Règle actuelle ou valeurs par défaut
  const activeRule: RetentionRule = rules.find((r) => r.accountId === currentAccount?.id) ?? {
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
    if (!currentAccount) return;
    const updated: RetentionRule = {
      ...activeRule,
      ...patch,
      accountId: currentAccount.id,
      platform: currentAccount.platform,
      accountName: currentAccount.displayName || currentAccount.username,
    };
    await saveRule(updated);
  };

  const handleImmediateClean = () => {
    if (!currentAccount) return;
    onClose();
    if (onTriggerClean) {
      onTriggerClean(currentAccount, activeRule.retentionDays);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
            <Text style={styles.headerTitle}>Auto-Clean & Rétention</Text>
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
                <Text style={styles.mainCardTitle}>Règle de rétention active</Text>
                <Text style={styles.mainCardDesc}>
                  {activeRule.enabled
                    ? retentionService.formatRuleSummary(activeRule)
                    : 'Désactivé • Vos anciens messages restent indéfiniment'}
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

          {/* 1. Durée maximale de conservation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Délai de rétention maximal</Text>
            <Text style={styles.sectionSubtitle}>
              Tout message plus ancien que cette période sera ciblé pour suppression.
            </Text>

            <View style={styles.gridPeriods}>
              {RETENTION_PERIODS.map((p) => {
                const isSelected = activeRule.retentionDays === p.days;
                return (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.periodCard, isSelected && styles.periodCardSelected]}
                    onPress={() => handleUpdate({ retentionDays: p.days })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodLabel, isSelected && styles.periodLabelSelected]}>
                      {p.label}
                    </Text>
                    <Text style={[styles.periodSub, isSelected && styles.periodSubSelected]}>
                      {p.sub}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#5865F2"
                        style={styles.periodCheckIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. Fréquence d'exécution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Fréquence de passage</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map((f) => {
                const isSelected = activeRule.frequency === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.frequencyBtn, isSelected && styles.frequencyBtnSelected]}
                    onPress={() => handleUpdate({ frequency: f.id })}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={f.icon}
                      size={16}
                      color={isSelected ? '#5865F2' : theme.text.muted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.frequencyBtnText, isSelected && styles.frequencyBtnTextSelected]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Mode d'exécution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Mode de purge</Text>
            <View style={styles.cardBox}>
              <TouchableOpacity
                style={[
                  styles.modeRow,
                  activeRule.executionMode === 'notify_confirm' && styles.modeRowActive,
                ]}
                onPress={() => handleUpdate({ executionMode: 'notify_confirm' })}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeRule.executionMode === 'notify_confirm' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color="#5865F2"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>Alerte intelligente avec confirmation</Text>
                  <Text style={styles.modeSub}>
                    Cleanly vous notifie des messages expirés et vous demande confirmation en 1 clic.
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={[
                  styles.modeRow,
                  activeRule.executionMode === 'auto_background' && styles.modeRowActive,
                ]}
                onPress={() => handleUpdate({ executionMode: 'auto_background' })}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeRule.executionMode === 'auto_background' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color="#5865F2"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>Purge automatique silencieuse</Text>
                  <Text style={styles.modeSub}>
                    Supprime automatiquement les messages expirés en arrière-plan avec rapport de fin.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Protections & Sécurité */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Protections avancées</Text>
            <View style={styles.cardBox}>
              <View style={styles.switchOptionRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.switchOptionTitle}>👻 Mode Furtif (Anti-Logs)</Text>
                  <Text style={styles.switchOptionSub}>
                    Brouille le contenu avant suppression pour éviter les captures de bots de salon.
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

          {/* Bouton d'action directe immédiate */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.actionCleanNowBtn}
              onPress={handleImmediateClean}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionCleanNowText}>
                Purger les messages &gt; {activeRule.retentionDays} jours maintenant
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  gridPeriods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodCard: {
    width: '31%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  periodCardSelected: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F20A',
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text.primary,
  },
  periodLabelSelected: {
    color: '#5865F2',
  },
  periodSub: {
    fontSize: 9.5,
    color: theme.text.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  periodSubSelected: {
    color: '#5865F2',
    fontWeight: '600',
  },
  periodCheckIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: theme.radius.sm,
    paddingVertical: 9,
  },
  frequencyBtnSelected: {
    borderColor: '#5865F2',
    backgroundColor: '#5865F20A',
  },
  frequencyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text.secondary,
  },
  frequencyBtnTextSelected: {
    color: '#5865F2',
    fontWeight: '700',
  },
  cardBox: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeRowActive: {},
  modeTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.text.primary,
  },
  modeSub: {
    fontSize: 10.5,
    color: theme.text.muted,
    marginTop: 1,
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
    marginTop: 8,
  },
  actionCleanNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F2',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
  },
  actionCleanNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});
