import { useTranslation } from "react-i18next";

// Currency hook - BDT (Bangladeshi Taka)
// Prices are stored in BDT in the database.
const BDT_SYMBOL = "৳";

export function useCurrency() {
  const { i18n } = useTranslation();
  const currency = "BDT";
  const locale = (i18n.resolvedLanguage || i18n.language || "en").startsWith("bn")
    ? "bn-BD"
    : "en-BD";

  const formatPrice = (price) => {
    if (!price && price !== 0) return `${BDT_SYMBOL}0`;

    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return `${BDT_SYMBOL}${numPrice.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const convertPrice = (price) =>
    typeof price === "string" ? parseFloat(price) : price;

  return {
    currency,
    convertPrice,
    formatPrice,
  };
}

export default useCurrency;
