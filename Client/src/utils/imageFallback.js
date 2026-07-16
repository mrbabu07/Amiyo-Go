const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=700&h=700&fit=crop&auto=format";

export const fallbackImage = FALLBACK_IMAGE;

export const installGlobalImageFallback = () => {
  if (typeof window === "undefined" || window.__AMIYO_IMAGE_FALLBACK_INSTALLED__) return;
  window.__AMIYO_IMAGE_FALLBACK_INSTALLED__ = true;

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.fallbackApplied === "true") return;

      target.dataset.fallbackApplied = "true";
      target.src = target.dataset.fallbackSrc || FALLBACK_IMAGE;
    },
    true,
  );
};
