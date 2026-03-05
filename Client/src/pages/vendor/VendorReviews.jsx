import { useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const mockReviews = [
  {
    id: 1,
    customer: "Rahul Ahmed",
    avatar: "R",
    product: "Men's Casual Shirt",
    rating: 5,
    review: "Excellent quality! The fabric is soft and the fit is perfect. Will definitely order again.",
    date: "2026-03-01",
    reply: null,
    helpful: 8,
  },
  {
    id: 2,
    customer: "Fatima Islam",
    avatar: "F",
    product: "Women's Kurti Set",
    rating: 4,
    review: "Nice material but the color was slightly different from the photos. Overall happy with the purchase.",
    date: "2026-02-28",
    reply: "Thank you for your honest feedback! We will improve the product photos.",
    helpful: 3,
  },
  {
    id: 3,
    customer: "Karim Hossain",
    avatar: "K",
    product: "Leather Handbag",
    rating: 2,
    review: "The stitching came loose after a week. Very disappointed.",
    date: "2026-02-25",
    reply: null,
    helpful: 1,
  },
  {
    id: 4,
    customer: "Nila Sultana",
    avatar: "N",
    product: "Sports Cap",
    rating: 5,
    review: "Perfect cap! Fast delivery and well-packaged. Love it!",
    date: "2026-02-22",
    reply: "Thank you so much for your kind words! 😊",
    helpful: 12,
  },
  {
    id: 5,
    customer: "Amir Khan",
    avatar: "A",
    product: "Men's Casual Shirt",
    rating: 3,
    review: "Decent quality for the price. Shipping took longer than expected.",
    date: "2026-02-20",
    reply: null,
    helpful: 2,
  },
];

const StarDisplay = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} className={`w-4 h-4 ${s <= rating ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export default function VendorReviews() {
  const [reviews, setReviews] = useState(mockReviews);
  const [filter, setFilter] = useState("all");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const filtered = filter === "all" ? reviews : reviews.filter(r => {
    if (filter === "pending") return !r.reply;
    if (filter === "replied") return !!r.reply;
    return r.rating === parseInt(filter);
  });

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const submitReply = (id) => {
    if (!replyText.trim()) { toast.error("Please enter a reply"); return; }
    setReviews(prev => prev.map(r => r.id === id ? { ...r, reply: replyText } : r));
    setReplyingTo(null);
    setReplyText("");
    toast.success("Reply posted!");
  };

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100),
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
              <p className="text-sm text-gray-500">Monitor and reply to customer reviews</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Rating Summary Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-gray-900 mb-1">{avgRating}</div>
            <StarDisplay rating={Math.round(parseFloat(avgRating))} />
            <p className="text-sm text-gray-400 mt-2">{reviews.length} reviews</p>
          </div>
          {/* Rating Distribution */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
            <div className="space-y-2">
              {ratingDist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-5">{star}</span>
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            {[
              { label: "Total Reviews", value: reviews.length, color: "text-gray-900" },
              { label: "Need Reply", value: reviews.filter(r => !r.reply).length, color: "text-orange-600" },
              { label: "Replied", value: reviews.filter(r => !!r.reply).length, color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{s.label}</span>
                <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-6 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Reviews" },
            { key: "pending", label: "⏳ Need Reply" },
            { key: "replied", label: "✅ Replied" },
            { key: "5", label: "⭐⭐⭐⭐⭐" },
            { key: "4", label: "⭐⭐⭐⭐" },
            { key: "3", label: "⭐⭐⭐" },
            { key: "2", label: "⭐⭐" },
            { key: "1", label: "⭐" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f.key ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Reviews */}
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {r.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.customer}</p>
                    <p className="text-xs text-orange-600">{r.product}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={r.rating} />
                      <span className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.reply ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {r.reply ? "✓ Replied" : "⏳ Pending"}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 text-sm mb-4 leading-relaxed">{r.review}</p>
              <p className="text-xs text-gray-400 mb-3">👍 {r.helpful} people found this helpful</p>

              {/* Existing reply */}
              {r.reply && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">🏪 Your Reply</p>
                  <p className="text-sm text-gray-700">{r.reply}</p>
                </div>
              )}

              {/* Reply form */}
              {replyingTo === r.id ? (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a professional reply to this review..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => submitReply(r.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Post Reply</button>
                    <button onClick={() => setReplyingTo(null)} className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingTo(r.id); setReplyText(r.reply || ""); }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  {r.reply ? "✏️ Edit Reply" : "💬 Reply"}
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">⭐</div>
              <p className="font-medium text-gray-600">No reviews in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
