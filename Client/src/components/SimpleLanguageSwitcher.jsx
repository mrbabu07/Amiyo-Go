import { useState } from "react";
import { useTranslation } from "react-i18next";

const SimpleLanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "en", name: "ENG", fullName: "English", flag: "🇺🇸" },
    { code: "bn", name: "বাং", fullName: "বাংলা", flag: "🇧🇩" },
    { code: "hi", name: "हिं", fullName: "हिन्दी", flag: "🇮🇳" },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 hover:opacity-80 transition-opacity text-xs text-white"
        title={t("common.language")}
      >
        <span className="text-sm">{currentLanguage.flag}</span>
        <span className="font-medium">{currentLanguage.name}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />

          {/* Simple Dropdown */}
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-[101] min-w-[120px]">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`flex items-center space-x-2 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-xs ${
                  i18n.language === language.code
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="text-sm">{language.flag}</span>
                <span className="font-medium">{language.fullName}</span>
                {i18n.language === language.code && (
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
