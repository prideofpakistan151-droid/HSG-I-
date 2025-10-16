// Service Worker for Hostel Bill Manager Pro

const CACHE_NAME = 'hostel-bill-manager-v1.2.0';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/add-bill.html',
  '/analytics.html',
  '/quick-split.html',
  '/budget.html',
  '/settings.html',
  '/roommates.html',
  '/categories.html',
  '/styles/common.css',
  '/styles/dark-mode.css',
  '/styles/animations.css',
  '/styles/add-bill.css',
  '/styles/analytics.css',
  '/styles/quick-split.css',
  '/styles/budget.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/theme.js',
  '/js/analytics.js',
  '/js/quick-split.js',
  '/js/budget.js',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Install completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Activate completed');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if found
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            // Cache the new response
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch failed', error);
            
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            
            // For API calls, return a simple error response
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync-bills') {
    event.waitUntil(syncPendingBills());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Bill Manager',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hostel Bill Manager', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'dismiss') {
    // Notification dismissed
    console.log('Notification dismissed');
  } else {
    // Main notification body clicked
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Background sync function for pending bills
async function syncPendingBills() {
  // Get pending bills from IndexedDB or localStorage
  const pendingBills = await getPendingBills();
  
  if (pendingBills.length === 0) {
    return;
  }

  // In a real app, you would send these to your server
  console.log('Syncing pending bills:', pendingBills);
  
  // Clear pending bills after successful sync
  await clearPendingBills();
}

// Helper functions for background sync
async function getPendingBills() {
  return new Promise((resolve) => {
    // This would typically use IndexedDB
    // For now, we'll use localStorage as a simple solution
    const pending = localStorage.getItem('pendingBills');
    resolve(pending ? JSON.parse(pending) : []);
  });
}

async function clearPendingBills() {
  return new Promise((resolve) => {
    localStorage.removeItem('pendingBills');
    resolve();
  });
}

// Periodic sync for background updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'background-update') {
    console.log('Service Worker: Periodic background sync');
    event.waitUntil(doBackgroundUpdate());
  }
});

async function doBackgroundUpdate() {
  // Update cached data in the background
  // This could include updating exchange rates, syncing with server, etc.
  console.log('Performing background update');
  
  // Example: Update currency rates
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
    const data = await response.json();
    
    // Cache the updated rates
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.put('/api/rates', new Response(JSON.stringify(data)));
    
    console.log('Background update completed');
  } catch (error) {
    console.error('Background update failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_BILLS') {
    cacheBillsData(event.data.bills);
  }
});

async function cacheBillsData(bills) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(bills));
    await cache.put('/api/bills', response);
    console.log('Bills data cached successfully');
  } catch (error) {
    console.error('Failed to cache bills data:', error);
  }
}
