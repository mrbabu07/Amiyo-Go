import { useState } from "react";
import { useTranslation } from "react-i18next";
import StarRating from "./StarRating";
import useAuth from "../../hooks/useAuth";

const ReviewCard = ({
  review,
  onHelpful,
  onReply,
  showProductInfo = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleHelpful = async () => {
    if (onHelpful) {
      await onHelpful(review._id);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      if (onReply) {
        await onReply(review._id, replyText.trim());
        setReplyText("");
        setShowReplyForm(false);
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {review.userName?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {review.userName || "Anonymous"}
              </h4>
              {review.verified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified Purchase
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <StarRating rating={review.rating} readonly size="sm" />
      </div>

      {/* Review Title */}
      {review.title && (
        <h5 className="font-medium text-gray-900 dark:text-white">
          {review.title}
        </h5>
      )}

      {/* Review Content */}
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
        {review.comment}
      </p>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="space-y-3">
          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Photos from this review:
          </h6>
          <div className="review-image-grid">
            {review.images.map((imageUrl, index) => (
              <div
                key={index}
                className="relative group cursor-pointer image-preview"
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={imageUrl}
                  alt={`Review image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImageIndex !== null && review.images && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 review-image-modal flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={review.images[selectedImageIndex]}
              alt={`Review image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all"
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

            {/* Navigation Arrows */}
            {review.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(
                      selectedImageIndex > 0
                        ? selectedImageIndex - 1
                        : review.images.length - 1,
                    );
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(
                      selectedImageIndex < review.images.length - 1
                        ? selectedImageIndex + 1
                        : 0,
                    );
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all"
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {review.images.length}
            </div>
          </div>
        </div>
      )}

      {/* Admin Reply */}
      {review.adminReply && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {review.adminRepliedBy || "Admin"}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {formatDate(review.adminRepliedAt)}
            </span>
          </div>
          <p className="text-blue-800 dark:text-blue-200">
            {review.adminReply}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleHelpful}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span>Helpful ({review.helpful || 0})</span>
          </button>
        </div>

        {/* Admin Reply Button */}
        {user?.role === "admin" && !review.adminReply && (
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Reply as Admin
          </button>
        )}
      </div>

      {/* Admin Reply Form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mt-4 space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your admin response..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            rows={3}
            required
          />
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={isSubmitting || !replyText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSubmitting ? "Posting..." : "Post Reply"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText("");
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReviewCard;
