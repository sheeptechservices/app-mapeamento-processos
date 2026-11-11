// Service worker do Sheep Levantamento: faz o app abrir sem rede.
//
// - Página: o app é uma página só, HTML estático (cliente, sessão e processo vêm
//   na query string), então ela cobre qualquer sessão. Rede primeiro; sem rede, cache.
// - Arquivos do build (/_next/static): imutáveis, cache primeiro.
// - /api: nunca passa pelo cache (sincronização e login são sempre ao vivo).
//
// A versão vem de ?v= no registro (uma por deploy): cada versão tem caches
// próprios e a ativação apaga os antigos.

const VERSAO = new URL(self.location.href).searchParams.get('v') || 'dev';
const PAGINAS = `sl-paginas-${VERSAO}`;
const ESTATICOS = `sl-estaticos-${VERSAO}`;

// Mesma lista de PAGINAS_OFFLINE em src/lib/rotas.ts (um teste confere).
const PAGINAS_OFFLINE = ['/'];
const EXTRAS = ['/manifest.webmanifest', '/icones/192', '/icones/512'];

async function guardarPagina(cache, caminho, resposta) {
  // Redirecionada é a tela de entrar (sem sessão): não serve como cópia offline.
  if (!resposta.ok || resposta.redirected || resposta.type === 'opaqueredirect') return null;
  await cache.put(caminho, resposta.clone());
  return resposta;
}

/** Baixa as páginas e tudo de /_next/static que o HTML delas cita. */
async function preCachear() {
  const [paginas, estaticos] = await Promise.all([caches.open(PAGINAS), caches.open(ESTATICOS)]);
  const arquivos = new Set(EXTRAS);
  await Promise.all(
    PAGINAS_OFFLINE.map(async caminho => {
      try {
        const r = await fetch(caminho, { credentials: 'same-origin', cache: 'no-store' });
        if (!(await guardarPagina(paginas, caminho, r))) return;
        const html = await r.clone().text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) arquivos.add(m[0]);
      } catch {
        /* sem rede durante a instalação: tenta de novo na próxima mensagem */
      }
    }),
  );
  await Promise.all(
    [...arquivos].map(async url => {
      if (await estaticos.match(url)) return;
      try {
        const r = await fetch(url, { credentials: 'same-origin' });
        if (r.ok) await estaticos.put(url, r);
      } catch {}
    }),
  );
}

self.addEventListener('install', evento => {
  evento.waitUntil(preCachear().then(() => self.skipWaiting()));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter(n => n.startsWith('sl-') && n !== PAGINAS && n !== ESTATICOS).map(n => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// O app pede um novo pré-cache depois do login (antes dele as páginas redirecionam).
self.addEventListener('message', evento => {
  if (evento.data && evento.data.tipo === 'pre-cachear') evento.waitUntil(preCachear());
});

function comPrazo(promessa, ms) {
  return Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error('prazo')), ms))]);
}

async function navegar(pedido) {
  const url = new URL(pedido.url);
  const paginas = await caches.open(PAGINAS);
  try {
    // Rede lenta no cliente (4G ruim) não pode segurar a tela: 4 s e cai para o cache.
    const r = await comPrazo(fetch(pedido), 4000);
    await guardarPagina(paginas, url.pathname, r);
    return r;
  } catch {
    const copia =
      (await paginas.match(url.pathname)) ||
      (await paginas.match('/'));
    if (copia) return copia;
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sem conexão</title>' +
        '<body style="font-family:system-ui;padding:32px;background:#f8f8f6;color:#121316">' +
        '<h1 style="font-size:20px">Sem conexão</h1><p>Abra o app uma vez com internet para ele funcionar offline.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

async function cachePrimeiro(pedido) {
  const estaticos = await caches.open(ESTATICOS);
  const copia = await estaticos.match(pedido);
  if (copia) return copia;
  const r = await fetch(pedido);
  if (r.ok) await estaticos.put(pedido, r.clone());
  return r;
}

async function redePrimeiro(pedido) {
  const estaticos = await caches.open(ESTATICOS);
  try {
    const r = await fetch(pedido);
    if (r.ok) await estaticos.put(pedido, r.clone());
    return r;
  } catch {
    const copia = await estaticos.match(pedido, { ignoreSearch: true });
    if (copia) return copia;
    throw new Error('offline');
  }
}

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith(navegar(pedido));
    return;
  }
  // Payload RSC de navegação no cliente: sempre da rede. Sem rede, a falha faz o
  // Next cair para navegação comum, que o `navegar` acima atende pelo cache.
  if (pedido.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    evento.respondWith(cachePrimeiro(pedido));
    return;
  }
  if (EXTRAS.includes(url.pathname) || url.pathname.startsWith('/apple-icon')) {
    evento.respondWith(redePrimeiro(pedido));
  }
});
