import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getLanguageByCode, supportedLanguages } from "../i18n/languages";

const TopBarLanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [buttonRect, setButtonRect] = useState(null);
  const activeCode = i18n.resolvedLanguage || i18n.language;
  const currentLanguage = getLanguageByCode(activeCode);

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((current) => !current)}
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
      </div>

      {isOpen &&
        buttonRect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
            <div
              className="fixed z-[9999] rounded-xl border border-gray-100 bg-white py-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
              style={{
                top: buttonRect.bottom + 8,
                right: window.innerWidth - buttonRect.right,
                minWidth: "160px",
              }}
            >
              <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("common.language")}
                </p>
              </div>

              <div className="py-1">
                {supportedLanguages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => changeLanguage(language.code)}
                    className={`flex w-full items-center space-x-3 px-3 py-2.5 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      activeCode?.startsWith(language.code)
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="w-9 text-left text-xs font-bold">{language.shortLabel}</span>
                    <span className="flex-1 text-left font-medium">
                      {t(language.nameKey)}
                    </span>
                    {activeCode?.startsWith(language.code) && (
                      <span className="text-blue-500">✓</span>
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
