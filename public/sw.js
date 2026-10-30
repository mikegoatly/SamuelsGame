// Offline support for the installed app. The page registers this as sw.js?v=<app version>, so each release
// installs a fresh worker that downloads every game file (listed in precache.json at build time) and drops the old cache.
const CACHE = `samuels-game-${new URL(self.location.href).searchParams.get('v') ?? 'dev'}`;
// Servers may send `Vary: Origin`, which would stop cached module scripts matching the page's requests.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const files = await (await fetch('./precache.json', { cache: 'no-store' })).json();
      await (await caches.open(CACHE)).addAll(['./', ...files].map((file) => new Request(file, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('samuels-game-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function store(request, response) {
  if (response.ok && response.status === 200) await (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

// Pages: network first so a new release shows up, cached copy when offline.
async function page(request) {
  try {
    return await store(request, await fetch(request));
  } catch {
    return (await caches.match(request, { ...MATCH, ignoreSearch: true })) ?? (await caches.match('./', MATCH)) ?? Response.error();
  }
}

// Music streams through <audio>, which asks for byte ranges: slice them from the cached file.
async function range(request) {
  const cached = await caches.match(request.url, MATCH);
  if (!cached) return fetch(request);
  const body = await cached.arrayBuffer();
  const [, from, to] = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') ?? '') ?? [];
  const start = from ? Number(from) : Math.max(0, body.byteLength - Number(to || 0));
  const end = from && to ? Math.min(Number(to), body.byteLength - 1) : body.byteLength - 1;
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${body.byteLength}`,
      'Content-Length': String(end - start + 1),
    },
  });
}

// Everything else (scripts, art, audio, maps): cache first.
async function asset(request) {
  return (await caches.match(request, MATCH)) ?? store(request, await fetch(request));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : request.headers.has('range') ? range(request) : asset(request));
});
