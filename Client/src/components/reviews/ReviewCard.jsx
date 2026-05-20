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
  const reviewVideos = [
    ...(review.videos || []),
    ...(review.videoUrls || []),
    ...((review.media || [])
      .filter((item) => item?.type === "video")
      .map((item) => item.url || item.src || item.videoUrl)),
  ].filter(Boolean);

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
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
            <span className="text-sm font-black">
              {review.userName?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate font-black text-gray-900 dark:text-white">
                {review.userName || "Anonymous"}
              </h4>
              {review.verified && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-950/30 dark:text-green-300">
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
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <StarRating rating={review.rating} readonly size="sm" />
      </div>

      {/* Review Title */}
      {review.title && (
        <h5 className="font-black text-gray-900 dark:text-white">
          {review.title}
        </h5>
      )}

      {/* Review Content */}
      <p className="leading-7 text-gray-700 dark:text-gray-300">
        {review.comment}
      </p>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="space-y-3">
          <h6 className="text-sm font-black text-gray-700 dark:text-gray-300">
            Photos from this review:
          </h6>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {review.images.map((imageUrl, index) => (
              <div
                key={index}
                className="relative group cursor-pointer image-preview"
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={imageUrl}
                  alt={`Review image ${index + 1}`}
                  className="h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
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

      {/* Review Videos */}
      {reviewVideos.length > 0 && (
        <div className="space-y-3">
          <h6 className="text-sm font-black text-gray-700 dark:text-gray-300">
            Videos from this review:
          </h6>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reviewVideos.map((videoUrl, index) => (
              <video
                key={`${videoUrl}-${index}`}
                src={videoUrl}
                controls
                playsInline
                className="h-40 w-full rounded-lg border border-gray-200 bg-black object-contain dark:border-gray-600"
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImageIndex !== null && review.images && (
        <div
          className="review-image-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-h-full max-w-4xl">
            <img
              src={review.images[selectedImageIndex]}
              alt={`Review image ${selectedImageIndex + 1}`}
              className="max-h-full max-w-full rounded-lg object-contain"
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-white transition hover:bg-black/75"
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
                  className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white transition hover:bg-black/75"
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
                  className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white transition hover:bg-black/75"
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {selectedImageIndex + 1} / {review.images.length}
            </div>
          </div>
        </div>
      )}

      {/* Admin Reply */}
      {review.adminReply && (
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900/20">
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

      {/* Vendor Reply */}
      {review.vendorReply && (
        <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 dark:bg-orange-900/20">
          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-5 h-5 text-orange-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-orange-700 dark:text-orange-300">
              {review.vendorRepliedBy || "Vendor"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
              Seller
            </span>
            <span className="text-sm text-orange-600 dark:text-orange-400">
              {formatDate(review.vendorRepliedAt)}
            </span>
          </div>
          <p className="text-orange-800 dark:text-orange-200">
            {review.vendorReply}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleHelpful}
            className="flex items-center space-x-2 text-sm font-bold text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300"
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
            className="text-sm font-bold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300"
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
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-primary-900/50"
            rows={3}
            required
          />
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={isSubmitting || !replyText.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-black text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Post Reply"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setReplyText("");
              }}
              className="px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
