import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';

export const supportedLanguages = ['en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const resources = { en: { translation: en } } as const;

function detectLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (supportedLanguages as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : 'en';
}

export const i18n = createInstance();

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export { useTranslation } from 'react-i18next';
