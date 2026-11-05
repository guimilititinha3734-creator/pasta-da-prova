// Service worker do Pasta da Prova (deixa o app instalável).
// Estratégia simples e segura: SEMPRE busca na internet (os dados são
// privados e mudam o tempo todo). Sem internet, mostra uma página amigável.
const CACHE = "pasta-da-prova-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Só interfere na abertura de páginas; o resto vai direto para a rede
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
