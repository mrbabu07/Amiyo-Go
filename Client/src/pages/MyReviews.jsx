import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  PackageSearch,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Loading from "../components/Loading";
import { useToast } from "../context/ToastContext";
import { deleteReview, getUserReviews, updateReview } from "../services/reviewApi";

const getReviewId = (review = {}) => review._id?.toString?.() || review.id || "";
const getProductId = (review = {}) =>
  review.productId?.toString?.() || review.product?._id?.toString?.() || "";
const getProductTitle = (review = {}) =>
  review.product?.title ||
  review.productTitle ||
  review.productName ||
  "Reviewed product";

const getReviewStatus = (review = {}) => {
  if (review.status) return review.status;
  if (review.moderationStatus) return review.moderationStatus;
  if (review.hidden || review.isHidden) return "hidden";
  return "published";
};

const statusClass = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  hidden: "border-slate-200 bg-slate-50 text-slate-600",
};

const formatStatus = (value = "published") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function RatingStars({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safeRating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < safeRating ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function MyReviews() {
  const { success, error } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ rating: 5, comment: "", title: "" });

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUserReviews();
      const rows = response.data?.data || response.data?.reviews || [];
      setReviews(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Failed to load reviews:", err);
      error(err.response?.data?.error || "Failed to load your reviews");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const stats = useMemo(
    () => ({
      total: reviews.length,
      verified: reviews.filter((review) => review.verified || review.verifiedPurchase).length,
      pending: reviews.filter((review) => getReviewStatus(review) === "pending").length,
    }),
    [reviews],
  );

  const startEdit = (review) => {
    setEditingId(getReviewId(review));
    setEditForm({
      rating: Number(review.rating || 5),
      title: review.title || "",
      comment: review.comment || review.review || "",
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditForm({ rating: 5, comment: "", title: "" });
  };

  const saveReview = async (review) => {
    const reviewId = getReviewId(review);
    if (!reviewId) return;
    if (!editForm.comment.trim()) {
      error("Please write a review before saving");
      return;
    }

    setSavingId(reviewId);
    try {
      await updateReview(reviewId, {
        rating: editForm.rating,
        title: editForm.title.trim(),
        comment: editForm.comment.trim(),
      });
      setReviews((current) =>
        current.map((item) =>
          getReviewId(item) === reviewId
            ? {
                ...item,
                rating: editForm.rating,
                title: editForm.title.trim(),
                comment: editForm.comment.trim(),
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      cancelEdit();
      success("Review updated");
    } catch (err) {
      console.error("Failed to update review:", err);
      error(err.response?.data?.error || "Failed to update review");
    } finally {
      setSavingId("");
    }
  };

  const removeReview = async (review) => {
    const reviewId = getReviewId(review);
    if (!reviewId) return;
    if (!window.confirm("Remove this review?")) return;

    setSavingId(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((current) => current.filter((item) => getReviewId(item) !== reviewId));
      success("Review removed");
    } catch (err) {
      console.error("Failed to remove review:", err);
      error(err.response?.data?.error || "Failed to remove review");
    } finally {
      setSavingId("");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Customer reviews
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">My Reviews</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Manage ratings from verified purchases and see moderation or seller replies in one place.
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
            >
              Review delivered orders
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total reviews", value: stats.total },
              { label: "Verified purchases", value: stats.verified },
              { label: "Pending moderation", value: stats.pending },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <PackageSearch className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-black text-slate-950">No reviews yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
              Delivered products will show review shortcuts from your order history.
            </p>
            <Link
              to="/orders"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
            >
              Go to orders
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviews.map((review) => {
              const reviewId = getReviewId(review);
              const productId = getProductId(review);
              const status = getReviewStatus(review);
              const isEditing = editingId === reviewId;
              const images = Array.isArray(review.images) ? review.images : [];

              return (
                <article
                  key={reviewId}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RatingStars rating={isEditing ? editForm.rating : review.rating} />
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-black uppercase ${statusClass[status] || statusClass.published}`}
                        >
                          {formatStatus(status)}
                        </span>
                        {(review.verified || review.verifiedPurchase) && (
                          <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-black uppercase text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-lg font-black text-slate-950">
                        {productId ? (
                          <Link to={`/product/${productId}`} className="hover:text-primary-700">
                            {getProductTitle(review)}
                          </Link>
                        ) : (
                          getProductTitle(review)
                        )}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Submitted {formatDate(review.createdAt)}
                        {review.updatedAt ? ` - Updated ${formatDate(review.updatedAt)}` : ""}
                      </p>

                      {isEditing ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setEditForm((current) => ({ ...current, rating: index + 1 }))}
                                className="rounded-md p-1 text-amber-400 hover:bg-amber-50"
                                aria-label={`${index + 1} stars`}
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    index < editForm.rating ? "fill-amber-400" : ""
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <input
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, title: event.target.value }))
                            }
                            placeholder="Review title"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                          <textarea
                            value={editForm.comment}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, comment: event.target.value }))
                            }
                            rows={4}
                            placeholder="Share your experience"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </div>
                      ) : (
                        <>
                          {review.title && (
                            <p className="mt-4 font-bold text-slate-900">{review.title}</p>
                          )}
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {review.comment || review.review || "No written review."}
                          </p>
                        </>
                      )}

                      {images.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {images.slice(0, 5).map((image, index) => (
                            <a
                              key={`${image}-${index}`}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={image}
                                alt={`Review media ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {images.length === 0 && (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                          <ImageIcon className="h-4 w-4" />
                          No photos attached
                        </div>
                      )}

                      {review.vendorReply && (
                        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                          <p className="font-black">Seller reply</p>
                          <p className="mt-1 leading-6">{review.vendorReply}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveReview(review)}
                            disabled={savingId === reviewId}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {savingId === reviewId ? "Saving" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(review)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeReview(review)}
                            disabled={savingId === reviewId}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
