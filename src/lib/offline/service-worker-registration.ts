'use client';

const SW_PATH = '/sw.js';

/**
 * Registers the Service Worker and handles updates.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    // Notify the user (or auto-reload) when a new SW version is waiting
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // A new version is ready — dispatch a custom event so the UI can
          // show a "Refresh to update" banner if desired.
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return registration;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

/**
 * Queues an offline action in IndexedDB so the Service Worker can replay it
 * once connectivity is restored.
 */
export async function queueOfflineAction(action: {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('actions', 'readwrite');
    const req = tx.objectStore('actions').add(action);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Ask the SW to sync as soon as possible
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(
      'healthmarket-sync'
    );
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('healthmarket-offline', 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('actions', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}
