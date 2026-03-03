import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { getCurrentUserToken } from "../utils/auth";
import { useCurrency } from "../hooks/useCurrency";
import Loading from "../components/Loading";

export default function MyAlerts() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
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
        setAlerts(data.data);
      } else {
        error("Failed to fetch alerts");
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
      error("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAlert = async (alertId) => {
    try {
      const token = await getCurrentUserToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/stock-alerts/${alertId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setAlerts(alerts.filter((alert) => alert._id !== alertId));
        success("Alert removed successfully");
      } else {
        error("Failed to remove alert");
      }
    } catch (err) {
      console.error("Error removing alert:", err);
      error("Failed to remove alert");
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case "back_in_stock":
        return "Back in Stock";
      case "price_drop":
        return "Price Drop";
      case "low_stock":
        return "Low Stock Warning";
      default:
        return type;
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case "back_in_stock":
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-600"
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
          </div>
        );
      case "price_drop":
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-600"
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
          </div>
        );
      case "low_stock":
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-orange-600"
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
        );
      default:
        return null;
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Alerts</h1>
        <p className="text-gray-600">
          Manage your product notifications and alerts
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No alerts set
          </h2>
          <p className="text-gray-600 mb-6">
            Set up alerts to get notified about product availability and price
            changes
          </p>
          <Link to="/products" className="btn-primary inline-block">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                {getAlertTypeIcon(alert.alertType)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {alert.productId?.title || "Product"}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-full">
                          {getAlertTypeLabel(alert.alertType)}
                        </span>
                        {alert.notified && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Notified
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveAlert(alert._id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Remove alert"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>
                      Current Price: {formatPrice(alert.productId?.price)}
                    </span>
                    {alert.priceThreshold && (
                      <span>
                        Target Price: {formatPrice(alert.priceThreshold)}
                      </span>
                    )}
                    {alert.productId?.stock !== undefined && (
                      <span>Stock: {alert.productId.stock}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/products/${alert.productId?._id}`}
                      className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                    >
                      View Product →
                    </Link>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-500">
                      Created {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          About Alerts
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>Back in Stock:</strong> Get notified when an out-of-stock
            product becomes available again
          </p>
          <p>
            <strong>Price Drop:</strong> Receive alerts when a product's price
            drops below your target price
          </p>
          <p>
            <strong>Low Stock:</strong> Be warned when a product is running low
            on inventory
          </p>
        </div>
      </div>
    </div>
  );
}
