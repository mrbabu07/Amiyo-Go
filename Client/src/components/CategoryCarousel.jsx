import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Watch,
} from "lucide-react";
import { getCategories } from "../services/api";

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
  sports: Dumbbell,
  stationery: PencilRuler,
  vegetable: Leaf,
  watch: Watch,
};

const fallbackThemes = [
  "bg-sky-50 text-sky-700 ring-sky-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "bg-lime-50 text-lime-700 ring-lime-100",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
];

function getCategoryIcon(category) {
  const configured = category.icon?.toLowerCase?.().trim();
  if (configured && iconMap[configured]) return iconMap[configured];

  const name = category.name.toLowerCase();
  if (name.includes("men") || name.includes("fashion")) return Shirt;
  if (name.includes("women")) return ShoppingBag;
  if (name.includes("computer") || name.includes("laptop")) return Laptop;
  if (name.includes("phone")) return Smartphone;
  if (name.includes("tv") || name.includes("appliance")) return Monitor;
  if (name.includes("home") || name.includes("living")) return Home;
  if (name.includes("grocery") || name.includes("pet")) return ShoppingBag;
  if (name.includes("homemade") || name.includes("handmade")) return HandHeart;
  if (name.includes("resell") || name.includes("used") || name.includes("pre-owned")) return RotateCcw;
  if (name.includes("fish") || name.includes("seafood")) return Fish;
  if (name.includes("vegetable") || name.includes("fruit") || name.includes("farm")) return Leaf;
  if (name.includes("beauty")) return Sparkles;
  if (name.includes("pharmacy") || name.includes("medicine")) return Pill;
  if (name.includes("health")) return HeartPulse;
  if (name.includes("watch") || name.includes("bag")) return Watch;
  if (name.includes("sport")) return Dumbbell;
  if (name.includes("baby") || name.includes("mother")) return Baby;
  if (name.includes("auto") || name.includes("bike")) return Car;
  if (name.includes("stationery") || name.includes("office") || name.includes("school")) return PencilRuler;
  if (name.includes("book")) return BookOpen;
  if (name.includes("game")) return Gamepad2;
  return Package;
}

export default function CategoryCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        const data = Array.isArray(response.data.data) ? response.data.data : [];
        setCategories(data.filter((category) => category.isActive !== false));
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((category) => !category.parentId)
        .sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name),
        ),
    [categories],
  );

  if (loading) {
    return (
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 h-7 w-36 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-gray-200 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
            {Array.from({ length: 14 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse bg-white" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (sortedCategories.length === 0) return null;

  return (
    <section className="bg-white py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Browse the marketplace by department
            </p>
          </div>
          <Link
            to="/categories"
            className="text-sm font-semibold text-[#1e7098] hover:text-[#15536f]"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-200 shadow-sm sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 dark:border-gray-700 dark:bg-gray-700">
          {sortedCategories.slice(0, 14).map((category, index) => {
            const Icon = getCategoryIcon(category);
            const theme = fallbackThemes[index % fallbackThemes.length];

            return (
              <Link
                key={category._id}
                to={`/category/${category.slug}`}
                className="group flex min-h-32 flex-col items-center justify-center bg-white px-3 py-4 text-center transition hover:z-10 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-800"
              >
                <div
                  className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-105 ${theme}`}
                >
                  {category.image ? (
                    <img
                      src={category.image}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-8 w-8" strokeWidth={1.8} />
                  )}
                </div>
                <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-gray-800 group-hover:text-[#1e7098] dark:text-gray-100">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
