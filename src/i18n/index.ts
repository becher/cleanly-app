// Configuration i18n — 7 langues supportées
// RTL activé automatiquement pour l'arabe

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// Langue détectée depuis le téléphone
const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';

// Langues supportées
const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar', 'es', 'de', 'ja', 'zh'];

// Si la langue du téléphone est supportée → on l'utilise, sinon anglais
const initialLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
    es: { translation: es },
    de: { translation: de },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React gère déjà l'échappement XSS
  },
});

export default i18n;
export { SUPPORTED_LANGUAGES };

