import { Eye, ShieldCheck, ShoppingBag, Star, Zap } from "lucide-react";

const badgeBase =
  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium";

export default function SocialProofIndicators({ product, className = "" }) {
  const socialProof = product?.detail?.socialProof || {};
  const stock = Number(product?.detail?.stock?.stock ?? product?.stock ?? 0);
  const reviewCount = Number(
    product?.detail?.reviewSummary?.totalReviews ??
      product?.reviewCount ??
      product?.totalReviews ??
      0,
  );
  const rating = Number(
    product?.detail?.reviewSummary?.averageRating ??
      product?.averageRating ??
      product?.rating ??
      0,
  );

  const indicators = [];

  if (socialProof.viewingNow > 0) {
    indicators.push({
      id: "viewing",
      icon: Eye,
      text: socialProof.labels?.viewing || `${socialProof.viewingNow} people are viewing this now`,
      color:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    });
  }

  if (socialProof.soldLast24h > 0) {
    indicators.push({
      id: "sold",
      icon: ShoppingBag,
      text: socialProof.labels?.sold24h || `${socialProof.soldLast24h} sold in last 24h`,
      color:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
    });
  }

  if (stock > 0 && stock <= 5) {
    indicators.push({
      id: "stock",
      icon: Zap,
      text: `Only ${stock} left in stock`,
      color:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
    });
  }

  if (rating >= 4.5 && reviewCount >= 10) {
    indicators.push({
      id: "rating",
      icon: Star,
      text: `Highly rated by ${reviewCount} customers`,
      color:
        "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
    });
  }

  if (socialProof.platformGuarantee?.label) {
    indicators.push({
      id: "guarantee",
      icon: ShieldCheck,
      text: socialProof.platformGuarantee.label,
      color:
        "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300",
    });
  }

  if (indicators.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {indicators.slice(0, 4).map((indicator) => {
        const Icon = indicator.icon;
        return (
          <div key={indicator.id} className={`${badgeBase} ${indicator.color}`}>
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{indicator.text}</span>
          </div>
        );
      })}
    </div>
  );
}
