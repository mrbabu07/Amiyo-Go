import {
  Baby,
  BookOpen,
  Car,
  Dumbbell,
  Fish,
  Gamepad2,
  Gem,
  HandHeart,
  HeartPulse,
  Home,
  Laptop,
  Leaf,
  Monitor,
  Package,
  PawPrint,
  PencilRuler,
  Pill,
  RotateCcw,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
  Watch,
} from "lucide-react";

const iconMap = {
  baby: Baby,
  beauty: Sparkles,
  book: BookOpen,
  car: Car,
  electronics: Smartphone,
  fashion: Shirt,
  fish: Fish,
  gaming: Gamepad2,
  grocery: ShoppingBag,
  health: HeartPulse,
  homemade: HandHeart,
  home: Home,
  jewelry: Gem,
  laptop: Laptop,
  monitor: Monitor,
  pet: PawPrint,
  pharmacy: Pill,
  resell: RotateCcw,
  restaurant: UtensilsCrossed,
  sports: Dumbbell,
  stationery: PencilRuler,
  vegetable: Leaf,
  watch: Watch,
};

const categoryThemes = {
  baby: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/60",
  beauty: "bg-pink-50 text-pink-700 ring-pink-100 dark:bg-pink-950/40 dark:text-pink-200 dark:ring-pink-900/60",
  book: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60",
  car: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700",
  electronics: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60",
  fashion: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60",
  fish: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60",
  gaming: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60",
  grocery: "bg-lime-50 text-lime-700 ring-lime-100 dark:bg-lime-950/40 dark:text-lime-200 dark:ring-lime-900/60",
  health: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
  homemade: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
  home: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60",
  jewelry: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:ring-fuchsia-900/60",
  laptop: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60",
  monitor: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60",
  pet: "bg-yellow-50 text-yellow-700 ring-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-200 dark:ring-yellow-900/60",
  pharmacy: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60",
  resell: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900/60",
  restaurant: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60",
  sports: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
  stationery: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60",
  vegetable: "bg-green-50 text-green-700 ring-green-100 dark:bg-green-950/40 dark:text-green-200 dark:ring-green-900/60",
  watch: "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:ring-purple-900/60",
};

const fallbackThemes = [
  "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/60",
  "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60",
  "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
  "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
  "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60",
  "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/60",
  "bg-lime-50 text-lime-700 ring-lime-100 dark:bg-lime-950/40 dark:text-lime-200 dark:ring-lime-900/60",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:ring-fuchsia-900/60",
];

const categoryRules = [
  { key: "restaurant", terms: ["restaurant", "meal", "fast food", "fast-food", "street food", "street-food", "sweets", "bakery", "tea", "coffee"] },
  { key: "homemade", terms: ["homemade", "handmade"] },
  { key: "resell", terms: ["resell", "used", "pre-owned", "resale", "second hand", "second-hand"] },
  { key: "fish", terms: ["fish", "seafood"] },
  { key: "vegetable", terms: ["vegetable", "fruit", "farm fresh", "farm-fresh", "farm"] },
  { key: "book", terms: ["book", "learning"] },
  { key: "stationery", terms: ["stationery", "office", "school", "paper", "art craft", "art-craft"] },
  { key: "pharmacy", terms: ["pharmacy", "medicine", "medical", "first aid", "first-aid", "vitamin"] },
  { key: "beauty", terms: ["beauty", "grooming", "cosmetic"] },
  { key: "health", terms: ["health", "personal care", "personal-health"] },
  { key: "baby", terms: ["baby", "mother", "kids", "children"] },
  { key: "laptop", terms: ["laptop", "computer"] },
  { key: "monitor", terms: ["monitor", "tv", "appliance"] },
  { key: "electronics", terms: ["electronics", "mobile", "phone", "audio", "camera", "gadget"] },
  { key: "home", terms: ["home-lifestyle", "home decor", "home-decor", "furniture", "kitchen", "bath", "cleaning", "living"] },
  { key: "grocery", terms: ["grocery", "groceries", "food cupboard", "food-cupboard", "noodle", "pasta", "spice", "masala", "beverage", "breakfast"] },
  { key: "fashion", terms: ["fashion", "clothing", "wear", "shoes", "accessories"] },
  { key: "sports", terms: ["sport", "fitness", "outdoor"] },
  { key: "car", terms: ["auto", "vehicle", "bike", "car"] },
  { key: "jewelry", terms: ["jewelry", "jewellery", "gem"] },
  { key: "watch", terms: ["watch", "clock"] },
  { key: "gaming", terms: ["game", "gaming"] },
  { key: "pet", terms: ["pet"] },
];

const imageSourcePattern = /^(https?:|data:|blob:|\/|\.\/|\.\.\/)/i;
const imageFilePattern = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;

const normalize = (value) => String(value || "").trim().toLowerCase();

const isImageSource = (value) => {
  const source = String(value || "").trim();
  return imageSourcePattern.test(source) || imageFilePattern.test(source);
};

export function getCategoryImageSource(category = {}) {
  return [category.image, category.imageUrl, category.iconUrl, category.icon].find(isImageSource) || "";
}

export function getCategoryKey(category = {}) {
  const configured = normalize(category.icon);
  if (configured && iconMap[configured]) return configured;

  const text = [category.icon, category.slug, category.name, category.parentName]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  const matched = categoryRules.find((rule) => rule.terms.some((term) => text.includes(term)));
  return matched?.key || "default";
}

export function getCategoryIcon(category = {}) {
  return iconMap[getCategoryKey(category)] || Package;
}

export function getCategoryTheme(category = {}, index = 0) {
  const key = getCategoryKey(category);
  return categoryThemes[key] || fallbackThemes[index % fallbackThemes.length];
}
