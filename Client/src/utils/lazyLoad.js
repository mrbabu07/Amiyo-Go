import { lazy } from 'react';

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
              console.log(`Retrying import... (${retriesLeft} attempts left)`);
              attemptImport(retriesLeft - 1);
            }, interval);
          });
      };
      attemptImport(retries);
    });
  });
};

// Image lazy loading hook
export const useLazyImage = (src, placeholder = '/placeholder.png') => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
    };
  }, [src]);

  return { imageSrc, isLoading };
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const targetRef = React.useRef(null);

  React.useEffect(() => {
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
