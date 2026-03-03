import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllReviews,
  getUnrepliedReviews,
  addAdminReply,
  deleteReviewAdmin,
} from "../../services/reviewApi";
import Loading from "../../components/Loading";
import StarRating from "../../components/StarRating";
import Modal from "../../components/Modal";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unreplied, replied
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      if (filter === "unreplied") {
        const response = await getUnrepliedReviews();
        setReviews(response.data.data);
      } else {
        const response = await getAllReviews();
        let allReviews = response.data.data;

        if (filter === "replied") {
          allReviews = allReviews.filter((r) => r.adminReply);
        }

        setReviews(allReviews);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      alert("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyClick = (review) => {
    setSelectedReview(review);
    setReplyText(review.adminReply || "");
    setShowReplyModal(true);
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      alert("Please enter a reply");
      return;
    }

    setSubmitting(true);
    try {
      await addAdminReply(selectedReview._id, replyText.trim());
      alert("Reply added successfully!");
      setShowReplyModal(false);
      setReplyText("");
      setSelectedReview(null);
      fetchReviews();
    } catch (error) {
      console.error("Failed to add reply:", error);
      alert(error.response?.data?.error || "Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await deleteReviewAdmin(reviewId);
      alert("Review deleted successfully");
      fetchReviews();
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review");
    }
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setSelectedReview(null);
    setReplyText("");
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Review Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer reviews and respond to feedback
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
            filter === "all"
              ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          All Reviews
          <span className="ml-2 text-xs opacity-75">({reviews.length})</span>
        </button>
        <button
          onClick={() => setFilter("unreplied")}
          className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
            filter === "unreplied"
              ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Needs Reply
          <span className="ml-2 text-xs opacity-75">
            ({reviews.filter((r) => !r.adminReply).length})
          </span>
        </button>
        <button
          onClick={() => setFilter("replied")}
          className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
            filter === "replied"
              ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Replied
          <span className="ml-2 text-xs opacity-75">
            ({reviews.filter((r) => r.adminReply).length})
          </span>
        </button>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
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
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No reviews found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === "unreplied"
              ? "All reviews have been replied to!"
              : "No customer reviews yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                      {review.userName?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {review.userName || "Anonymous"}
                    </p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString(
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
                </div>
                <div className="flex items-center gap-2">
                  {review.verified && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      Verified Purchase
                    </span>
                  )}
                  {review.adminReply && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                      Replied
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Link
                  to={`/product/${review.productId}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  View Product →
                </Link>
              </div>

              {/* Review Content */}
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {review.comment}
                </p>
              </div>

              {/* Admin Reply Section */}
              {review.adminReply && (
                <div className="mb-4 ml-8 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
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
                    </div>
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      Your Response
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {new Date(review.adminRepliedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                    {review.adminReply}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleReplyClick(review)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
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
                  {review.adminReply ? "Edit Reply" : "Reply"}
                </button>
                <button
                  onClick={() => handleDeleteReview(review._id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
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
          ))}
        </div>
      )}

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={closeReplyModal}
        title={selectedReview?.adminReply ? "Edit Reply" : "Reply to Review"}
      >
        {selectedReview && (
          <div className="space-y-4">
            {/* Review Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedReview.userName}
                </span>
                <StarRating rating={selectedReview.rating} size="sm" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {selectedReview.comment}
              </p>
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSubmitReply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Response *
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows="4"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Thank you for your feedback! We appreciate..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 Your reply will be visible to all customers viewing this
                  product. The reviewer will be notified.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Reply"}
                </button>
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={submitting}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
