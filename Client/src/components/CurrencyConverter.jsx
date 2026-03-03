import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CURRENCIES = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", flag: "🇧🇩" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
];

export default function CurrencyConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    const saved = localStorage.getItem("selectedCurrency");
    // Default to BDT (index 0) if no saved currency
    return saved ? JSON.parse(saved) : CURRENCIES[0];
  });
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedCurrency", JSON.stringify(selectedCurrency));
    // Dispatch custom event for other components to listen
    window.dispatchEvent(
      new CustomEvent("currencyChange", {
        detail: {
          currency: selectedCurrency.code,
          rates: exchangeRates,
        },
      }),
    );
  }, [selectedCurrency, exchangeRates]);

  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      // Using a free API for exchange rates
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD",
      );
      const data = await response.json();
      setExchangeRates(data.rates);
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      // Fallback rates if API fails
      setExchangeRates({
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        BDT: 110,
        INR: 83,
        JPY: 149,
        CNY: 7.24,
        AUD: 1.53,
        CAD: 1.36,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (currency) => {
    setSelectedCurrency(currency);
    setIsOpen(false);
  };

  return (
    <div className="relative z-[100]">
      {/* Currency Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Change Currency"
      >
        <span className="text-lg">{selectedCurrency.flag}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {selectedCurrency.code}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Select Currency
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Prices will be converted automatically
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {CURRENCIES.map((currency) => {
                  const isSelected = selectedCurrency.code === currency.code;
                  const rate = exchangeRates[currency.code] || 1;

                  return (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencyChange(currency)}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        isSelected ? "bg-primary-50 dark:bg-primary-900/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{currency.flag}</span>
                        <div className="text-left">
                          <p
                            className={`font-medium ${
                              isSelected
                                ? "text-primary-600 dark:text-primary-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {currency.code}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currency.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!loading && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {rate.toFixed(2)}
                          </span>
                        )}
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-primary-600 dark:text-primary-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {loading && (
                <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Updating rates...
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook to use currency conversion
export function useCurrency() {
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem("selectedCurrency");
    return saved ? JSON.parse(saved) : CURRENCIES[0];
  });

  const [exchangeRates, setExchangeRates] = useState({});

  useEffect(() => {
    const handleCurrencyChange = (event) => {
      // Update currency from localStorage when it changes
      const saved = localStorage.getItem("selectedCurrency");
      if (saved) {
        setCurrency(JSON.parse(saved));
      }
      if (event.detail?.rates) {
        setExchangeRates(event.detail.rates);
      }
    };

    window.addEventListener("currencyChange", handleCurrencyChange);

    // Fetch exchange rates
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((res) => res.json())
      .then((data) => setExchangeRates(data.rates))
      .catch(() => {
        setExchangeRates({
          USD: 1,
          EUR: 0.92,
          GBP: 0.79,
          BDT: 110,
          INR: 83,
          JPY: 149,
          CNY: 7.24,
          AUD: 1.53,
          CAD: 1.36,
        });
      });

    return () => {
      window.removeEventListener("currencyChange", handleCurrencyChange);
    };
  }, []);

  const convertPrice = (priceInUSD) => {
    const rate = exchangeRates[currency.code] || 1;
    return (priceInUSD * rate).toFixed(2);
  };

  const formatPrice = (priceInUSD) => {
    if (!priceInUSD && priceInUSD !== 0) return `${currency.symbol}0.00`;
    const converted = convertPrice(priceInUSD);
    return `${currency.symbol}${converted}`;
  };

  return {
    currency,
    convertPrice,
    formatPrice,
    exchangeRates,
  };
}
