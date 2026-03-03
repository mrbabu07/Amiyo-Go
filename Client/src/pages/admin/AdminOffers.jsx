import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllOffers,
  deleteOffer,
  toggleOfferStatus,
} from "../../services/api";
import toast from "react-hot-toast";

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await getAllOffers();
      setOffers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleOfferStatus(id);
      setOffers(
        offers.map((offer) =>
          offer._id === id ? { ...offer, isActive: !currentStatus } : offer,
        ),
      );
      toast.success(
        `Offer ${!currentStatus ? "activated" : "deactivated"} successfully`,
      );
    } catch (error) {
      console.error("Failed to toggle offer status:", error);
      toast.error("Failed to update offer status");
    }
  };

  const handleDeleteClick = (offer) => {
    setOfferToDelete(offer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;

    try {
      await deleteOffer(offerToDelete._id);
      setOffers(offers.filter((offer) => offer._id !== offerToDelete._id));
      toast.success("Offer deleted successfully");
      setShowDeleteModal(false);
      setOfferToDelete(null);
    } catch (error) {
      console.error("Failed to delete offer:", error);
      toast.error("Failed to delete offer");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOfferActive = (offer) => {
    const now = new Date();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);
    return offer.isActive && now >= start && now <= end;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Promotional Offers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage promotional offers and popup campaigns
            </p>
          </div>
          <Link
            to="/admin/offers/add"
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
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
            Create Offer
          </Link>
        </div>

        {/* Offers List */}
        {offers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No offers yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first promotional offer to engage customers
            </p>
            <Link
              to="/admin/offers/add"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
              Create Offer
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {offers.map((offer) => {
              const imageUrl = offer.image?.startsWith("http")
                ? offer.image
                : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${offer.image}`;
              const active = isOfferActive(offer);

              return (
                <div
                  key={offer._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="grid md:grid-cols-4 gap-6 p-6">
                    {/* Image */}
                    <div className="md:col-span-1">
                      <img
                        src={imageUrl}
                        alt={offer.title}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop";
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                          {offer.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {/* Active Status Badge */}
                          {active ? (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                              Inactive
                            </span>
                          )}
                          {/* Popup Badge */}
                          {offer.showAsPopup && (
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
                              Popup
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {offer.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Discount:
                          </span>
                          <span className="ml-2 font-semibold text-primary-600 dark:text-primary-400">
                            {offer.discountType === "percentage"
                              ? `${offer.discountValue}%`
                              : `$${offer.discountValue}`}{" "}
                            OFF
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Priority:
                          </span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {offer.priority}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Start:
                          </span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {formatDate(offer.startDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            End:
                          </span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {formatDate(offer.endDate)}
                          </span>
                        </div>
                      </div>

                      {offer.couponCode && (
                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            Coupon:
                          </span>
                          <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400 rounded font-mono text-sm font-bold">
                            {offer.couponCode}
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex md:flex-col gap-2">
                      <Link
                        to={`/admin/offers/edit/${offer._id}`}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-center flex items-center justify-center gap-2"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          handleToggleStatus(offer._id, offer.isActive)
                        }
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors text-center flex items-center justify-center gap-2 ${
                          offer.isActive
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
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
                            d={
                              offer.isActive
                                ? "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            }
                          />
                        </svg>
                        {offer.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(offer)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-center flex items-center justify-center gap-2"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Delete Offer
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{offerToDelete?.title}"? This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
