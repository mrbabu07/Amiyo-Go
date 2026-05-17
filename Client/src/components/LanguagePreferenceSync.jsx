import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import { getAccountProfile, updateAccountPreferences } from "../services/api";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
} from "../i18n/languages";

export default function LanguagePreferenceSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const applyingRemotePreference = useRef(false);
  const savedLanguageRef = useRef(normalizeLanguage(i18n.resolvedLanguage || i18n.language));

  useEffect(() => {
    const applyDocumentLanguage = (language) => {
      const normalized = normalizeLanguage(language);
      document.documentElement.lang = normalized;
      document.documentElement.dataset.language = normalized;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    };

    applyDocumentLanguage(i18n.resolvedLanguage || i18n.language);
    const handleLanguageChanged = (language) => applyDocumentLanguage(language);
    i18n.on("languageChanged", handleLanguageChanged);
    return () => i18n.off("languageChanged", handleLanguageChanged);
  }, [i18n]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    getAccountProfile()
      .then((response) => {
        if (cancelled) return;
        const preferredLanguage = normalizeLanguage(
          response.data?.data?.appPreferences?.language,
        );
        const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
        savedLanguageRef.current = preferredLanguage;

        if (preferredLanguage !== currentLanguage) {
          applyingRemotePreference.current = true;
          i18n.changeLanguage(preferredLanguage).finally(() => {
            applyingRemotePreference.current = false;
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [i18n, user]);

  useEffect(() => {
    if (!user) return undefined;

    const handleLanguageChanged = (language) => {
      const normalized = normalizeLanguage(language);
      if (applyingRemotePreference.current || savedLanguageRef.current === normalized) return;

      savedLanguageRef.current = normalized;
      updateAccountPreferences({
        appPreferences: {
          language: normalized,
          currency: "BDT",
        },
      }).catch(() => {});
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => i18n.off("languageChanged", handleLanguageChanged);
  }, [i18n, user]);

  return null;
}
