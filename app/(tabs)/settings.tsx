// Écran Paramètres — langue, thème, abonnement
// Sélection de langue avec changement i18n en temps réel

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import i18n, { SUPPORTED_LANGUAGES } from '../../src/i18n';

// Noms lisibles des langues
const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 English',
  fr: '🇫🇷 Français',
  ar: '🇸🇦 العربية',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
  ja: '🇯🇵 日本語',
  zh: '🇨🇳 中文',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const currentLanguage = i18n.language;

  // Changer de langue
  async function changeLanguage(lang: string) {
    await i18n.changeLanguage(lang);

    // RTL pour l'arabe
    const isRTL = lang === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  }

  return (
    <ScrollView style={styles.page}>
      {/* Section langue */}
      <Text style={styles.sectionLabel}>{t('settings.language').toUpperCase()}</Text>
      <View style={styles.card}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={styles.langRow}
            onPress={() => changeLanguage(lang)}
          >
            <Text style={styles.langLabel}>{LANGUAGE_LABELS[lang]}</Text>
            {currentLanguage === lang && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Section abonnement */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        {t('settings.subscription').toUpperCase()}
      </Text>
      <View style={styles.card}>
        <View style={styles.planRow}>
          <Text style={styles.planName}>🆓 Gratuit</Text>
          <Text style={styles.planDetail}>1 réseau · 500 suppressions/mois</Text>
        </View>
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Passer à Pro — $4.99/mois →</Text>
        </TouchableOpacity>
      </View>

      {/* Section liens */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>COMPTE</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>{t('settings.privacy')}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkRow, styles.dangerRow]}>
          <Text style={styles.dangerText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 16,
  },
  sectionLabel: {
    color: '#5A5A70',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#13131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3A',
  },
  langLabel: {
    color: '#F8F8FF',
    fontSize: 15,
  },
  checkmark: {
    color: '#6C63FF',
    fontSize: 18,
    fontWeight: '700',
  },
  planRow: {
    padding: 16,
    gap: 4,
  },
  planName: {
    color: '#F8F8FF',
    fontSize: 16,
    fontWeight: '700',
  },
  planDetail: {
    color: '#5A5A70',
    fontSize: 13,
  },
  upgradeBtn: {
    backgroundColor: '#6C63FF',
    margin: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3A',
  },
  linkText: {
    color: '#F8F8FF',
    fontSize: 15,
  },
  arrow: {
    color: '#5A5A70',
    fontSize: 20,
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF4500',
    fontSize: 15,
    fontWeight: '600',
  },
});

