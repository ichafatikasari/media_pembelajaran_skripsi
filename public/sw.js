const CACHE_NAME = /*__CACHE_VERSION__*/ 'duel-otak-app-shell-v3';
const BUILT_ASSETS = /*__PRECACHE_MANIFEST__*/ [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of BUILT_ASSETS) {
        try {
          await cache.add(asset);
        } catch {
          // Lewati berkas opsional bila tidak ada
        }
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('duel-otak-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let reqUrl;
  try {
    reqUrl = new URL(req.url);
  } catch {
    return;
  }

  // JANGAN mencegat permintaan lintas-origin (termasuk Firebase Firestore/Auth/Google) atau jalur internal
  if (
    reqUrl.origin !== self.location.origin ||
    reqUrl.pathname.startsWith('/__/') ||
    reqUrl.pathname.startsWith('/api/') ||
    reqUrl.pathname.startsWith('/src/') ||
    reqUrl.pathname.startsWith('/node_modules/') ||
    reqUrl.pathname.startsWith('/@')
  ) {
    return;
  }

  // Navigasi: jaringan dulu dengan cadangan cache saat offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const salinan = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', salinan)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('./index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('./');
          if (cachedRoot) return cachedRoot;
          return Response.error();
        })
    );
    return;
  }

  // Berkas app shell (JS, CSS, font, ikon): cache-first dengan pembaruan di latar belakang
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }

      const netRes = await fetchPromise;
      return netRes || Response.error();
    })
  );
});
