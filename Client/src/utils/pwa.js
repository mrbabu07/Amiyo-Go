// PWA Utility Functions

// Service Worker Registration
export const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      console.log("🔧 PWA: Registering service worker...");

      const registration = await navigator.serviceWorker.register("/sw-bypass.js", {
        scope: "/",
      });

      console.log(
        "✅ PWA: Service worker registered successfully",
        registration,
      );

      // Handle updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("🔄 PWA: New service worker found, installing...");

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log("🎉 PWA: New content available, please refresh");
            showUpdateAvailableNotification();
          }
        });
      });

      return registration;
    } catch (error) {
      console.error("❌ PWA: Service worker registration failed:", error);
      return null;
    }
  } else {
    console.warn("⚠️ PWA: Service workers not supported");
    return null;
  }
};

// Show update available notification
const showUpdateAvailableNotification = () => {
  // Create a custom notification or use your existing toast system
  const updateBanner = document.createElement("div");
  updateBanner.id = "pwa-update-banner";
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; max-width: 600px; margin: 0 auto;">
        <span style="font-size: 20px;">🎉</span>
        <span style="font-weight: 500;">New version available!</span>
        <button onclick="window.location.reload()" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
        ">
          Update Now
        </button>
        <button onclick="document.getElementById('pwa-update-banner').remove()" style="
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
        ">
          ×
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(updateBanner);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    const banner = document.getElementById("pwa-update-banner");
    if (banner) {
      banner.remove();
    }
  }, 10000);
};

// Install PWA Prompt
export const initializeInstallPrompt = () => {
  let deferredPrompt;
  let installButton = null;

  // Listen for beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📱 PWA: Install prompt available");

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show install button
    showInstallButton();
  });

  // Show install button
  const showInstallButton = () => {
    // Remove existing button if any
    const existingButton = document.getElementById("pwa-install-button");
    if (existingButton) {
      existingButton.remove();
    }

    // Create install button
    installButton = document.createElement("div");
    installButton.id = "pwa-install-button";
    installButton.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInUp 0.3s ease-out;
        user-select: none;
      ">
        <span style="font-size: 18px;">📱</span>
        <span>Install App</span>
        <button onclick="document.getElementById('pwa-install-button').remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 2px 6px;
          border-radius: 50%;
          margin-left: 8px;
        ">
          ×
        </button>
      </div>
      <style>
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      </style>
    `;

    // Add click handler
    installButton.addEventListener("click", async (e) => {
      if (e.target.tagName === "BUTTON") return; // Don't trigger on close button

      if (deferredPrompt) {
        console.log("📱 PWA: Showing install prompt");

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`📱 PWA: User response to install prompt: ${outcome}`);

        if (outcome === "accepted") {
          console.log("🎉 PWA: User accepted the install prompt");
        } else {
          console.log("😔 PWA: User dismissed the install prompt");
        }

        // Clear the deferredPrompt
        deferredPrompt = null;

        // Hide the install button
        installButton.remove();
      }
    });

    document.body.appendChild(installButton);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.remove();
      }
    }, 15000);
  };

  // Listen for app installed event
  window.addEventListener("appinstalled", (evt) => {
    console.log("🎉 PWA: App was installed successfully");

    // Hide install button if still visible
    if (installButton && installButton.parentNode) {
      installButton.remove();
    }

    // Show success message
    showInstallSuccessMessage();
  });
};

// Show install success message
const showInstallSuccessMessage = () => {
  const successMessage = document.createElement("div");
  successMessage.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      color: #333;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10001;
      text-align: center;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: popIn 0.3s ease-out;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h3 style="margin: 0 0 10px 0; font-weight: 600;">App Installed!</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">
        Amiyo-Go is now available on your home screen
      </p>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
    "></div>
    <style>
      @keyframes popIn {
        from {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
        }
        to {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }
    </style>
  `;

  document.body.appendChild(successMessage);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 3000);
};

// Push Notifications
export const initializePushNotifications = async () => {
  if ("Notification" in window && "serviceWorker" in navigator) {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log("🔔 PWA: Notification permission:", permission);

      if (permission === "granted") {
        console.log("✅ PWA: Notifications enabled");
        return true;
      } else {
        console.log("❌ PWA: Notifications denied");
        return false;
      }
    } catch (error) {
      console.error("❌ PWA: Error requesting notification permission:", error);
      return false;
    }
  } else {
    console.warn("⚠️ PWA: Notifications not supported");
    return false;
  }
};

// Send local notification
export const sendLocalNotification = (title, options = {}) => {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      vibrate: [100, 50, 100],
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  return null;
};

// Check if app is running as PWA
export const isPWA = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
};

// Get PWA display mode
export const getPWADisplayMode = () => {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }
  if (window.matchMedia("(display-mode: minimal-ui)").matches) {
    return "minimal-ui";
  }
  return "browser";
};

// Network status detection
export const initializeNetworkDetection = () => {
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    console.log(
      `🌐 PWA: Network status changed - ${isOnline ? "Online" : "Offline"}`,
    );

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("networkstatuschange", {
        detail: { isOnline },
      }),
    );

    // Show network status notification
    if (!isOnline) {
      showOfflineNotification();
    } else {
      hideOfflineNotification();
    }
  };

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  // Initial check
  updateNetworkStatus();
};

// Show offline notification
const showOfflineNotification = () => {
  const offlineNotification = document.createElement("div");
  offlineNotification.id = "pwa-offline-notification";
  offlineNotification.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 10px 20px;
      text-align: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
    ">
      <span style="margin-right: 8px;">📡</span>
      You're offline. Some features may not be available.
    </div>
  `;

  document.body.appendChild(offlineNotification);
};

// Hide offline notification
const hideOfflineNotification = () => {
  const notification = document.getElementById("pwa-offline-notification");
  if (notification) {
    notification.remove();
  }
};

// Initialize all PWA features
export const initializePWA = async () => {
  console.log("🚀 PWA: Initializing Progressive Web App features...");

  try {
    // Register service worker
    const registration = await registerServiceWorker();

    // Initialize install prompt
    initializeInstallPrompt();

    // Initialize push notifications
    await initializePushNotifications();

    // Initialize network detection
    initializeNetworkDetection();

    // Log PWA status
    console.log("📱 PWA: Display mode:", getPWADisplayMode());
    console.log("📱 PWA: Running as PWA:", isPWA());

    console.log("✅ PWA: All features initialized successfully");

    return {
      registration,
      isPWA: isPWA(),
      displayMode: getPWADisplayMode(),
    };
  } catch (error) {
    console.error("❌ PWA: Initialization failed:", error);
    return null;
  }
};
