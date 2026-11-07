/* Julelys-beregner – service worker.
   Versionen kommer fra index.html (APP_VERSION sendes med som ?v=...), så den kun skal ændres ét sted.
   App-filer: netværk-først (nyeste udgave når der er net, ellers den gemte kopi).
   Google Fonts: cache-først (de er uforanderlige) → virker offline efter første besøg. */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'julelys-' + VERSION;
const FONT_CACHE = 'julelys-fonts';
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const FILES = [
  './', 'index.html', 'manifest.json',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

/* ny version: slet gamle app-kopier (ikke font-cachen) og tag over med det samme */
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k.startsWith('julelys-') && k !== CACHE && k !== FONT_CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Google Fonts: cache-først */
  if (FONT_ORIGINS.includes(url.origin)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(FONT_CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit || Response.error())));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* App-filer: netværk-først, fald tilbage til cache (og index.html ved navigation) */
  const net = req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache' })
    : fetch(req, { cache: 'no-cache' });
  e.respondWith(net
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
