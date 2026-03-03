import { useState, useEffect } from "react";
import { getActivePopupOffer } from "../services/api";
import useAuth from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function OfferPopup() {
  const [offer, setOffer] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Create a unique key for each user (or session for guests)
    const userKey = user?.uid || "guest";
    const popupKey = `offerPopupShown_${userKey}`;

    // Check if popup was already shown for this user
    const popupShown = sessionStorage.getItem(popupKey);
    if (popupShown) return;

    // Fetch active offer after a delay
    const timer = setTimeout(() => {
      fetchActiveOffer(popupKey);
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [user]); // Re-run when user changes (login/logout)

  const fetchActiveOffer = async (popupKey) => {
    try {
      const response = await getActivePopupOffer();
      if (response.data.success && response.data.data) {
        setOffer(response.data.data);
        setIsVisible(true);
        // Store the key so we know popup was shown for this user
        sessionStorage.setItem(popupKey, "true");
      }
    } catch (error) {
      // Silently fail - it's normal if no offers exist or server is starting
      console.log("No active offers to display");
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      // Key is already set when popup is shown, no need to set again
    }, 300);
  };

  const handleCopyCoupon = () => {
    if (offer?.couponCode) {
      navigator.clipboard.writeText(offer.couponCode);
      toast.success("Coupon code copied!");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isVisible || !offer) return null;

  const imageUrl = offer.image?.startsWith("http")
    ? offer.image
    : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${offer.image}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden pointer-events-auto transform transition-all duration-300 ${
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 rounded-full shadow-lg transition-all hover:scale-110"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
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

          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Side - Image */}
            <div className="relative h-64 md:h-auto bg-gradient-to-br from-primary-500 to-secondary-500">
              <img
                src={imageUrl}
                alt={offer.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=600&fit=crop";
                }}
              />

              {/* Discount Badge */}
              <div className="absolute top-4 left-4">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg transform -rotate-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold leading-none">
                      {offer.discountType === "percentage"
                        ? `${offer.discountValue}%`
                        : `$${offer.discountValue}`}
                    </div>
                    <div className="text-xs font-semibold uppercase">OFF</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {offer.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {offer.description}
                </p>

                {/* Coupon Code */}
                {offer.couponCode && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Use coupon code:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-lg px-4 py-3">
                        <code className="text-xl font-bold text-primary-600 dark:text-primary-400 tracking-wider">
                          {offer.couponCode}
                        </code>
                      </div>
                      <button
                        onClick={handleCopyCoupon}
                        className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2"
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Validity Period */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Valid until {formatDate(offer.endDate)}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  handleClose();
                  window.location.href = offer.buttonLink || "/products";
                }}
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg text-center cursor-pointer"
              >
                {offer.buttonText || "Shop Now"} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
