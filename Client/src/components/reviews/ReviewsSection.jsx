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
        `/api/reviews/product/${productId}?page=${currentPage}&limit=10&sort=${sortBy}&filter=${filterBy}`,
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
    <div className="space-y-8">
      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Customer Reviews
        </h2>

        {user && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            <StarRating
              rating={Math.round(stats.averageRating)}
              readonly
              size="lg"
              showCount
              count={stats.totalReviews}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Based on {stats.totalReviews}{" "}
              {stats.totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                  {rating}★
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getRatingPercentage(rating)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {getRatingPercentage(rating)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      {stats.totalReviews > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter:
            </label>
            <select
              value={filterBy}
              onChange={(e) => {
                setFilterBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Reviews</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
              <option value="verified">Verified Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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

      {/* Reviews List */}
      <div className="space-y-6">
        {loading && currentPage === 1 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Write the First Review
              </button>
            )}

            {!user && (
              <a
                href="/login"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
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
