/**
 * Service worker — Espace fournisseur POISSONNERIE DE L'EST
 *
 * Rôle : mettre en cache la coquille de l'application (HTML/manifest/icônes)
 * pour qu'elle s'ouvre hors ligne après une première visite. Les données
 * fournisseur (entrées, paiements, reçus) sont gérées séparément par l'app
 * elle-même via localStorage — ce service worker ne touche pas aux appels
 * réseau vers Apps Script, il les laisse passer normalement.
 *
 * Pour forcer une mise à jour chez les fournisseurs après une modification
 * de l'app, incrémentez CACHE_VERSION ci-dessous.
 */
const CACHE_VERSION = 'pde-supplier-v3';
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne jamais intercepter les appels vers l'API Apps Script (autre origine) :
  // on laisse le navigateur gérer le réseau/l'échec normalement, l'app gère
  // elle-même son propre cache de données (localStorage) et le mode hors ligne.
  if (url.origin !== self.location.origin) return;

  // Coquille de l'app : cache d'abord, réseau en secours, et on met à jour
  // silencieusement le cache quand le réseau répond.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
