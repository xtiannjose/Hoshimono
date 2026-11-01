// Hoshimono's service worker (ADR 0017). Shop pages and pictures already
// seen still open on a weak or no connection; anything personal or that
// moves money or stock always goes to the network and is never stored.
// Bump VERSION to drop every stored copy.

const VERSION = "1";
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const OFFLINE = { en: "/offline", fil: "/fil/offline" };
// ponytail: a plain cap on stored pictures and pages; least-recently-stored
// goes first, enough for a phone without tracking use.
const MAX_ENTRIES = 150;

// Staff screens, the API, and the Customer's own pages (Cart, Checkout,
// payment, Orders, account, sign-in and signed links).
const NEVER =
  /^\/(?:admin|api)(?:\/|$)|^\/(?:fil\/)?(?:cart|checkout|orders|account|sign-in|dev|stop|s|r)(?:\/|$)/;
// Built files have the build in their name; photos and icons do not change.
const FILE = /^\/(?:_next\/static\/|_next\/image|media\/|icon\/)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(Object.values(OFFLINE)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PAGES && key !== FILES)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function keep(name, request, response) {
  const cache = await caches.open(name);
  await cache.put(request, response);
  const keys = await cache.keys();
  const offline = Object.values(OFFLINE);
  const old = keys.filter((k) => !offline.includes(new URL(k.url).pathname));
  for (const key of old.slice(0, Math.max(0, old.length - MAX_ENTRIES))) {
    await cache.delete(key);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || NEVER.test(url.pathname)) return;

  if (FILE.test(url.pathname)) {
    // Stored first: these never change at the same address.
    event.respondWith(
      caches.match(request).then(
        (stored) =>
          stored ??
          fetch(request).then((response) => {
            if (response.ok)
              event.waitUntil(keep(FILES, request, response.clone()));
            return response;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    // The network first, so prices and stock are current; the last copy
    // when there is no connection, else the offline page.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok)
            event.waitUntil(keep(PAGES, request, response.clone()));
          return response;
        })
        .catch(async () => {
          const offline = url.pathname.startsWith("/fil")
            ? OFFLINE.fil
            : OFFLINE.en;
          return (await caches.match(request)) ?? caches.match(offline);
        })
    );
  }
});
