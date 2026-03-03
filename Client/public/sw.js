const CACHE_NAME = "hnilabazar-v1.0.1";
const STATIC_CACHE = "hnilabazar-static-v1.0.1";
const DYNAMIC_CACHE = "hnilabazar-dynamic-v1.0.1";

// Assets to cache immediately
const STATIC_ASSETS = ["/", "/offline.html", "/manifest.json"];

// API endpoints that should NEVER be cached (always fresh)
const NO_CACHE_PATTERNS = [
  /\/api\/wishlist/,
  /\/api\/cart/,
  /\/api\/orders/,
  /\/api\/user/,
  /\/api\/auth/,
  /\/api\/checkout/,
  /\/api\/payment/,
];

// API endpoints that can be cached with network-first strategy
const API_CACHE_PATTERNS = [/\/api\/products/, /\/api\/categories/];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("📦 Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("✅ Service Worker: Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Installation failed", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("🗑️ Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Activation complete");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  const { request } = event;

  try {
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") {
      return;
    }

    // Skip unsupported schemes and browser extensions
    if (
      !url.protocol.startsWith("http") ||
      url.protocol === "chrome-extension:" ||
      url.protocol === "moz-extension:" ||
      url.protocol === "safari-extension:" ||
      url.protocol === "edge-extension:" ||
      url.protocol === "opera-extension:" ||
      url.hostname.includes("extension") ||
      url.hostname.includes("chrome") ||
      url.hostname.includes("moz") ||
      request.url.includes("chrome-extension") ||
      request.url.includes("moz-extension")
    ) {
      console.log(
        "🚫 Service Worker: Skipping unsupported request:",
        request.url,
      );
      return;
    }

    // Skip third-party analytics and tracking
    if (
      url.hostname.includes("google-analytics") ||
      url.hostname.includes("googletagmanager") ||
      url.hostname.includes("facebook") ||
      url.hostname.includes("tawk.to") ||
      url.hostname.includes("hotjar") ||
      url.hostname.includes("mixpanel")
    ) {
      console.log(
        "🚫 Service Worker: Skipping third-party request:",
        request.url,
      );
      return;
    }

    // Handle API requests
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(handleApiRequest(request));
      return;
    }

    // Handle navigation requests
    if (request.mode === "navigate") {
      event.respondWith(handleNavigationRequest(request));
      return;
    }

    // Handle other requests (images, CSS, JS)
    event.respondWith(handleResourceRequest(request));
  } catch (error) {
    console.error("🚫 Service Worker: Error processing fetch event:", error);
    // Let the browser handle the request normally
    return;
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const url = new URL(request.url);

    // Check if this API should NEVER be cached
    const shouldNeverCache = NO_CACHE_PATTERNS.some((pattern) =>
      pattern.test(url.pathname),
    );

    if (shouldNeverCache) {
      // Always fetch fresh data, no caching
      console.log(
        "🔄 Service Worker: Fetching fresh data (no cache):",
        request.url,
      );
      return await fetch(request);
    }

    // Check if this API can be cached
    const canCache = API_CACHE_PATTERNS.some((pattern) =>
      pattern.test(url.pathname),
    );

    if (!canCache) {
      // For non-cacheable APIs, just try network
      return await fetch(request);
    }

    // Network-first strategy for cacheable APIs
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Cache successful responses with short TTL
        try {
          const cache = await caches.open(DYNAMIC_CACHE);
          const responseToCache = networkResponse.clone();

          // Add timestamp to track cache age
          const headers = new Headers(responseToCache.headers);
          headers.set("sw-cached-at", Date.now().toString());

          await cache.put(
            request,
            new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: headers,
            }),
          );
        } catch (cacheError) {
          console.warn(
            "⚠️ Service Worker: Failed to cache:",
            cacheError.message,
          );
        }
      }

      return networkResponse;
    } catch (error) {
      // Network failed, try cache as fallback
      console.log("📡 Service Worker: Network failed, trying cache");
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        // Check cache age (max 5 minutes)
        const cachedAt = cachedResponse.headers.get("sw-cached-at");
        if (cachedAt) {
          const age = Date.now() - parseInt(cachedAt);
          if (age > 5 * 60 * 1000) {
            // 5 minutes
            console.log(
              "⚠️ Service Worker: Cache too old, returning offline response",
            );
            throw error;
          }
        }
        return cachedResponse;
      }

      // Return offline response
      return new Response(
        JSON.stringify({
          success: false,
          error: "Content not available offline",
          offline: true,
          data: [],
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("🚫 Service Worker: Error in API request handler:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Service worker error",
        offline: true,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Network failed, serve cached page or offline page
    console.log(
      "📡 Service Worker: Navigation offline, serving cached content",
    );

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve offline page
    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) {
      return offlinePage;
    }

    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - HnilaBazar</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 30px; }
            .retry-btn { 
              background: #3B82F6; color: white; border: none; 
              padding: 12px 24px; border-radius: 6px; cursor: pointer;
              font-size: 16px;
            }
            .retry-btn:hover { background: #2563EB; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

// Handle resource requests (images, CSS, JS)
async function handleResourceRequest(request) {
  try {
    const url = new URL(request.url);

    // Skip unsupported schemes
    if (!url.protocol.startsWith("http")) {
      console.log(
        "🚫 Service Worker: Skipping unsupported scheme:",
        url.protocol,
      );
      return fetch(request);
    }

    // Skip chrome-extension and other browser-specific requests
    if (
      url.protocol === "chrome-extension:" ||
      url.protocol === "moz-extension:" ||
      url.protocol === "safari-extension:" ||
      url.hostname.includes("extension") ||
      request.url.includes("chrome-extension") ||
      request.url.includes("moz-extension")
    ) {
      console.log(
        "🚫 Service Worker: Skipping browser extension request:",
        request.url,
      );
      return fetch(request);
    }

    // Try cache first for resources
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok && url.protocol.startsWith("http")) {
      // Only cache HTTP/HTTPS responses
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        // Clone the response before caching
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn(
          "⚠️ Service Worker: Failed to cache request:",
          request.url,
          cacheError.message,
        );
      }
    }

    return networkResponse;
  } catch (error) {
    console.log("📡 Service Worker: Network failed for resource:", request.url);

    // For images, return a placeholder
    if (request.destination === "image") {
      return new Response(
        `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f3f4f6"/>
          <text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">
            Image Unavailable
          </text>
        </svg>
      `,
        {
          headers: { "Content-Type": "image/svg+xml" },
        },
      );
    }

    throw error;
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("🔄 Service Worker: Background sync triggered", event.tag);

  if (event.tag === "background-sync-cart") {
    event.waitUntil(syncCartData());
  }

  if (event.tag === "background-sync-wishlist") {
    event.waitUntil(syncWishlistData());
  }
});

// Sync cart data when back online
async function syncCartData() {
  try {
    // Get pending cart actions from IndexedDB
    const pendingActions = await getPendingCartActions();

    for (const action of pendingActions) {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });

        // Remove from pending actions
        await removePendingCartAction(action.id);
      } catch (error) {
        console.error("Failed to sync cart action:", error);
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Sync wishlist data when back online
async function syncWishlistData() {
  try {
    // Similar implementation for wishlist
    console.log("Syncing wishlist data...");
  } catch (error) {
    console.error("Wishlist sync failed:", error);
  }
}

// Push notification event
self.addEventListener("push", (event) => {
  console.log("📬 Service Worker: Push notification received");

  let notificationData = {
    title: "HnilaBazar",
    body: "You have new updates from HnilaBazar!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: "/",
    },
    actions: [
      {
        action: "view",
        title: "View Details",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-96x96.png",
      },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log("📬 Push data received:", data);

      // Update notification with received data
      notificationData.title = data.title || notificationData.title;
      notificationData.body = data.body || notificationData.body;
      notificationData.icon = data.icon || notificationData.icon;
      notificationData.badge = data.badge || notificationData.badge;
      notificationData.tag = data.tag || "default";
      notificationData.data = { ...notificationData.data, ...data.data };

      // Customize actions based on notification type
      if (data.type === "order_status") {
        notificationData.actions = [
          {
            action: "view_order",
            title: "View Order",
            icon: "/icons/icon-96x96.png",
          },
          {
            action: "close",
            title: "Close",
            icon: "/icons/icon-96x96.png",
          },
        ];
      } else if (data.type === "flash_sale") {
        notificationData.actions = [
          {
            action: "view_sale",
            title: "Shop Now",
            icon: "/icons/icon-96x96.png",
          },
          {
            action: "close",
            title: "Close",
            icon: "/icons/icon-96x96.png",
          },
        ];
      } else if (data.type === "back_in_stock") {
        notificationData.actions = [
          {
            action: "view_product",
            title: "View Product",
            icon: "/icons/icon-96x96.png",
          },
          {
            action: "close",
            title: "Close",
            icon: "/icons/icon-96x96.png",
          },
        ];
      }
    } catch (error) {
      console.error("❌ Error parsing push data:", error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData,
    ),
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Service Worker: Notification clicked", event.action);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = "/";

  // Determine target URL based on action and notification data
  if (
    event.action === "view_order" ||
    notificationData.type === "order_status"
  ) {
    targetUrl = notificationData.url || "/orders";
  } else if (
    event.action === "view_sale" ||
    notificationData.type === "flash_sale"
  ) {
    targetUrl = notificationData.url || "/flash-sales";
  } else if (
    event.action === "view_product" ||
    notificationData.type === "back_in_stock"
  ) {
    targetUrl = notificationData.url || "/products";
  } else if (event.action === "close") {
    // Just close the notification
    return;
  } else if (notificationData.url) {
    // Use URL from notification data
    targetUrl = notificationData.url;
  }

  // Open the target URL
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          // Navigate existing window to target URL
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

// Helper functions for IndexedDB operations
async function getPendingCartActions() {
  // Implementation for getting pending actions from IndexedDB
  return [];
}

async function removePendingCartAction(id) {
  // Implementation for removing action from IndexedDB
  console.log("Removing pending cart action:", id);
}

// Message event for communication with main thread
self.addEventListener("message", (event) => {
  console.log("💬 Service Worker: Message received", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "DEBUG_INFO") {
    console.log("🔧 Service Worker Debug Info:", {
      caches: STATIC_CACHE + ", " + DYNAMIC_CACHE,
      timestamp: event.data.timestamp,
      version: "1.0.0",
    });
  }
});

console.log("🎉 Service Worker: Script loaded successfully");
