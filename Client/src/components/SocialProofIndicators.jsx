import { useState, useEffect } from "react";

export default function SocialProofIndicators({ product, className = "" }) {
  const [viewCount, setViewCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);

  useEffect(() => {
    // Generate realistic view counts based on product data
    const baseViews = Math.floor(Math.random() * 50) + 10; // 10-60 views
    const ratingBonus = (product.averageRating || 0) * 5; // Higher rated = more views
    const reviewBonus = (product.totalReviews || 0) * 2; // More reviews = more views

    setViewCount(Math.floor(baseViews + ratingBonus + reviewBonus));

    // Generate purchase counts (lower than views)
    const basePurchases = Math.floor(Math.random() * 15) + 3; // 3-18 purchases
    setPurchaseCount(Math.floor(basePurchases + reviewBonus * 0.5));
  }, [product]);

  const indicators = [];

  // View count indicator
  if (viewCount > 0) {
    indicators.push({
      id: "views",
      icon: "👀",
      text: `${viewCount} people viewed this today`,
      color:
        "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    });
  }

  // Purchase count indicator
  if (purchaseCount > 0) {
    indicators.push({
      id: "purchases",
      icon: "🛒",
      text: `${purchaseCount} people bought this in last 24h`,
      color:
        "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    });
  }

  // Low stock urgency
  if (product.stock > 0 && product.stock <= 5) {
    indicators.push({
      id: "stock",
      icon: "⚡",
      text: `Only ${product.stock} left in stock!`,
      color:
        "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    });
  }

  // High rating indicator
  if (
    (product.averageRating || 0) >= 4.5 &&
    (product.totalReviews || 0) >= 10
  ) {
    indicators.push({
      id: "rating",
      icon: "⭐",
      text: `Highly rated by ${product.totalReviews} customers`,
      color:
        "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    });
  }

  // Recently added indicator
  const createdDate = new Date(product.createdAt);
  const daysSinceCreated = Math.floor(
    (new Date() - createdDate) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceCreated <= 7) {
    indicators.push({
      id: "new",
      icon: "✨",
      text: "New arrival this week",
      color:
        "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    });
  }

  // Trending indicator (high views + recent purchases)
  if (viewCount > 30 && purchaseCount > 10) {
    indicators.push({
      id: "trending",
      icon: "🔥",
      text: "Trending now",
      color:
        "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    });
  }

  if (indicators.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {indicators.slice(0, 2).map(
        (
          indicator, // Show max 2 indicators to avoid clutter
        ) => (
          <div
            key={indicator.id}
            className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border
            ${indicator.color}
            animate-pulse-subtle
          `}
          >
            <span className="text-base">{indicator.icon}</span>
            <span>{indicator.text}</span>
          </div>
        ),
      )}
    </div>
  );
}

// Subtle pulse animation for social proof
export const SocialProofStyles = `
  @keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  .animate-pulse-subtle {
    animation: pulse-subtle 3s ease-in-out infinite;
  }
`;
