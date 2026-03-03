// Currency hook - BDT (Bangladeshi Taka)
// Prices are stored in BDT in the database

const BDT_SYMBOL = "৳";

export function useCurrency() {
  const currency = "BDT";

  const formatPrice = (price) => {
    if (!price && price !== 0) return `${BDT_SYMBOL}0`;
    
    // Price is already in BDT, just format it
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Format with comma separators for BDT
    return `${BDT_SYMBOL}${numPrice.toLocaleString('en-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const convertPrice = (price) => {
    // No conversion needed - already in BDT
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  return {
    currency,
    convertPrice,
    formatPrice,
  };
}

export default useCurrency;
