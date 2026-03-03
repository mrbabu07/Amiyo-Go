import { useState, useEffect } from "react";
import { isPWA, getPWADisplayMode, sendLocalNotification } from "../utils/pwa";

const PWAStatus = () => {
  const [isAppPWA, setIsAppPWA] = useState(false);
  const [displayMode, setDisplayMode] = useState("browser");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Check PWA status
    setIsAppPWA(isPWA());
    setDisplayMode(getPWADisplayMode());

    // Listen for network status changes
    const handleNetworkChange = (event) => {
      setIsOnline(event.detail.isOnline);
    };

    window.addEventListener("networkstatuschange", handleNetworkChange);

    // Show status for a few seconds on first load
    const timer = setTimeout(() => {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 5000);
    }, 2000);

    return () => {
      window.removeEventListener("networkstatuschange", handleNetworkChange);
      clearTimeout(timer);
    };
  }, []);

  const handleTestNotification = () => {
    sendLocalNotification("Test Notification", {
      body: "PWA notifications are working! 🎉",
      tag: "test-notification",
    });
  };

  if (!showStatus && isAppPWA) return null;

  return (
    <>
      {/* PWA Status Indicator */}
      {isAppPWA && (
        <div className="fixed top-4 left-4 z-50">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            PWA Mode
          </div>
        </div>
      )}

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            Offline
          </div>
        </div>
      )}

      {/* PWA Features Demo (only show in development) */}
      {process.env.NODE_ENV === "development" && showStatus && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                PWA Status
              </h3>
              <button
                onClick={() => setShowStatus(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  PWA Mode:
                </span>
                <span
                  className={`font-medium ${isAppPWA ? "text-green-600" : "text-gray-500"}`}
                >
                  {isAppPWA ? "Active" : "Browser"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Display:
                </span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {displayMode}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Network:
                </span>
                <span
                  className={`font-medium ${isOnline ? "text-green-600" : "text-red-600"}`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Service Worker:
                </span>
                <span className="font-medium text-green-600">
                  {"serviceWorker" in navigator ? "Supported" : "Not Supported"}
                </span>
              </div>
            </div>

            {/* Test Notification Button */}
            <button
              onClick={handleTestNotification}
              className="mt-3 w-full bg-primary-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
            >
              Test Notification
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAStatus;
