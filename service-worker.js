const CACHE_NAME = 'neuronexis-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/icon.png',
    '/icon-512.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css',
    'https://cdn.jsdelivr.net/npm/reveal.js@4.4.0/dist/reveal.css',
    'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js',
    'https://cdnjs.cloudflare.com/ajax/libs/docx/7.1.2/docx.min.js',
    'https://cdn.jsdelivr.net/npm/reveal.js@4.4.0/dist/reveal.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});