// コードやデータを更新したら必ず番号を上げる（上げ忘れると端末に古い版が残る）
const CACHE_NAME = 'jazz-theory-v4';
const PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/theory.js',
  'js/staff.js',
  'js/audio.js',
  'js/quiz.js',
  'data/lessons.json',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // HTMLとJSONは新しい版をすぐ届けたいのでネット優先、それ以外は速さ優先でキャッシュから
  const isDocument = event.request.mode === 'navigate' || /\.(html|json)$/.test(url.pathname);
  event.respondWith(isDocument ? networkFirst(event.request) : cacheFirst(event.request));
});
