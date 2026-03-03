// Format view count for display
export const formatViewCount = (count) => {
  if (!count || count === 0) return "0 views";

  if (count === 1) return "1 view";

  if (count < 1000) {
    return `${count} views`;
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}k views`;
  } else {
    return `${(count / 1000000).toFixed(1)}M views`;
  }
};

// Format price for display in BDT
// Prices are stored in USD in database, converted to BDT for display
const BDT_RATE = 110; // 1 USD = 110 BDT
const BDT_SYMBOL = "৳";

export const formatPrice = (priceInUSD) => {
  if (!priceInUSD && priceInUSD !== 0) return `${BDT_SYMBOL}0`;
  const priceInBDT = priceInUSD * BDT_RATE;
  // Format with comma separators for BDT (no decimals)
  return `${BDT_SYMBOL}${Math.round(priceInBDT).toLocaleString()}`;
};

// Format date for display
export const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};
