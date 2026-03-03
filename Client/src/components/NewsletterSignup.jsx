import { useState } from "react";

export default function NewsletterSignup({ className = "" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address");
      return;
    }

    setStatus("loading");

    // Simulate API call
    setTimeout(() => {
      // For now, just store in localStorage (can be enhanced with real API)
      const subscribers = JSON.parse(
        localStorage.getItem("newsletter_subscribers") || "[]",
      );

      if (subscribers.includes(email)) {
        setStatus("error");
        setMessage("You're already subscribed!");
      } else {
        subscribers.push(email);
        localStorage.setItem(
          "newsletter_subscribers",
          JSON.stringify(subscribers),
        );
        setStatus("success");
        setMessage("Thanks for subscribing! 🎉");
        setEmail("");
      }
    }, 1000);
  };

  return (
    <div
      className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 ${className}`}
    >
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          📧 Stay Updated!
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Get the latest deals, new arrivals, and exclusive offers delivered to
          your inbox.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {status === "loading" ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Subscribe"
            )}
          </button>
        </div>

        {message && (
          <div
            className={`text-sm p-2 rounded ${
              status === "success"
                ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20"
                : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          No spam
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Secure
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
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
          Unsubscribe anytime
        </span>
      </div>
    </div>
  );
}
