import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../services/api";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    maxDiscountAmount: "",
    minOrderAmount: "",
    usageLimit: "",
    userUsageLimit: "",
    expiresAt: "",
    isActive: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await getAllCoupons();
      setCoupons(response.data.data);
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert BDT values to USD before sending to backend
      const dataToSend = {
        ...formData,
        // For fixed discount type, convert BDT to USD
        discountValue:
          formData.discountType === "fixed"
            ? parseFloat(formData.discountValue) / 110
            : parseFloat(formData.discountValue),
        // Convert min/max amounts from BDT to USD
        minOrderAmount: formData.minOrderAmount
          ? parseFloat(formData.minOrderAmount) / 110
          : null,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount) / 110
          : null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon._id, dataToSend);
      } else {
        await createCoupon(dataToSend);
      }
      await fetchCoupons();
      handleCloseModal();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save coupon");
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discountType: coupon.discountType,
      // For fixed discount, convert USD to BDT for display
      discountValue:
        coupon.discountType === "fixed"
          ? Math.round(coupon.discountValue * 110).toString()
          : coupon.discountValue.toString(),
      // Convert USD to BDT for display
      maxDiscountAmount: coupon.maxDiscountAmount
        ? Math.round(coupon.maxDiscountAmount * 110).toString()
        : "",
      minOrderAmount: coupon.minOrderAmount
        ? Math.round(coupon.minOrderAmount * 110).toString()
        : "",
      usageLimit: coupon.usageLimit?.toString() || "",
      userUsageLimit: coupon.userUsageLimit?.toString() || "",
      expiresAt: new Date(coupon.expiresAt).toISOString().split("T")[0],
      isActive: coupon.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      try {
        await deleteCoupon(id);
        await fetchCoupons();
      } catch (error) {
        alert("Failed to delete coupon");
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      maxDiscountAmount: "",
      minOrderAmount: "",
      usageLimit: "",
      userUsageLimit: "",
      expiresAt: "",
      isActive: true,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (dateString) => {
    return new Date(dateString) < new Date();
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Coupon Management
              </h1>
              <p className="text-gray-600">
                Create and manage discount coupons
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Coupon
          </button>
        </div>
      </div>

      {/* Coupons List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {coupon.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {coupon.name}
                      </div>
                      {coupon.description && (
                        <div className="text-sm text-gray-500">
                          {coupon.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%`
                          : `৳${Math.round(coupon.discountValue * 110)}`}
                      </div>
                      {coupon.maxDiscountAmount && (
                        <div className="text-xs text-gray-500">
                          Max: ৳{Math.round(coupon.maxDiscountAmount * 110)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.usedCount || 0}
                        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm ${isExpired(coupon.expiresAt) ? "text-red-600" : "text-gray-900"}`}
                      >
                        {formatDate(coupon.expiresAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.isActive && !isExpired(coupon.expiresAt)
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {coupon.isActive && !isExpired(coupon.expiresAt)
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCoupon ? "Edit Coupon" : "Add New Coupon"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="SAVE20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coupon Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="20% Off Sale"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Get 20% off on all items"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type *
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({ ...formData, discountType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value *
                {formData.discountType === "percentage" && (
                  <span className="text-gray-500 text-xs ml-1">(in %)</span>
                )}
                {formData.discountType === "fixed" && (
                  <span className="text-gray-500 text-xs ml-1">(in ৳)</span>
                )}
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: e.target.value })
                }
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder={
                  formData.discountType === "percentage"
                    ? "20 (for 20%)"
                    : "100 (for ৳100)"
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.discountType === "percentage"
                  ? "Enter percentage value (e.g., 10 for 10% off)"
                  : "Enter amount in Taka (e.g., 100 for ৳100 off)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Discount Amount
                <span className="text-gray-500 text-xs ml-1">(in ৳)</span>
              </label>
              <input
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: e.target.value,
                  })
                }
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum discount in Taka (optional)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Order Amount
                <span className="text-gray-500 text-xs ml-1">(in ৳)</span>
              </label>
              <input
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minOrderAmount: e.target.value })
                }
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum order amount in Taka (optional)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Usage Limit
              </label>
              <input
                type="number"
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, usageLimit: e.target.value })
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per User Limit
              </label>
              <input
                type="number"
                value={formData.userUsageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, userUsageLimit: e.target.value })
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At *
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) =>
                setFormData({ ...formData, expiresAt: e.target.value })
              }
              required
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
