import { lazy, useEffect, useRef, useState } from "react";

// Lazy load components with retry logic
export const lazyLoadWithRetry = (importFn, retries = 3, interval = 1000) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptImport = (retriesLeft) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft === 0) {
              reject(error);
              return;
            }
            setTimeout(() => {
              attemptImport(retriesLeft - 1);
            }, interval);
          });
      };
      attemptImport(retries);
    });
  });
};

// Image lazy loading hook
export const useLazyImage = (src, placeholder = "/placeholder.png") => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      const timeoutId = setTimeout(() => {
        setImageSrc(placeholder);
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [placeholder, src]);

  return { imageSrc, isLoading };
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = setTimeout(() => setIsIntersecting(true), 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [options]);

  return [targetRef, isIntersecting];
};
