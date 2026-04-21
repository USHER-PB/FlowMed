const CACHE_VERSION = 'v1';
const STATIC_CACHE = `healthmarket-static-${CACHE_VERSION}`;
const API_CACHE = `healthmarket-api-${CACHE_VERSION}`;
const SYNC_TAG = 'healthmarket-sync';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// API routes to cache (network-first strategy)
const CACHEABLE_API_PATTERNS = [
  /\/api\/queue\/[^/]+\/position/,
  /\/api\/appointments/,
  /\/api\/providers\/search/,
  /\/api\/providers\/[^/]+$/,
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // API routes: network-first, fall back to cache
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    const isCacheable = CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname));
    if (isCacheable) {
      event.respondWith(networkFirstApi(request));
    }
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Navigation requests: network-first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request));
  }
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushOfflineQueue());
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/locales/') ||
    /\.(js|css|woff2?|png|jpg|webp|svg|ico)$/.test(pathname)
  );
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset not available offline', { status: 503 });
  }
}

async function networkFirstNavigate(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match('/offline.html');
    return offlinePage || new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Replay queued offline actions stored in IndexedDB.
 * Actions are written by the client when a mutation fails due to no connectivity.
 */
async function flushOfflineQueue() {
  // Open the IndexedDB store written by the client
  const db = await openOfflineDb();
  const actions = await getAllActions(db);

  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json', ...action.headers },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      if (response.ok) {
        await deleteAction(db, action.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('healthmarket-offline', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllActions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('actions', 'readonly');
    const req = tx.objectStore('actions').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteAction(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('actions', 'readwrite');
    const req = tx.objectStore('actions').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
