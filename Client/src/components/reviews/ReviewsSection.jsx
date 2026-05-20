import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import StarRating from "./StarRating";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import useAuth from "../../hooks/useAuth";

const ReviewsSection = ({ productId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    verifiedReviews: 0,
    photoReviews: 0,
    videoReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");

  useEffect(() => {
    fetchReviews();
  }, [productId, currentPage, sortBy, filterBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reviews/product/${productId}?page=${currentPage}&limit=10&sort=${encodeURIComponent(sortBy)}&filter=${encodeURIComponent(filterBy)}`,
      );
      const data = await response.json();

      if (data.success) {
        if (currentPage === 1) {
          setReviews(data.data.reviews);
        } else {
          setReviews((prev) => [...prev, ...data.data.reviews]);
        }
        setStats(data.data.stats);
        setHasMore(data.data.pagination.hasMore);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = (newReview) => {
    setReviews((prev) => [newReview, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalReviews: prev.totalReviews + 1,
    }));
    setShowReviewForm(false);
    // Refresh to get updated stats
    fetchReviews();
  };

  const handleHelpful = async (reviewId) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
        },
      });

      if (response.ok) {
        setReviews((prev) =>
          prev.map((review) =>
            review._id === reviewId
              ? { ...review, helpful: (review.helpful || 0) + 1 }
              : review,
          ),
        );
      }
    } catch (error) {
      console.error("Error marking review helpful:", error);
    }
  };

  const handleAdminReply = async (reviewId, replyText) => {
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ reply: replyText }),
      });

      if (response.ok) {
        // Refresh reviews to show the new reply
        fetchReviews();
      }
    } catch (error) {
      console.error("Error adding admin reply:", error);
    }
  };

  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const getRatingPercentage = (rating) => {
    if (stats.totalReviews === 0) return 0;
    return Math.round(
      (stats.ratingDistribution[rating] / stats.totalReviews) * 100,
    );
  };

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Customer Reviews
          </h2>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
            Real buyer feedback, photos, and seller responses.
          </p>
        </div>

        {user && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-black text-white transition hover:bg-primary-700"
          >
            Write a Review
          </button>
        )}

        {!user && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Want to write a review?
            </p>
            <a
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-black text-white transition hover:bg-primary-700"
            >
              Sign In to Review
            </a>
          </div>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm
          productId={productId}
          onReviewSubmitted={handleReviewSubmitted}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Rating Summary */}
      <div className="rounded-lg border border-gray-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950 sm:p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[18rem_1fr]">
          {/* Overall Rating */}
          <div className="rounded-lg bg-white p-5 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="mb-2 text-5xl font-black text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
            </div>
            <StarRating
              rating={Math.round(stats.averageRating)}
              readonly
              size="lg"
              showCount
              count={stats.totalReviews}
            />
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Based on {stats.totalReviews}{" "}
              {stats.totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2 self-center">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-3">
                <span className="w-12 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {rating} star
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${getRatingPercentage(rating)}%` }}
                  />
                </div>
                <span className="w-12 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {getRatingPercentage(rating)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      {stats.totalReviews > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-black text-gray-700 dark:text-gray-300">
              Filter:
            </label>
            <select
              value={filterBy}
              onChange={(e) => {
                setFilterBy(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-primary-900/50"
            >
              <option value="all">All Reviews</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
              <option value="verified">Verified Only</option>
              <option value="photos">With Photos</option>
              <option value="videos">With Videos</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-black text-gray-700 dark:text-gray-300">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-primary-900/50"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      )}

      {stats.totalReviews > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: "verified", label: "Verified reviews", value: stats.verifiedReviews || 0 },
            { key: "photos", label: "With photos", value: stats.photoReviews || 0 },
            { key: "videos", label: "With videos", value: stats.videoReviews || 0 },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilterBy(item.key);
                setCurrentPage(1);
              }}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                filterBy === item.key
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              <span className="block text-lg font-black">{item.value}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {loading && currentPage === 1 ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        ) : reviews.length > 0 ? (
          <>
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onHelpful={handleHelpful}
                onReply={user?.role === "admin" ? handleAdminReply : null}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {loading ? "Loading..." : "Load More Reviews"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Be the first to share your experience with this product
            </p>
            {user && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-black text-white transition hover:bg-primary-700"
              >
                Write the First Review
              </button>
            )}

            {!user && (
              <a
                href="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-black text-white transition hover:bg-primary-700"
              >
                Sign In to Write Review
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;
