// react-i18next setup: en + es, three namespaces (common/auth/dashboard) per language

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

// use stored preference if valid; otherwise let the browser language detector decide
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
    // fallback lets dashboard/auth components use shared keys (status.*, actions.*) without a prefix
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      // querystring first (?lng=es), then browser, then <html lang>; caches disabled — managed manually below
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
