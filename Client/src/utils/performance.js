// Performance monitoring utilities

/**
 * Measure component render time
 */
export const measureRender = (componentName) => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 16) { // Slower than 60fps
      console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
};

/**
 * Debounce function for performance
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize expensive calculations
 */
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Report Web Vitals
 */
export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

/**
 * Prefetch data for better UX
 */
export const prefetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    // Store in cache or state management
    return data;
  } catch (error) {
    console.error('Prefetch failed:', error);
  }
};

/**
 * Check if user is on slow connection
 */
export const isSlowConnection = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;
  
  return connection.effectiveType === 'slow-2g' || 
         connection.effectiveType === '2g' ||
         connection.saveData === true;
};

/**
 * Optimize images based on device
 */
export const getOptimizedImageUrl = (url, width = 800) => {
  if (!url) return '';
  
  // If using a CDN with image optimization
  // return `${url}?w=${width}&q=80&fm=webp`;
  
  return url;
};
