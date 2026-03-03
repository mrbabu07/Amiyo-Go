import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/api";

export default function LowStockAlert({ threshold = 5 }) {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    fetchLowStockProducts();
  }, [threshold]);

  const fetchLowStockProducts = async () => {
    try {
      const response = await getProducts();
      const products = response.data.data || [];
      setTotalProducts(products.length);

      const lowStock = products.filter(
        (product) => product.stock > 0 && product.stock <= threshold,
      );

      const outOfStock = products.filter(
        (product) => product.stock === 0 || product.stock === undefined,
      );

      setLowStockProducts([...lowStock, ...outOfStock]);
    } catch (error) {
      console.error("Failed to fetch low stock products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed) {
    return null;
  }

  // Show alert if there are low stock products
  if (lowStockProducts.length > 0) {
    const lowStock = lowStockProducts.filter(
      (p) => p.stock > 0 && p.stock <= threshold,
    );
    const outOfStock = lowStockProducts.filter(
      (p) => p.stock === 0 || p.stock === undefined,
    );

    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">
                🚨 Inventory Alert
              </h3>
              <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                {lowStock.length > 0 && (
                  <p className="mb-1">
                    <span className="font-medium">{lowStock.length}</span>{" "}
                    product{lowStock.length > 1 ? "s" : ""} running low on stock
                    (≤{threshold} units)
                  </p>
                )}
                {outOfStock.length > 0 && (
                  <p>
                    <span className="font-medium">{outOfStock.length}</span>{" "}
                    product{outOfStock.length > 1 ? "s" : ""} completely out of
                    stock
                  </p>
                )}
              </div>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={product.image || "/placeholder-product.jpg"}
                        alt={product.title}
                        className="w-8 h-8 object-cover rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48">
                          {product.title}
                        </p>
                        <p
                          className={`text-xs ${product.stock === 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-orange-600 dark:text-orange-400"}`}
                        >
                          {product.stock === 0
                            ? "Out of stock"
                            : `Only ${product.stock} left`}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/admin/products/edit/${product._id}`}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium px-2 py-1 bg-primary-50 dark:bg-primary-900/30 rounded"
                    >
                      Restock
                    </Link>
                  </div>
                ))}

                {lowStockProducts.length > 5 && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    +{lowStockProducts.length - 5} more products need attention
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  to="/admin/inventory"
                  className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Manage Inventory
                </Link>
                <Link
                  to="/admin/products"
                  className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  View Products
                </Link>
              </div>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 p-1"
            title="Dismiss alert"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Show positive message when all products are well-stocked
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-1">
              ✅ Inventory Status: All Good
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              All {totalProducts} products are well-stocked (&gt;{threshold}{" "}
              units). No immediate restocking needed.
            </p>

            <div className="flex gap-2">
              <Link
                to="/admin/inventory"
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Inventory
              </Link>
              <Link
                to="/admin/products"
                className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 text-xs font-medium rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              >
                Manage Products
              </Link>
            </div>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300 p-1"
          title="Dismiss status"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
