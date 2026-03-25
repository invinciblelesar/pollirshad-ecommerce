const CACHE_NAME = 'pollirshad-store-v2'; // Updated to v2 to force clear old cache
const ASSETS_TO_CACHE =[
    '/', 
    '/index.html', 
    '/admin.html',
    '/app.js', 
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// This activate event clears out the old cache (v1) when the new service worker takes over
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('✅ Clearing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
