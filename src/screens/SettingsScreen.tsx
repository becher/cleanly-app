// Paramètres — Langue, Compte, Forfait Cleanly
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../constants/theme';
import { RetentionModal } from '../components/RetentionModal';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية (RTL)', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function SettingsScreen() {
  const [currentLang, setCurrentLang] = useState('fr');
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* Forfait */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planBadge}>PLAN GRATUIT</Text>
          <Text style={styles.planQuota}>500 / 500 suppr.</Text>
        </View>
        <Text style={styles.planTitle}>Cleanly Free</Text>
        <Text style={styles.planDesc}>
          1 réseau social connecté, jusqu'à 500 suppressions par mois.
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>Passer à Cleanly Pro (4,99 €/m)</Text>
        </TouchableOpacity>
      </View>

      {/* Langue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Langue de l'application</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, idx) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langRow,
                idx < LANGUAGES.length - 1 && styles.borderBottom,
              ]}
              onPress={() => setCurrentLang(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {currentLang === lang.code && (
                <Ionicons name="checkmark-circle" size={20} color={theme.accent.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confidentialité & Sécurité</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowRetentionModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={22} color="#5865F2" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.securityTitle}>Auto-Clean & Règles de rétention</Text>
              <Text style={styles.securityDesc}>
                Configurez la purge automatique ou les rappels pour vos anciens messages.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text.muted} />
          </TouchableOpacity>

          <View style={styles.borderBottom} />

          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={22} color={theme.accent.green} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.securityTitle}>Chiffrement matériel Keystore</Text>
              <Text style={styles.securityDesc}>
                Vos clés et tokens sont chiffrés en AES-256-GCM directement sur votre puce sécurisée Android.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 32 }} />

      <RetentionModal
        visible={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg.base,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  planCard: {
    backgroundColor: theme.accent.primary,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  planQuota: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  planTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  planDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: theme.accent.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text.primary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  langFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    color: theme.text.primary,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  securityDesc: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
