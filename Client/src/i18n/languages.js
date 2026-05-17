export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "amiyo_go_language";

export const supportedLanguages = [
  {
    code: "en",
    shortLabel: "ENG",
    nativeLabel: "English",
    nameKey: "languages.en",
  },
  {
    code: "bn",
    shortLabel: "বাং",
    nativeLabel: "বাংলা",
    nameKey: "languages.bn",
  },
];

export const normalizeLanguage = (value) => {
  const code = String(value || DEFAULT_LANGUAGE).split("-")[0].toLowerCase();
  return supportedLanguages.some((language) => language.code === code)
    ? code
    : DEFAULT_LANGUAGE;
};

export const getLanguageByCode = (value) =>
  supportedLanguages.find((language) => language.code === normalizeLanguage(value)) ||
  supportedLanguages[0];
