const CACHE_NAME = 'pollirshad-store-v3'; // Version Bumped
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
    // API Call বা POST request গুলো ক্যাশ করা যাবে না, এগুলো সরাসরি সার্ভারে যাবে
    if (e.request.url.includes('/api/') || e.request.method !== 'GET') {
        return; 
    }
    
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
