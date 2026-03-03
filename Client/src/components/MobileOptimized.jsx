import { useEffect } from "react";

/**
 * Mobile Optimization Wrapper Component
 * Applies mobile-specific optimizations and fixes
 */
export default function MobileOptimized({ children }) {
  useEffect(() => {
    // Prevent zoom on input focus (iOS)
    const addMaximumScaleToMetaViewport = () => {
      const el = document.querySelector("meta[name=viewport]");
      if (el !== null) {
        let content = el.getAttribute("content");
        let re = /maximum\-scale=[0-9\.]+/g;

        if (re.test(content)) {
          content = content.replace(re, "maximum-scale=1.0");
        } else {
          content = [content, "maximum-scale=1.0"].join(", ");
        }

        el.setAttribute("content", content);
      }
    };

    // Prevent body scroll when modal is open
    const preventBodyScroll = () => {
      const modals = document.querySelectorAll('[role="dialog"]');
      if (modals.length > 0) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    // Handle viewport height for mobile browsers
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Detect if user is on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      addMaximumScaleToMetaViewport();
    }

    // Set initial VH
    setVH();

    // Update VH on resize
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    // Observe modal changes
    const observer = new MutationObserver(preventBodyScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
}
