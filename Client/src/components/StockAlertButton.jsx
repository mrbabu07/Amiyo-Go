import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { getCurrentUserToken } from "../utils/auth";

export default function StockAlertButton({
  product,
  alertType = "back_in_stock",
}) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceThreshold, setPriceThreshold] = useState("");

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, product._id, alertType]);

  const checkSubscription = async () => {
    try {
      const token = await getCurrentUserToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stock-alerts/my-alerts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const hasAlert = data.data.some(
          (alert) =>
            alert.productId._id === product._id &&
            alert.alertType === alertType &&
            alert.active,
        );
        setIsSubscribed(hasAlert);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      error("Please login to set up alerts");
      return;
    }

    if (alertType === "price_drop" && !priceThreshold) {
      setShowPriceInput(true);
      return;
    }

    setLoading(true);
    try {
      const token = await getCurrentUserToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stock-alerts/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product._id,
            alertType,
            priceThreshold:
              alertType === "price_drop" ? parseFloat(priceThreshold) : null,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        setShowPriceInput(false);
        success(data.message || "Alert set successfully!");
      } else {
        error(data.message || "Failed to set alert");
      }
    } catch (err) {
      console.error("Error subscribing to alert:", err);
      error("Failed to set alert");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const token = await getCurrentUserToken();
      const alertsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/stock-alerts/my-alerts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        const alert = alertsData.data.find(
          (a) =>
            a.productId._id === product._id &&
            a.alertType === alertType &&
            a.active,
        );

        if (alert) {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/stock-alerts/${alert._id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await response.json();

          if (response.ok) {
            setIsSubscribed(false);
            success(data.message || "Alert removed successfully!");
          } else {
            error(data.message || "Failed to remove alert");
          }
        }
      }
    } catch (err) {
      console.error("Error unsubscribing from alert:", err);
      error("Failed to remove alert");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    if (isSubscribed) return "Alert Active ✓";

    switch (alertType) {
      case "back_in_stock":
        return "Notify When Available";
      case "price_drop":
        return "Notify on Price Drop";
      case "low_stock":
        return "Notify on Low Stock";
      default:
        return "Set Alert";
    }
  };

  const getIcon = () => {
    switch (alertType) {
      case "back_in_stock":
        return (
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        );
      case "price_drop":
        return (
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        );
      case "low_stock":
        return (
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (showPriceInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={priceThreshold}
          onChange={(e) => setPriceThreshold(e.target.value)}
          placeholder="Target price"
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          step="0.01"
          min="0"
          max={product.price}
        />
        <button
          onClick={handleSubscribe}
          disabled={loading || !priceThreshold}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set Alert
        </button>
        <button
          onClick={() => setShowPriceInput(false)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
        isSubscribed
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
}
