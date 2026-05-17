import { useMemo, useState } from "react";
import { Copy, Flag, MessageCircle, Send, Share2, X } from "lucide-react";
import { reportProduct } from "../services/api";
import { useToast } from "../context/ToastContext";

const reportReasons = [
  { value: "counterfeit", label: "Counterfeit or fake product" },
  { value: "wrong_item", label: "Wrong item or misleading listing" },
  { value: "prohibited_content", label: "Prohibited content" },
  { value: "misleading_price", label: "Misleading price or discount" },
  { value: "unsafe_product", label: "Unsafe product" },
  { value: "other", label: "Other issue" },
];

export default function ProductShareReportActions({ product }) {
  const { success, error } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(reportReasons[0].value);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/products/${product?._id}`;
  }, [product?._id]);
  const shareText = `${product?.title || "Product"} - ${url}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      success("Product link copied");
    } catch {
      error("Could not copy the link");
    }
  };

  const submitReport = async () => {
    setSubmitting(true);
    try {
      await reportProduct(product._id, { reason, details });
      success("Report submitted for review");
      setShowReport(false);
      setDetails("");
      setReason(reportReasons[0].value);
    } catch (err) {
      console.error("Failed to submit product report:", err);
      error("Could not submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Copy className="h-4 w-4" />
          Copy Link
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Share2 className="h-4 w-4" />
          Facebook
        </a>
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      </div>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Report this listing
              </h2>
              <button
                type="button"
                aria-label="Close report form"
                onClick={() => setShowReport(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Reason
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {reportReasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Details
            </label>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Tell us what looks wrong."
              className="mb-4 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
