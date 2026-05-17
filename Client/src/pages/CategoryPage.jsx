import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getCategories, getProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import { CategoryPageSkeleton } from "../components/Skeleton";
import SortDropdown from "../components/SortDropdown";
import { useSorting } from "../hooks/useSorting";
import { useCurrency } from "../hooks/useCurrency";

const fallbackHero =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop";

export default function CategoryPage() {
  const { category } = useParams();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const { sortedItems: sortedProducts, sortBy, setSortBy } = useSorting(products, "default");

  const isAllCategories = location.pathname === "/categories";
  const isAllProducts = location.pathname === "/products" || (!category && !isAllCategories);
  const currentSlug = category || null;

  const categoryTree = useMemo(() => {
    const active = categories.filter((cat) => cat.isActive !== false);
    const byParent = active.reduce((acc, cat) => {
      const key = cat.parentId ? cat.parentId.toString() : "root";
      acc[key] = [...(acc[key] || []), cat];
      return acc;
    }, {});

    Object.values(byParent).forEach((items) =>
      items.sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0) ||
          a.name.localeCompare(b.name),
      ),
    );

    const roots = (byParent.root || []).map((root) => ({
      ...root,
      children: byParent[root._id.toString()] || [],
      grandchildrenByChild: (byParent[root._id.toString()] || []).reduce(
        (acc, child) => ({
          ...acc,
          [child._id.toString()]: byParent[child._id.toString()] || [],
        }),
        {},
      ),
    }));

    return roots;
  }, [categories]);

  const pageInfo = selectedCategory
    ? {
        name: selectedCategory.name,
        description: selectedCategory.description || `Browse ${selectedCategory.name}`,
        image: selectedCategory.image || fallbackHero,
      }
    : isAllCategories
      ? {
          name: "All Categories",
          description: "Browse departments, sections, and product types",
          image: fallbackHero,
        }
      : isAllProducts
        ? {
            name: "All Products",
            description: "Discover our complete collection",
            image: fallbackHero,
          }
        : {
            name: "Products",
            description: "Browse our collection",
            image: fallbackHero,
          };

  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      try {
        const categoriesResponse = await getCategories();
        const allCategories = categoriesResponse.data.data || [];
        setCategories(allCategories);

        if (isAllCategories) {
          setProducts([]);
          setSelectedCategory(null);
          return;
        }

        let categoryId = null;
        if (currentSlug && !isAllProducts) {
          const matched = allCategories.find((cat) => {
            const categoryId = cat._id?.toString?.() || String(cat._id || "");
            return cat.slug === currentSlug || categoryId === currentSlug;
          });
          setSelectedCategory(matched || null);
          if (!matched) {
            setProducts([]);
            return;
          }
          categoryId = matched?._id || null;
        } else {
          setSelectedCategory(null);
        }

        const response = await getProducts(categoryId ? { category: categoryId } : {});
        setProducts(response.data.data || []);
      } catch (error) {
        console.error("Failed to load category page:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [currentSlug, isAllCategories, isAllProducts, location.pathname]);

  const childCategories = selectedCategory
    ? categories.filter((cat) => cat.parentId && cat.parentId.toString() === selectedCategory._id.toString())
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={pageInfo.image} alt={pageInfo.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <nav className="flex items-center space-x-2 text-sm text-gray-300 mb-4">
              <Link to="/" className="hover:text-white transition">Home</Link>
              <span>/</span>
              <span className="text-white">{pageInfo.name}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{pageInfo.name}</h1>
            <p className="text-lg text-gray-200">{pageInfo.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <CategoryPageSkeleton />
        ) : isAllCategories ? (
          <div className="space-y-6">
            {categoryTree.map((root) => (
              <section key={root._id} className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <Link to={`/category/${root.slug}`} className="text-xl font-bold text-gray-900 hover:text-primary-600 dark:text-white">
                      {root.name}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {root.description || `Shop all ${root.name}`}
                    </p>
                  </div>
                  <Link to={`/category/${root.slug}`} className="text-sm font-semibold text-primary-600">Shop all</Link>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {(root.children.length > 0 ? root.children : [root]).map((child) => (
                    <div key={child._id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <Link to={`/category/${child.slug}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white">
                        {child.name}
                      </Link>
                      <div className="mt-3 space-y-2">
                        {(root.grandchildrenByChild[child._id.toString()] || []).map((leaf) => (
                          <Link key={leaf._id} to={`/category/${leaf.slug}`} className="block text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400">
                            {leaf.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <>
            {childCategories.length > 0 && (
              <div className="mb-8 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Browse {selectedCategory.name}</h2>
                  <Link to="/categories" className="text-sm font-semibold text-primary-600">All categories</Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {childCategories.map((child) => (
                    <div key={child._id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <Link to={`/category/${child.slug}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white">
                        {child.name}
                      </Link>
                      <div className="mt-3 space-y-2">
                        {categories
                          .filter((cat) => cat.parentId && cat.parentId.toString() === child._id.toString())
                          .slice(0, 8)
                          .map((leaf) => (
                            <Link key={leaf._id} to={`/category/${leaf.slug}`} className="block text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400">
                              {leaf.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">{products.length}</span> products found
              </p>
              <div className="flex items-center gap-4">
                <SortDropdown value={sortBy} onChange={setSortBy} className="min-w-[200px]" />
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <button onClick={() => setViewMode("grid")} className={`px-3 py-2 text-sm ${viewMode === "grid" ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600"}`}>Grid</button>
                  <button onClick={() => setViewMode("list")} className={`px-3 py-2 text-sm ${viewMode === "list" ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600"}`}>List</button>
                </div>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">We couldn't find any products in this category.</p>
                <Link to="/" className="btn-primary inline-block">Continue Shopping</Link>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProducts.map((product) => (
                  <Link key={product._id} to={`/product/${product._id}`} className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group">
                    <div className="w-48 h-48 flex-shrink-0 overflow-hidden">
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition mb-2">{product.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{product.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-2xl font-bold text-primary-500">{formatPrice(product.price)}</span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
