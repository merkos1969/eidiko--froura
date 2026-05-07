const CACHE_NAME = 'eidiko-froura-v2';

const urlsToCache = [
  '/eidiko--froura/',
  '/eidiko--froura/index.html',
  '/eidiko--froura/style.css',
  '/eidiko--froura/app.js',
  '/eidiko--froura/data.js',
  '/eidiko--froura/splash.png'
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
