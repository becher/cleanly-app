// Paramètres — Clean Light theme
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { I18nManager } from 'react-native';
import i18n, { SUPPORTED_LANGUAGES } from '../../src/i18n';
import { theme } from '../../src/constants/theme';

const LANGUAGE_LABELS: Record<string, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English'  },
  fr: { flag: '🇫🇷', label: 'Français' },
  ar: { flag: '🇸🇦', label: 'العربية'  },
  es: { flag: '🇪🇸', label: 'Español'  },
  de: { flag: '🇩🇪', label: 'Deutsch'  },
  ja: { flag: '🇯🇵', label: '日本語'   },
  zh: { flag: '🇨🇳', label: '中文'     },
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const currentLang = i18n.language;

  async function changeLanguage(lang: string) {
    await i18n.changeLanguage(lang);
    if (I18nManager.isRTL !== (lang === 'ar')) {
      I18nManager.forceRTL(lang === 'ar');
    }
  }

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>

      {/* Langue */}
      <Text style={styles.groupLabel}>LANGUE</Text>
      <View style={styles.card}>
        {SUPPORTED_LANGUAGES.map((lang, i) => {
          const info = LANGUAGE_LABELS[lang];
          const active = currentLang === lang;
          const isLast = i === SUPPORTED_LANGUAGES.length - 1;
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.listRow, !isLast && styles.listRowBorder]}
              onPress={() => changeLanguage(lang)}
              activeOpacity={0.6}
            >
              <Text style={styles.flag}>{info.flag}</Text>
              <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                {info.label}
              </Text>
              {active && <Ionicons name="checkmark" size={18} color={theme.accent.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Abonnement */}
      <Text style={styles.groupLabel}>ABONNEMENT</Text>
      <View style={styles.card}>
        <View style={styles.planRow}>
          <View>
            <Text style={styles.planName}>Plan Gratuit</Text>
            <Text style={styles.planDetail}>1 réseau · 500 suppressions/mois</Text>
          </View>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>GRATUIT</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>Passer à Pro — $4.99/mois</Text>
        </TouchableOpacity>
      </View>

      {/* Compte */}
      <Text style={styles.groupLabel}>COMPTE</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.listRow} activeOpacity={0.6}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.text.secondary} />
          <Text style={[styles.langLabel, { flex: 1 }]}>Politique de confidentialité</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.listRow, { borderTopWidth: 1, borderTopColor: theme.border.subtle }]} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={18} color={theme.accent.red} />
          <Text style={[styles.langLabel, { flex: 1, color: theme.accent.red }]}>
            Déconnecter tous les comptes
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Cleanly v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg.base },
  groupLabel: {
    color: theme.text.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: theme.space.md,
    marginTop: theme.space.lg,
    marginBottom: 6,
  },
  card: {
    backgroundColor: theme.bg.surface,
    marginHorizontal: theme.space.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: 14,
    gap: 10,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  flag: { fontSize: 20 },
  langLabel: { flex: 1, color: theme.text.secondary, fontSize: 15 },
  langLabelActive: { color: theme.text.primary, fontWeight: '700' },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.space.md,
  },
  planName: { color: theme.text.primary, fontSize: 15, fontWeight: '700' },
  planDetail: { color: theme.text.muted, fontSize: 12, marginTop: 2 },
  freeBadge: {
    backgroundColor: theme.accent.green + '20',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  freeBadgeText: {
    color: theme.accent.green,
    fontSize: 11, fontWeight: '800',
  },
  upgradeBtn: {
    backgroundColor: theme.accent.primary,
    margin: theme.space.md,
    marginTop: 0,
    borderRadius: theme.radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  version: {
    color: theme.text.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
});
