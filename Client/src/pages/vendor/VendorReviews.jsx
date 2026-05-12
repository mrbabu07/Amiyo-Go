import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import { addVendorReviewReply, getVendorReviews } from "../../services/api";

const StarDisplay = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`h-4 w-4 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const normalizeReview = (review) => ({
  ...review,
  id: review._id?.toString() || review.id,
  customer:
    review.userName ||
    review.customerName ||
    review.userEmail ||
    review.userId ||
    "Customer",
  avatar: (review.userName || review.customerName || review.userEmail || "C").charAt(0).toUpperCase(),
  productTitle: review.product?.title || review.productTitle || "Product",
  rating: Number(review.rating || 0),
  reviewText: review.review || review.comment || review.text || "",
  reply: review.vendorReply || "",
  helpful: Number(review.helpful || 0),
  date: review.createdAt || review.date,
});

export default function VendorReviews() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("all");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingReply, setSavingReply] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getVendorReviews();
      const rows = response.data.data || response.data.reviews || [];
      setReviews(rows.map(normalizeReview));
    } catch (error) {
      console.error("Failed to load vendor reviews:", error);
      toast.error(error.response?.data?.error || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    if (filter === "pending") return reviews.filter((review) => !review.reply);
    if (filter === "replied") return reviews.filter((review) => Boolean(review.reply));
    return reviews.filter((review) => review.rating === Number(filter));
  }, [filter, reviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const average = total
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((review) => review.rating === star).length;
      return {
        star,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      };
    });

    return {
      total,
      average,
      pending: reviews.filter((review) => !review.reply).length,
      replied: reviews.filter((review) => Boolean(review.reply)).length,
      distribution,
    };
  }, [reviews]);

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      setSavingReply(true);
      await addVendorReviewReply(reviewId, replyText.trim());
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? { ...review, reply: replyText.trim() } : review,
        ),
      );
      setReplyingTo(null);
      setReplyText("");
      toast.success("Reply posted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to post reply");
    } finally {
      setSavingReply(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
              <p className="text-sm text-gray-500">Monitor and reply to real customer reviews</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-1 text-5xl font-bold text-gray-900">{stats.average.toFixed(1)}</div>
            <StarDisplay rating={Math.round(stats.average)} />
            <p className="mt-2 text-sm text-gray-400">{stats.total} reviews</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="mb-4 font-semibold text-gray-900">Rating Breakdown</h3>
            <div className="space-y-2">
              {stats.distribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-5 text-sm text-gray-600">{star}</span>
                  <svg className="h-4 w-4 flex-shrink-0 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
            {[
              { label: "Total Reviews", value: stats.total, color: "text-gray-900" },
              { label: "Need Reply", value: stats.pending, color: "text-orange-600" },
              { label: "Replied", value: stats.replied, color: "text-green-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
          {[
            { key: "all", label: "All Reviews" },
            { key: "pending", label: "Need Reply" },
            { key: "replied", label: "Replied" },
            { key: "5", label: "5 Star" },
            { key: "4", label: "4 Star" },
            { key: "3", label: "3 Star" },
            { key: "2", label: "2 Star" },
            { key: "1", label: "1 Star" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === item.key ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 font-bold text-white">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.customer}</p>
                    <p className="text-xs text-orange-600">{review.productTitle}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs text-gray-400">
                        {review.date ? new Date(review.date).toLocaleDateString() : "No date"}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${review.reply ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {review.reply ? "Replied" : "Pending"}
                </span>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-gray-700">{review.reviewText || "No written review."}</p>
              <p className="mb-3 text-xs text-gray-400">{review.helpful} people found this helpful</p>

              {review.reply && (
                <div className="mb-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="mb-1 text-xs font-semibold text-orange-700">Your Reply</p>
                  <p className="text-sm text-gray-700">{review.reply}</p>
                </div>
              )}

              {replyingTo === review.id ? (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a professional reply to this review..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => submitReply(review.id)}
                      disabled={savingReply}
                      className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      {savingReply ? "Posting..." : "Post Reply"}
                    </button>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReplyingTo(review.id);
                    setReplyText(review.reply || "");
                  }}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                >
                  {review.reply ? "Edit Reply" : "Reply"}
                </button>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <div className="mb-3 text-5xl text-gray-300">*</div>
              <p className="font-medium text-gray-600">No reviews in this category</p>
              <p className="mt-1 text-sm text-gray-400">Reviews will appear here after customers review your products.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
