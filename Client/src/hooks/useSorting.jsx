import { useState, useMemo } from "react";

export const useSorting = (items = [], defaultSort = "default") => {
  const [sortBy, setSortBy] = useState(defaultSort);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return items;

    const sorted = [...items];

    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));

      case "price-high":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));

      case "name-asc":
        return sorted.sort((a, b) =>
          (a.title || "").localeCompare(b.title || ""),
        );

      case "name-desc":
        return sorted.sort((a, b) =>
          (b.title || "").localeCompare(a.title || ""),
        );

      case "newest":
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

      case "oldest":
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });

      case "rating-high":
        return sorted.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingB - ratingA;
        });

      case "rating-low":
        return sorted.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingA - ratingB;
        });

      case "popularity":
        return sorted.sort((a, b) => {
          // Sort by total reviews (more reviews = more popular)
          const popularityA = (a.totalReviews || 0) + (a.totalSales || 0);
          const popularityB = (b.totalReviews || 0) + (b.totalSales || 0);
          return popularityB - popularityA;
        });

      case "stock-high":
        return sorted.sort((a, b) => (b.stock || 0) - (a.stock || 0));

      case "stock-low":
        return sorted.sort((a, b) => (a.stock || 0) - (b.stock || 0));

      case "discount":
        return sorted.sort((a, b) => {
          const discountA = a.originalPrice
            ? ((a.originalPrice - a.price) / a.originalPrice) * 100
            : 0;
          const discountB = b.originalPrice
            ? ((b.originalPrice - b.price) / b.originalPrice) * 100
            : 0;
          return discountB - discountA;
        });

      case "default":
      default:
        return sorted; // Return original order
    }
  }, [items, sortBy]);

  return {
    sortedItems,
    sortBy,
    setSortBy,
  };
};

export const sortOptions = [
  { value: "default", label: "Default", icon: "📋" },
  { value: "popularity", label: "Most Popular", icon: "🔥" },
  { value: "newest", label: "Newest First", icon: "✨" },
  { value: "oldest", label: "Oldest First", icon: "📅" },
  { value: "price-low", label: "Price: Low to High", icon: "💰" },
  { value: "price-high", label: "Price: High to Low", icon: "💎" },
  { value: "name-asc", label: "Name: A to Z", icon: "🔤" },
  { value: "name-desc", label: "Name: Z to A", icon: "🔤" },
  { value: "rating-high", label: "Highest Rated", icon: "⭐" },
  { value: "rating-low", label: "Lowest Rated", icon: "⭐" },
  { value: "stock-high", label: "Most in Stock", icon: "📦" },
  { value: "stock-low", label: "Low Stock First", icon: "⚡" },
  { value: "discount", label: "Best Deals", icon: "🏷️" },
];
