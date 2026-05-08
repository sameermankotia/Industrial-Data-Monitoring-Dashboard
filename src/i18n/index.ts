// react-i18next setup. I have two languages (English + Spanish) and three
// namespaces per language so big features get their own bundle in the app.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard.json';

import { storageService } from '@/services/storageService';

// Whenever need to add new language:  Update this list and drop a folder under locales/.
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { common: enCommon, auth: enAuth, dashboard: enDashboard },
  es: { common: esCommon, auth: esAuth, dashboard: esDashboard },
} as const;

// If the user already picked a language earlier, have it. Otherwise let
// the browser language detector decide.
const stored = storageService.getString('language');
const initialLng =
  stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored) ? stored : undefined;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    ns: ['common', 'auth', 'dashboard'],
    defaultNS: 'common',
    // Components scoped to a specific namespace (dashboard/auth) still need
    // shared keys like status.* and actions.*. Falling back to common means
    // unprefixed keys resolve instead of rendering the raw key string.
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      // Try the URL first (?lng=es), then the browser, then <html lang>.
      // No localStorage cache here — we manage that ourselves below so the
      // key is namespaced under our prefix.
      order: ['querystring', 'navigator', 'htmlTag'],
      caches: [],
    },
  });

// Persist the user's choice and update <html lang> for screen readers.
i18n.on('languageChanged', (lng) => {
  storageService.setString('language', lng);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;
