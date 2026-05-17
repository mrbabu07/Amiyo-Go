import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getLanguageByCode, supportedLanguages } from "../i18n/languages";

const SimpleLanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const activeCode = i18n.resolvedLanguage || i18n.language;
  const currentLanguage = getLanguageByCode(activeCode);

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-xs text-white transition-opacity hover:opacity-80"
        title={t("common.language")}
      >
        <span className="font-medium">{currentLanguage.shortLabel}</span>
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-[101] mt-1 min-w-[120px] rounded-lg border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`flex w-full items-center space-x-2 px-3 py-2 text-xs transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  activeCode?.startsWith(language.code)
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="font-medium">{t(language.nameKey)}</span>
                {activeCode?.startsWith(language.code) && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SimpleLanguageSwitcher;
