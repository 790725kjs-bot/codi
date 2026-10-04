// 온라인이면 항상 최신 파일을 받고, 오프라인이면 마지막으로 받은 파일로 연다.
const CACHE = 'codi-shell-v9';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'data/catalog.js', 'data/rules.js', 'data/channel.js', 'data/basics.js', 'data/demo.js',
  'js/engine.js', 'js/db.js', 'js/sync.js', 'js/bg.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return res;
    }).catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
