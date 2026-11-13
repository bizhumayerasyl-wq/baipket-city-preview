// Оффлайн режим: алдымен желіден алады (браузер кэшін айналып, әрдайым жаңа нұсқа), желі болмаса — сақталған көшірмеден.
const CACHE = 'baipket-city-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'js/main.js', 'js/data.js', 'js/economy.js', 'js/game.js', 'js/world.js', 'vendor/three-0.160.0.module.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
