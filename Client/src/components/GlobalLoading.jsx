import { useState, useEffect } from "react";

export default function GlobalLoading() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Listen for navigation start/end events
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    // Listen for fetch requests (optional enhancement)
    const originalFetch = window.fetch;
    let activeRequests = 0;

    window.fetch = async (...args) => {
      activeRequests++;
      if (activeRequests === 1) setIsLoading(true);

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        activeRequests--;
        if (activeRequests === 0) {
          // Small delay to prevent flickering
          setTimeout(() => {
            if (activeRequests === 0) setIsLoading(false);
          }, 100);
        }
      }
    };

    // Listen for page load events
    window.addEventListener("beforeunload", handleStart);
    window.addEventListener("load", handleComplete);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      window.removeEventListener("load", handleComplete);
      window.fetch = originalFetch;
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50">
      <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 animate-pulse">
        <div className="h-full bg-gradient-to-r from-primary-600 to-secondary-600 animate-loading-bar"></div>
      </div>
    </div>
  );
}
