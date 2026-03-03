import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../context/ToastContext";
import { useCurrency } from "../../hooks/useCurrency";
import { auth } from "../../firebase/firebase.config";
import SimpleModal from "../../components/SimpleModal";
import Loading from "../../components/Loading";

const AdminFlashSales = () => {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { formatPrice } = useCurrency();
  const [flashSales, setFlashSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    product: "",
    flashPrice: "",
    startTime: "",
    endTime: "",
    totalStock: "",
    maxPerUser: 5,
  });

  useEffect(() => {
    fetchFlashSales();
    fetchProducts();
  }, []);

  const fetchFlashSales = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        error("Please login to access admin panel");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/flash-sales`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          error("Unauthorized. Please login again.");
          setFlashSales([]);
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch flash sales");
      }

      const data = await response.json();
      setFlashSales(Array.isArray(data) ? data : data.flashSales || []);
    } catch (err) {
      console.error("Error fetching flash sales:", err);
      error("Failed to fetch flash sales");
      setFlashSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products`);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      const productList = data.products || data.data || data;
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = auth.currentUser;
      if (!user) {
        error("Please login to continue");
        return;
      }

      const token = await user.getIdToken();
      const url = editingSale
        ? `${import.meta.env.VITE_API_URL}/flash-sales/${editingSale._id}`
        : `${import.meta.env.VITE_API_URL}/flash-sales`;

      const method = editingSale ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success(editingSale ? "Flash sale updated!" : "Flash sale created!");
        setShowModal(false);
        resetForm();
        fetchFlashSales();
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.message || "Failed to save flash sale");
      }
    } catch (err) {
      console.error("Error saving flash sale:", err);
      error(err.message || "Failed to save flash sale");
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      title: sale.title,
      description: sale.description || "",
      product: sale.product._id,
      flashPrice: sale.flashPrice,
      startTime: new Date(sale.startTime).toISOString().slice(0, 16),
      endTime: new Date(sale.endTime).toISOString().slice(0, 16),
      totalStock: sale.totalStock,
      maxPerUser: sale.maxPerUser,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this flash sale?")) return;

    try {
      const user = auth.currentUser;
      if (!user) {
        error("Please login to continue");
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/flash-sales/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        success("Flash sale deleted!");
        fetchFlashSales();
      }
    } catch (err) {
      console.error("Error deleting flash sale:", err);
      error("Failed to delete flash sale");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      product: "",
      flashPrice: "",
      startTime: "",
      endTime: "",
      totalStock: "",
      maxPerUser: 5,
    });
    setEditingSale(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      upcoming: "bg-blue-100 text-blue-800",
      expired: "bg-gray-100 text-gray-800",
      sold_out: "bg-red-100 text-red-800",
    };
    return badges[status] || badges.expired;
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          ⚡ Flash Sales Management
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
        >
          + Create Flash Sale
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {flashSales.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                      No flash sales yet
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
                      Create your first flash sale to drive urgency and boost
                      sales
                    </p>
                    <button
                      onClick={() => {
                        resetForm();
                        setShowModal(true);
                      }}
                      className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                    >
                      + Create Flash Sale
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              flashSales.map((sale) => (
                <tr key={sale._id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={sale.product?.images?.[0] || "/placeholder.jpg"}
                        alt={sale.title}
                        className="w-12 h-12 rounded object-cover mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {sale.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {sale.product?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice(sale.flashPrice)}
                      </div>
                      <div className="text-gray-500 line-through">
                        {formatPrice(sale.originalPrice)}
                      </div>
                      <div className="text-success-600 dark:text-success-400 font-semibold">
                        -{sale.discountPercentage}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      Start: {new Date(sale.startTime).toLocaleString()}
                    </div>
                    <div>End: {new Date(sale.endTime).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900 dark:text-white">
                      {sale.soldCount}/{sale.totalStock}
                    </div>
                    <div className="text-gray-500">
                      {sale.remainingStock} left
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(sale.status)}`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(sale)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mr-3 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sale._id)}
                      className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SimpleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingSale ? "Edit Flash Sale" : "Create Flash Sale"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product</label>
            <select
              value={formData.product}
              onChange={(e) =>
                setFormData({ ...formData, product: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            >
              <option value="">Select Product</option>
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} - {formatPrice(product.price)}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No products available
                </option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Flash Price (USD - displays as BDT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.flashPrice}
                onChange={(e) =>
                  setFormData({ ...formData, flashPrice: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                placeholder="e.g., 10 (will show as ৳1,100)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Total Stock
              </label>
              <input
                type="number"
                value={formData.totalStock}
                onChange={(e) =>
                  setFormData({ ...formData, totalStock: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max Per User
            </label>
            <input
              type="number"
              value={formData.maxPerUser}
              onChange={(e) =>
                setFormData({ ...formData, maxPerUser: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              min="1"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              {editingSale ? "Update" : "Create"} Flash Sale
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </SimpleModal>
    </div>
  );
};

export default AdminFlashSales;
