/* Lembra Aí! — service worker (offline + cliques nas notificações) */
const V = 'lembraai-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // rede primeiro (pra pegar atualizações), cache se estiver offline
    e.respondWith(
      fetch(req)
        .then((r) => { const c = r.clone(); caches.open(V).then((ca) => ca.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(V).then((ca) => ca.put(req, c)); }
      return r;
    }))
  );
});

self.addEventListener('notificationclick', (e) => {
  const n = e.notification;
  n.close();
  const id = (n.data && n.data.id) || '';
  const acao = e.action || 'ver';
  const url = new URL('./?acao=' + encodeURIComponent(acao) + '&id=' + encodeURIComponent(id), self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope)) {
          c.postMessage({ type: 'acao', acao, id });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
