import { useState, useEffect } from "react";

export default function ServiceWorkerManager() {
  const [swStatus, setSwStatus] = useState("checking");
  const [showManager, setShowManager] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    checkServiceWorkerStatus();
    // Show manager if there are errors in console
    const hasErrors = window.console && window.console.error;
    if (hasErrors) {
      // Check for service worker errors in console
      setTimeout(() => {
        const errorLogs =
          window.performance?.getEntriesByType?.("navigation") || [];
        if (errorLogs.length > 0) {
          setShowManager(true);
        }
      }, 2000);
    }
  }, []);

  const checkServiceWorkerStatus = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setSwStatus("active");

          // Get debug info
          const debugData = {
            state: registration.active?.state || "unknown",
            scope: registration.scope,
            updateViaCache: registration.updateViaCache,
            installing: !!registration.installing,
            waiting: !!registration.waiting,
          };
          setDebugInfo(debugData);
        } else {
          setSwStatus("inactive");
        }
      } catch (error) {
        console.error("Service Worker check error:", error);
        setSwStatus("error");
      }
    } else {
      setSwStatus("unsupported");
    }
  };

  const clearAllCaches = async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      alert("✅ All caches cleared successfully!");
      window.location.reload();
    } catch (error) {
      alert("❌ Failed to clear caches: " + error.message);
    }
  };

  const getCacheInfo = async () => {
    try {
      const cacheNames = await caches.keys();
      const info = [];

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        info.push({ name, count: keys.length });
      }

      setCacheInfo(info);
    } catch (error) {
      console.error("Failed to get cache info:", error);
    }
  };

  const testServiceWorker = async () => {
    try {
      // Test if service worker can handle requests
      const testUrl = "/api/categories";
      const response = await fetch(testUrl);

      if (response.ok) {
        alert("✅ Service Worker test passed! API requests working.");
      } else {
        alert(`⚠️ API request failed with status: ${response.status}`);
      }
    } catch (error) {
      alert(`❌ Service Worker test failed: ${error.message}`);
    }
  };

  const updateServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        alert("✅ Service Worker updated! Please refresh the page.");
      }
    } catch (error) {
      alert("❌ Failed to update Service Worker: " + error.message);
    }
  };

  const forceReload = () => {
    // Clear service worker and reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  // Only show if there are issues or user wants to see it
  if (swStatus === "active" && !showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="fixed bottom-4 left-4 z-30 p-2 bg-gray-100 dark:bg-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 opacity-50 hover:opacity-100"
        title="Service Worker Manager"
      >
        <svg
          className="w-4 h-4 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    );
  }

  if (!showManager && swStatus === "active") return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Worker Manager
          </h3>
          {swStatus === "active" && (
            <button
              onClick={() => setShowManager(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          )}
        </div>

        {/* Status */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-3 h-3 rounded-full ${
                swStatus === "active"
                  ? "bg-green-500"
                  : swStatus === "inactive"
                    ? "bg-yellow-500"
                    : swStatus === "error"
                      ? "bg-red-500"
                      : "bg-gray-500"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Status:{" "}
              {swStatus === "active"
                ? "Active"
                : swStatus === "inactive"
                  ? "Inactive"
                  : swStatus === "error"
                    ? "Error"
                    : swStatus === "unsupported"
                      ? "Unsupported"
                      : "Checking..."}
            </span>
          </div>

          {swStatus === "error" && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                Service Worker encountered errors. This may cause caching
                issues.
              </p>
            </div>
          )}

          {swStatus === "unsupported" && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Service Worker is not supported in this browser.
              </p>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Debug Information
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">State:</span>
                <span className="text-gray-900 dark:text-white">
                  {debugInfo.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Scope:</span>
                <span className="text-gray-900 dark:text-white text-right truncate max-w-32">
                  {debugInfo.scope}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Installing:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {debugInfo.installing ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Waiting:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {debugInfo.waiting ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cache Info */}
        {cacheInfo && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Cache Information
            </h4>
            <div className="space-y-1">
              {cacheInfo.map((cache) => (
                <div key={cache.name} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {cache.name}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {cache.count} items
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={getCacheInfo}
            className="w-full btn-secondary text-sm"
          >
            Check Cache Info
          </button>

          <button
            onClick={testServiceWorker}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Test Service Worker
          </button>

          <button
            onClick={updateServiceWorker}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Update Service Worker
          </button>

          <button
            onClick={clearAllCaches}
            className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          >
            Clear All Caches
          </button>

          <button
            onClick={forceReload}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Force Reload (Reset SW)
          </button>
        </div>

        {/* Help */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Troubleshooting
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Clear caches if you see old content</li>
            <li>• Force reload if app won't update</li>
            <li>• Check browser console for errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
