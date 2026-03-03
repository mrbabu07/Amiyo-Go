export default function ProductBadge({ product }) {
  const getBadges = () => {
    const badges = [];
    const now = new Date();
    const createdAt = new Date(product.createdAt);
    const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);

    // New badge (products created within 7 days)
    if (daysSinceCreated <= 7) {
      badges.push({
        text: "New",
        className: "bg-green-500 text-white",
        icon: "✨",
      });
    }

    // Low stock badge
    if (product.stock > 0 && product.stock <= 5) {
      badges.push({
        text: `Only ${product.stock} left`,
        className: "bg-orange-500 text-white",
        icon: "⚡",
      });
    }

    // Out of stock badge
    if (product.stock === 0) {
      badges.push({
        text: "Out of Stock",
        className: "bg-red-500 text-white",
        icon: "❌",
      });
    }

    // Sale badge (if product has discount - you can add discount field to product model)
    if (product.originalPrice && product.originalPrice > product.price) {
      const discount = Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      );
      badges.push({
        text: `${discount}% OFF`,
        className: "bg-red-500 text-white",
        icon: "🔥",
      });
    }

    // Hot badge (if product has high rating and many reviews)
    if (product.averageRating >= 4.5 && product.totalReviews >= 10) {
      badges.push({
        text: "Hot",
        className: "bg-pink-500 text-white",
        icon: "🔥",
      });
    }

    return badges;
  };

  const badges = getBadges();

  if (badges.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
      {badges.slice(0, 2).map((badge, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${badge.className}`}
        >
          <span>{badge.icon}</span>
          {badge.text}
        </span>
      ))}
    </div>
  );
}
