// Configuration i18n — 7 langues supportées
// RTL activé automatiquement pour l'arabe

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// Langue par défaut
const initialLanguage = 'fr';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar', 'es', 'de', 'ja', 'zh'];

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
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export { SUPPORTED_LANGUAGES };
