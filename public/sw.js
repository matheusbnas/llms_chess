// LLM Chess Arena Service Worker
const CACHE_NAME = "llm-chess-arena-v1";
const urlsToCache = [
  "/",
  "/css/main.css",
  "/css/responsive.css",
  "/css/chessboard.css",
  "/css/arena.css",
  "/css/dashboard.css",
  "/css/play.css",
  "/js/app.js",
  "/js/api.js",
  "/js/utils.js",
  "/js/charts.js",
  "/js/chessboard.js",
  "/js/pgn_viewer.js",
  "/js/dashboard.js",
  "/js/arena.js",
  "/js/play.js",
  "/js/rankings.js",
  "/js/settings.js",
  "/js/chess_arena_manager.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js",
];

// Install event - cache resources
self.addEventListener("install", function (event) {
  console.log("♟️ Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        console.log("♟️ Service Worker: Caching files");
        return cache.addAll(urlsToCache);
      })
      .catch(function (error) {
        console.log("♟️ Service Worker: Cache failed", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", function (event) {
  console.log("♟️ Service Worker: Activating...");

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("♟️ Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", function (event) {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then(function (response) {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request).then(function (response) {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(function () {
        // Return offline page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      })
  );
});

// Handle messages from the main thread
self.addEventListener("message", function (event) {
  console.log("♟️ Service Worker: Received message", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for game data (if supported)
if ("sync" in self.registration) {
  self.addEventListener("sync", function (event) {
    if (event.tag === "background-sync-games") {
      console.log("♟️ Service Worker: Background sync for games");
      // Handle background sync for game data
    }
  });
}

console.log("♟️ Service Worker: Loaded successfully");
