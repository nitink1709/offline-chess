// Offline-first service worker. Small app files go in a versioned cache; big engine files in a permanent one.
const VERSION = 'mvqrm3eq';
const SHELL = 'chess-shell-' + VERSION, BIG = 'chess-big-v1';
const SHELL_FILES = ["./","index.html","manifest.webmanifest","css/app.css","css/chessground.base.css","js/app.js","js/maia-worker.js","puzzles/starter.json","icons/icon-192.png","icons/icon-512.png","pieces/cburnett.css","sounds/Capture.mp3","sounds/Check.mp3","sounds/Checkmate.mp3","sounds/Confirmation.mp3","sounds/Defeat.mp3","sounds/Draw.mp3","sounds/GenericNotify.mp3","sounds/LowTime.mp3","sounds/Move.mp3","sounds/Victory.mp3"];
const isBig = url => /\/(engine|maia|ort)\//.test(url);
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('chess-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    if (hit) return hit;
    if (req.mode === 'navigate') { const idx = await caches.match(new URL('index.html', self.registration.scope).href); if (idx) { try { return await fetch(req); } catch { return idx; } } }
    try {
      const res = await fetch(req);
      if (res.ok && res.status === 200) { const c = await caches.open(isBig(url.pathname) ? BIG : SHELL); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const idx = await caches.match(new URL('index.html', self.registration.scope).href); if (idx) return idx; }
      throw err;
    }
  })());
});
