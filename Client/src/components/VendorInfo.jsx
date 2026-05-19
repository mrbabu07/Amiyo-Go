import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Store } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function VendorInfo({ vendorId, productId }) {
  const { user } = useAuth();
  const { isShopDirectoryVisible } = usePlatformConfig();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Convert vendorId to string if it's an ObjectId object
  const vendorIdString = typeof vendorId === 'object' && vendorId?.$oid 
    ? vendorId.$oid 
    : typeof vendorId === 'object' && vendorId?._id
    ? vendorId._id
    : vendorId;

  useEffect(() => {
    if (vendorIdString) {
      fetchVendorInfo();
    }
  }, [vendorIdString]);

  const fetchVendorInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors/${vendorIdString}/public`);
      setVendor(response.data.data);
    } catch (error) {
      console.error("Failed to fetch vendor info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      alert("Please login to chat with vendor");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const token = await user.getIdToken();
      await axios.post(
        `${API_URL}/vendor-chat/start`,
        {
          vendorId: vendorIdString,
          productId,
          initialMessage: message,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Message sent! Check your messages to continue the conversation.");
      setShowChatModal(false);
      setMessage("");
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {vendor.logo && (
              <img
                src={vendor.logo}
                alt={vendor.shopName}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vendor.shopName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    vendor.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {vendor.status === "approved" ? "✓ Verified" : vendor.status}
                </span>
                {vendor.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {vendor.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {vendor.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {vendor.totalProducts > 0 && (
            <div>
              <span className="text-gray-500">Products:</span>
              <span className="ml-2 font-medium text-gray-900">
                {vendor.totalProducts}
              </span>
            </div>
          )}
          {vendor.totalSales > 0 && (
            <div>
              <span className="text-gray-500">Sales:</span>
              <span className="ml-2 font-medium text-gray-900">
                {vendor.totalSales}
              </span>
            </div>
          )}
          {vendor.responseRate && (
            <div>
              <span className="text-gray-500">Response Rate:</span>
              <span className="ml-2 font-medium text-gray-900">
                {vendor.responseRate}%
              </span>
            </div>
          )}
          {vendor.responseTime && (
            <div>
              <span className="text-gray-500">Response Time:</span>
              <span className="ml-2 font-medium text-gray-900">
                {vendor.responseTime}
              </span>
            </div>
          )}
        </div>

        <div className={`${isShopDirectoryVisible ? "grid grid-cols-2 sm:flex" : "grid grid-cols-1 sm:flex"} gap-2 sm:justify-end`}>
          {isShopDirectoryVisible ? (
            <Link
              to={`/vendor/${vendorIdString}/products`}
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md bg-gray-100 px-3 text-center text-xs font-bold text-gray-900 transition hover:bg-gray-200 sm:min-w-[7rem] sm:text-sm"
            >
              <Store className="h-4 w-4 shrink-0" />
              <span className="truncate">Visit Store</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md bg-orange-600 px-3 text-xs font-bold text-white transition hover:bg-orange-700 sm:min-w-[7rem] sm:text-sm"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">Chat Now</span>
          </button>
        </div>
      </div>

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Chat with {vendor.shopName}
              </h3>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={4}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowChatModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartChat}
                disabled={sending || !message.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
