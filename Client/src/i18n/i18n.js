import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
} from "./languages";

// Import translation files
import enTranslations from "./locales/en.json";
import bnTranslations from "./locales/bn.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  bn: {
    translation: bnTranslations,
  },
};

if (typeof window !== "undefined") {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const legacyLanguage = window.localStorage.getItem("i18nextLng");
  if (!savedLanguage && legacyLanguage) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(legacyLanguage));
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["en", "bn"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    cleanCode: true,
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
