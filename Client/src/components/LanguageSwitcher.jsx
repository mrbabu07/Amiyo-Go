import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { getLanguageByCode, supportedLanguages } from "../i18n/languages";

const LanguageSwitcher = () => {
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
        className="flex items-center space-x-2 rounded-xl p-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        title={t("common.language")}
      >
        <Languages className="h-5 w-5 text-gray-500" />
        <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
          {currentLanguage.shortLabel}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
              <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Languages className="h-4 w-4 text-blue-500" />
                <span>{t("common.language")}</span>
              </p>
            </div>

            <div className="py-1">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`flex w-full items-center space-x-3 px-4 py-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    activeCode?.startsWith(language.code)
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="w-9 text-left text-xs font-bold">{language.shortLabel}</span>
                  <span className="text-sm font-medium">{t(language.nameKey)}</span>
                  {activeCode?.startsWith(language.code) && (
                    <span className="ml-auto text-blue-500">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
