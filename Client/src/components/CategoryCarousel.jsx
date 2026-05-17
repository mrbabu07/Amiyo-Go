import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../services/api";
import { getCategoryIcon, getCategoryImageSource, getCategoryTheme } from "../utils/categoryVisuals";

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
            const imageSource = getCategoryImageSource(category);
            const theme = getCategoryTheme(category, index);

            return (
              <Link
                key={category._id}
                to={`/category/${category.slug}`}
                className="group flex min-h-32 flex-col items-center justify-center bg-white px-3 py-4 text-center transition hover:z-10 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-800"
              >
                <div
                  className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-105 ${theme}`}
                >
                  {imageSource ? (
                    <img
                      src={imageSource}
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
