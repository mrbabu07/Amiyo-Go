import { useEffect, useRef } from "react";

const viewedProducts = new Set();
const VIEW_DEDUPE_PREFIX = "amiyo:product-view:";
const VIEW_DELAY_MS = 1200;

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function hasTrackedInSession(productId) {
  if (viewedProducts.has(productId)) return true;
  if (!canUseSessionStorage()) return false;

  try {
    return window.sessionStorage.getItem(`${VIEW_DEDUPE_PREFIX}${productId}`) === "1";
  } catch {
    return false;
  }
}

function markTracked(productId) {
  viewedProducts.add(productId);
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(`${VIEW_DEDUPE_PREFIX}${productId}`, "1");
  } catch {
    // Session storage can be unavailable in private contexts; in-memory dedupe still works.
  }
}

const useProductView = (productId) => {
  const hasViewed = useRef(false);

  useEffect(() => {
    if (!productId || hasViewed.current || hasTrackedInSession(productId)) return undefined;

    const controller = new AbortController();

    const trackView = async () => {
      hasViewed.current = true;
      markTracked(productId);

      try {
        const response = await fetch(`${getApiBaseUrl()}/products/${productId}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          keepalive: true,
          signal: controller.signal,
        });

        if (!response.ok && response.status !== 429) {
          console.warn(`Product view tracking returned ${response.status}`);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn("Product view tracking skipped:", error.message);
        }
      }
    };

    // Track view after a short delay to ensure the user actually sees the product
    const timer = setTimeout(trackView, VIEW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [productId]);
};

export default useProductView;
