import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getUserOrders,
  createReturnRequest,
  cancelOrder,
} from "../services/api";
import { createReview } from "../services/reviewApi";
import { uploadToImgBB } from "../services/imageUpload";
import { useCurrency } from "../hooks/useCurrency";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { useNotifications } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import useCart from "../hooks/useCart";
import BackButton from "../components/BackButton";
import OrderTracking from "../components/OrderTracking";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { success, error } = useToast();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnFormData, setReturnFormData] = useState({
    reason: "",
    description: "",
    refundMethod: "",
    refundAccountNumber: "",
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [reorderingItems, setReorderingItems] = useState({});

  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchOrders();
    if (location.state?.orderSuccess) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await getUserOrders();
      setOrders(response.data.data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: {
      color:
        "bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200",
      icon: "⏳",
      description: "Order received and being processed",
    },
    processing: {
      color:
        "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200",
      icon: "🔄",
      description: "Order is being prepared",
    },
    shipped: {
      color:
        "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200",
      icon: "📦",
      description: "Order has been shipped",
    },
    delivered: {
      color:
        "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200",
      icon: "✅",
      description: "Order delivered successfully",
    },
    cancelled: {
      color:
        "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200",
      icon: "❌",
      description: "Order has been cancelled",
    },
  };

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const handleReturnRequest = (order, product) => {
    setSelectedOrder(order);
    setSelectedProduct(product);
    setShowReturnModal(true);
  };

  const handleReviewRequest = (order, product) => {
    setSelectedOrder(order);
    setSelectedProduct(product);
    setShowReviewModal(true);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      const productId = selectedProduct.productId || selectedProduct._id;
      console.log("Submitting review for product:", productId);
      console.log("Selected product:", selectedProduct);

      // Validate productId
      if (!productId || productId.length !== 24) {
        throw new Error("Invalid product ID. Please try again.");
      }

      await createReview({
        productId: productId,
        rating: reviewFormData.rating,
        comment: reviewFormData.comment.trim(),
      });

      setShowReviewModal(false);
      setReviewFormData({ rating: 5, comment: "" });
      success("Review submitted successfully! Thank you for your feedback.", {
        title: "Review Submitted",
      });
    } catch (err) {
      console.error("Review submission error:", err);

      // Handle specific error cases from our purchase verification
      let errorMessage = "Failed to submit review";

      if (err.response?.status === 403) {
        errorMessage =
          err.response?.data?.error ||
          "You must purchase this product before you can review it";
      } else if (err.response?.status === 409) {
        errorMessage = "You have already reviewed this product";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      error(errorMessage, {
        title: "Review Failed",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedProduct(null);
    setSelectedOrder(null);
    setReviewFormData({ rating: 5, comment: "" });
  };

  const submitReturnRequest = async (e) => {
    e.preventDefault();
    setUploadingImages(true);

    try {
      // Upload images to ImgBB if any are selected
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        console.log("Uploading images...");
        const uploadPromises = selectedFiles.map((file) => uploadToImgBB(file));
        imageUrls = await Promise.all(uploadPromises);
        console.log("Images uploaded:", imageUrls);
      }

      await createReturnRequest({
        orderId: selectedOrder._id,
        productId: selectedProduct.productId || selectedProduct._id,
        reason: returnFormData.reason,
        description: returnFormData.description,
        images: imageUrls,
        refundMethod: returnFormData.refundMethod,
        refundAccountNumber: returnFormData.refundAccountNumber,
      });

      setShowReturnModal(false);
      setReturnFormData({
        reason: "",
        description: "",
        refundMethod: "",
        refundAccountNumber: "",
      });
      setSelectedFiles([]);

      // Add notification for return request
      addNotification({
        type: "return",
        title: "Return Request Submitted",
        message:
          "Your return request has been submitted and is under review by our team.",
        link: "/returns",
      });

      success(
        "Return request submitted successfully! You can track it in the Returns section.",
        {
          title: "Return Request Submitted",
        },
      );

      // Navigate to returns page
      navigate("/returns");
    } catch (err) {
      error(err.response?.data?.error || "Failed to submit return request", {
        title: "Return Request Failed",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedProduct(null);
    setSelectedOrder(null);
    setReturnFormData({
      reason: "",
      description: "",
      refundMethod: "",
      refundAccountNumber: "",
    });
    setSelectedFiles([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Check if order is eligible for returns (delivered within 7 days)
  const isReturnEligible = (order) => {
    if (order.status !== "delivered") return false;
    const deliveryDate = new Date(order.updatedAt || order.createdAt);
    const daysSinceDelivery =
      (new Date() - deliveryDate) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= 7;
  };

  // Utility function to safely render color
  const renderColor = (color) => {
    if (!color) return null;
    if (typeof color === "string") return color;
    if (typeof color === "object" && color.name) return color.name;
    return "Unknown Color";
  };

  // Quick Reorder functionality
  const handleQuickReorder = async (item, orderId) => {
    const itemKey = `${orderId}-${item.productId || item._id}`;
    setReorderingItems((prev) => ({ ...prev, [itemKey]: true }));

    try {
      // Add item to cart with same specifications
      await addToCart(
        {
          _id: item.productId || item._id,
          title: item.title,
          price: item.price,
          image: item.image,
          stock: 999, // Assume in stock for reorder
        },
        item.quantity,
        item.image,
        item.selectedSize,
        item.selectedColor,
      );

      success(`${item.title} added to cart!`, {
        title: "Quick Reorder Successful",
      });
    } catch (err) {
      error("Failed to add item to cart. Please try again.", {
        title: "Reorder Failed",
      });
    } finally {
      setReorderingItems((prev) => ({ ...prev, [itemKey]: false }));
    }
  };

  // Reorder entire order - go to checkout
  const handleReorderEntireOrder = async (order) => {
    setReorderingItems((prev) => ({ ...prev, [order._id]: true }));

    try {
      let successCount = 0;
      for (const item of order.products) {
        try {
          await addToCart(
            {
              _id: item.productId || item._id,
              title: item.title,
              price: item.price,
              image: item.image,
              stock: 999, // Assume in stock for reorder
            },
            item.quantity,
            item.image,
            item.selectedSize,
            item.selectedColor,
          );
          successCount++;
        } catch (itemError) {
          console.error(`Failed to add ${item.title} to cart:`, itemError);
        }
      }

      if (successCount === order.products.length) {
        success(`All ${successCount} items added to cart!`, {
          title: "Order Reordered Successfully",
        });
        // Navigate to checkout
        navigate("/checkout");
      } else if (successCount > 0) {
        success(
          `${successCount} of ${order.products.length} items added to cart`,
          {
            title: "Partial Reorder Successful",
          },
        );
        // Navigate to checkout
        navigate("/checkout");
      } else {
        error("Failed to add any items to cart", {
          title: "Reorder Failed",
        });
      }
    } catch (err) {
      error("Failed to reorder items. Please try again.", {
        title: "Reorder Failed",
      });
    } finally {
      setReorderingItems((prev) => ({ ...prev, [order._id]: false }));
    }
  };

  // Cancel order (within 30 minutes)
  const handleCancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      await cancelOrder(orderId);
      success("Order cancelled successfully", {
        title: "Order Cancelled",
      });
      // Refresh orders
      fetchOrders();
    } catch (err) {
      error(err.response?.data?.error || "Failed to cancel order", {
        title: "Cancellation Failed",
      });
    }
  };

  // Check if order can be cancelled (within 30 minutes and pending)
  const canCancelOrder = (order) => {
    if (order.status !== "pending") return false;

    const createdAt = new Date(order.createdAt);
    const canCancelUntil = order.canCancelUntil
      ? new Date(order.canCancelUntil)
      : new Date(createdAt.getTime() + 30 * 60 * 1000);
    const now = new Date();

    return now < canCancelUntil;
  };

  if (loading) return <Loading />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <BackButton />
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg animate-slide-up">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="font-semibold">Order Placed Successfully!</p>
              <p className="text-sm opacity-90">
                You'll receive updates via SMS/Email
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Home"
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  My Orders
                </h1>
                <p className="text-gray-600 mt-1">
                  Track and manage your orders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/returns"
                className="px-4 py-2 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2"
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                My Returns
              </Link>
              <Link to="/" className="btn-primary flex items-center gap-2">
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
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border p-2 mb-8 flex flex-wrap gap-2">
          {[
            "all",
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                filter === status
                  ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <span className="ml-2 text-xs opacity-75">
                  ({orders.filter((o) => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === "all" ? "No orders yet" : `No ${filter} orders`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "Start shopping to see your orders here"
                : "Try selecting a different filter"}
            </p>
            <Link to="/" className="btn-primary inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all overflow-hidden"
              >
                {/* Order Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Order ID:</span>
                        <span className="font-mono font-bold text-gray-900 bg-white px-3 py-1 rounded-lg">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${statusConfig[order.status]?.color}`}
                      >
                        <span className="text-lg">
                          {statusConfig[order.status]?.icon}
                        </span>
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Order Content */}
                <div className="p-6">
                  {/* Status Description */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      📋 {statusConfig[order.status]?.description}
                    </p>
                  </div>

                  {/* Order Tracking */}
                  <div className="mb-6">
                    <OrderTracking
                      orderId={order._id}
                      currentStatus={order.status}
                      orderDate={order.createdAt}
                      estimatedDelivery={order.estimatedDelivery}
                    />
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4 mb-6">
                    {order.products.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>Qty: {item.quantity}</span>
                            {item.selectedSize && (
                              <span>Size: {item.selectedSize}</span>
                            )}
                            {item.selectedColor && (
                              <span>
                                Color: {renderColor(item.selectedColor)}
                              </span>
                            )}
                            <span>{formatPrice(item.price)} each</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-bold text-gray-900">
                            {formatPrice(
                              (item.price || 0) * (item.quantity || 0),
                            )}
                          </p>

                          {/* Quick Reorder Button */}
                          <button
                            onClick={() => handleQuickReorder(item, order._id)}
                            disabled={
                              reorderingItems[
                                `${order._id}-${item.productId || item._id}`
                              ]
                            }
                            className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reorderingItems[
                              `${order._id}-${item.productId || item._id}`
                            ] ? (
                              <>
                                <svg
                                  className="w-3 h-3 animate-spin"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15"
                                  />
                                </svg>
                                Adding...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15"
                                  />
                                </svg>
                                Reorder
                              </>
                            )}
                          </button>

                          {/* Action Buttons for Delivered Orders */}
                          {order.status === "delivered" && (
                            <div className="flex gap-2">
                              {/* Return Button */}
                              {isReturnEligible(order) && (
                                <button
                                  onClick={() =>
                                    handleReturnRequest(order, item)
                                  }
                                  className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                    />
                                  </svg>
                                  Return
                                </button>
                              )}
                              {/* Review Button */}
                              <button
                                onClick={() => handleReviewRequest(order, item)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                  />
                                </svg>
                                Review
                              </button>
                            </div>
                          )}
                          {!isReturnEligible(order) &&
                            order.status === "delivered" && (
                              <span className="text-xs text-gray-400">
                                Return period expired
                              </span>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment & Delivery Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Payment Method */}
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
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
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        Payment Method
                      </h4>
                      <p className="text-sm text-green-700 capitalize">
                        {order.paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : order.paymentMethod}
                      </p>
                    </div>

                    {/* Delivery Address */}
                    {order.shippingInfo && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
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
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          Delivery Address
                        </h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p className="font-medium">
                            {order.shippingInfo.name}
                          </p>
                          <p>{order.shippingInfo.phone}</p>
                          <p>{order.shippingInfo.address}</p>
                          <p>
                            {order.shippingInfo.area}, {order.shippingInfo.city}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
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
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"
                          />
                        </svg>
                        Special Instructions
                      </h4>
                      <p className="text-sm text-purple-700">
                        {order.specialInstructions}
                      </p>
                    </div>
                  )}

                  {/* Order Total */}
                  <div className="border-t pt-6">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-gray-600">
                        <span>
                          Subtotal (
                          {order.products.reduce(
                            (sum, item) => sum + item.quantity,
                            0,
                          )}{" "}
                          items)
                        </span>
                        <span>
                          {formatPrice(order.subtotal || order.total || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Delivery Charge</span>
                        <span
                          className={
                            (order.deliveryCharge || 0) === 0
                              ? "text-green-600 font-medium"
                              : ""
                          }
                        >
                          {(order.deliveryCharge || 0) === 0
                            ? "FREE"
                            : formatPrice(order.deliveryCharge)}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between text-xl font-bold">
                        <span>Total Paid</span>
                        <span className="text-primary-600">
                          {formatPrice(order.total || 0)}
                        </span>
                      </div>

                      {/* Reorder Entire Order Button */}
                      <div className="border-t pt-3 space-y-2">
                        {/* Cancel Order Button (if within 30 min and pending) */}
                        {canCancelOrder(order) && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Cancel Order (within 30 min)
                          </button>
                        )}

                        <button
                          onClick={() => handleReorderEntireOrder(order)}
                          disabled={reorderingItems[order._id]}
                          className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reorderingItems[order._id] ? (
                            <>
                              <svg
                                className="w-5 h-5 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15"
                                />
                              </svg>
                              Adding to Cart...
                            </>
                          ) : (
                            <>
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
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15"
                                />
                              </svg>
                              Reorder Entire Order
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Request Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={closeReturnModal}
        title="Request Return"
      >
        {selectedProduct && (
          <div className="space-y-4">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Product Details
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedProduct.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    Qty: {selectedProduct.quantity} •{" "}
                    {formatPrice(selectedProduct.price)}
                  </p>
                  {selectedProduct.selectedSize && (
                    <p className="text-sm text-gray-600">
                      Size: {selectedProduct.selectedSize}
                    </p>
                  )}
                  {selectedProduct.selectedColor && (
                    <p className="text-sm text-gray-600">
                      Color: {renderColor(selectedProduct.selectedColor)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Return Form */}
            <form onSubmit={submitReturnRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Reason *
                </label>
                <select
                  value={returnFormData.reason}
                  onChange={(e) =>
                    setReturnFormData({
                      ...returnFormData,
                      reason: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">Select a reason</option>
                  <option value="Defective Product">Defective Product</option>
                  <option value="Wrong Item Received">
                    Wrong Item Received
                  </option>
                  <option value="Size/Fit Issues">Size/Fit Issues</option>
                  <option value="Not as Described">Not as Described</option>
                  <option value="Damaged in Shipping">
                    Damaged in Shipping
                  </option>
                  <option value="Changed Mind">Changed Mind</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={returnFormData.description}
                  onChange={(e) =>
                    setReturnFormData({
                      ...returnFormData,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="Please provide additional details about your return request..."
                />
              </div>

              {/* Refund Method Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Refund Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Method *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          returnFormData.refundMethod === "bkash"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="refundMethod"
                          value="bkash"
                          checked={returnFormData.refundMethod === "bkash"}
                          onChange={(e) =>
                            setReturnFormData({
                              ...returnFormData,
                              refundMethod: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4 text-primary-500"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-semibold text-gray-900">
                            bKash
                          </span>
                          <p className="text-xs text-gray-500">
                            Mobile Banking
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          returnFormData.refundMethod === "nagad"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="refundMethod"
                          value="nagad"
                          checked={returnFormData.refundMethod === "nagad"}
                          onChange={(e) =>
                            setReturnFormData({
                              ...returnFormData,
                              refundMethod: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4 text-primary-500"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Nagad
                          </span>
                          <p className="text-xs text-gray-500">
                            Mobile Banking
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          returnFormData.refundMethod === "rocket"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="refundMethod"
                          value="rocket"
                          checked={returnFormData.refundMethod === "rocket"}
                          onChange={(e) =>
                            setReturnFormData({
                              ...returnFormData,
                              refundMethod: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4 text-primary-500"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Rocket
                          </span>
                          <p className="text-xs text-gray-500">DBBL Mobile</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          returnFormData.refundMethod === "upay"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="refundMethod"
                          value="upay"
                          checked={returnFormData.refundMethod === "upay"}
                          onChange={(e) =>
                            setReturnFormData({
                              ...returnFormData,
                              refundMethod: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4 text-primary-500"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Upay
                          </span>
                          <p className="text-xs text-gray-500">
                            Mobile Banking
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="tel"
                      value={returnFormData.refundAccountNumber}
                      onChange={(e) =>
                        setReturnFormData({
                          ...returnFormData,
                          refundAccountNumber: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="01521721946"
                      pattern="[0-9]{11}"
                      title="Please enter a valid 11-digit mobile number"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your{" "}
                      {returnFormData.refundMethod
                        ? returnFormData.refundMethod.charAt(0).toUpperCase() +
                          returnFormData.refundMethod.slice(1)
                        : "mobile banking"}{" "}
                      account number (11 digits)
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
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
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Important
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Please ensure the account number is correct. Refunds
                          will be processed to this account once your return is
                          approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images (Optional)
                </label>
                <div className="space-y-3">
                  {/* File Input */}
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-4 text-gray-500"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 16"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG or JPEG (MAX. 5 images)
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  {/* Selected Images Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {selectedFiles.length} image
                      {selectedFiles.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Return Policy:</strong> Items can be returned within 7
                  days of delivery. Products must be in original condition with
                  tags attached.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingImages ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading Images...
                    </>
                  ) : (
                    "Submit Return Request"
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeReturnModal}
                  disabled={uploadingImages}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={closeReviewModal}
        title="Write a Review"
      >
        {selectedProduct && (
          <div className="space-y-4">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Product Details
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedProduct.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={submitReview} className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setReviewFormData({ ...reviewFormData, rating: star })
                      }
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-10 h-10 ${
                          star <= reviewFormData.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {reviewFormData.rating} star
                  {reviewFormData.rating !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Review *
                </label>
                <textarea
                  value={reviewFormData.comment}
                  onChange={(e) =>
                    setReviewFormData({
                      ...reviewFormData,
                      comment: e.target.value,
                    })
                  }
                  rows="4"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  placeholder="Share your experience with this product..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 Your review will help other customers make informed
                  decisions. Please be honest and constructive.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={submittingReview}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
