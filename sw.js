const CACHE = 'khadouma-v7-infinite';
const ASSETS = [
  './', './index.html', './terms.html', './privacy.html', './anti-cheat.html',
  './css/style.css', './js/app.js', './js/firebase.js', './js/i18n.js', './js/certificate.js',
  './manifest.json', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.match(/googleapis|gstatic|youtube|firebase|ytimg|google/)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  const critical = /\.(js|css|html|json)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (critical) {
    e.respondWith(fetch(e.request).then(res => {
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => {
    const fetched = fetch(e.request).then(res => {
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => cached);
    return cached || fetched;
  }));
});