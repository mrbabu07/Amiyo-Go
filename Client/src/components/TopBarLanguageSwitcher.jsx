import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

const TopBarLanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [buttonRect, setButtonRect] = useState(null);

  const languages = [
    { code: "en", name: "ENG", fullName: t("languages.en"), flag: "🇺🇸" },
    { code: "bn", name: "বাং", fullName: t("languages.bn"), flag: "🇧🇩" },
    { code: "hi", name: "हिं", fullName: t("languages.hi"), flag: "🇮🇳" },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
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
      </div>

      {isOpen &&
        buttonRect &&
        createPortal(
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[9998]" onClick={closeDropdown} />

            {/* Dropdown */}
            <div
              className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-[9999] animate-fade-in"
              style={{
                top: buttonRect.bottom + 8,
                right: window.innerWidth - buttonRect.right,
                minWidth: "160px",
              }}
            >
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t("common.language")}
                </p>
              </div>

              <div className="py-1">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => changeLanguage(language.code)}
                    className={`flex items-center space-x-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm ${
                      i18n.language === language.code
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="font-medium flex-1 text-left">
                      {language.fullName}
                    </span>
                    {i18n.language === language.code && (
                      <svg
                        className="w-4 h-4 text-blue-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default TopBarLanguageSwitcher;
