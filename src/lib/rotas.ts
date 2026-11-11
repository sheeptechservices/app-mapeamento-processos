// O app é uma página só, o Mapa de processos, em `/`. O que está aberto (pasta
// de cliente, sessão, processo) vai na query string: o HTML é sempre o mesmo,
// então o service worker guarda uma página e o app abre sem rede em qualquer
// cliente ou sessão, mesmo nunca abertos naquele aparelho.

function query(params: Record<string, string | null | undefined>) {
  const q = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&');
  return q ? `?${q}` : '';
}

export const rotas = {
  mapa: (o: { cliente?: string | null; sessao?: string | null; processo?: string | null } = {}) =>
    `/${query({ c: o.cliente, s: o.sessao, p: o.processo })}`,
};

/** Páginas que precisam abrir offline. O service worker pré-cacheia esta lista. */
export const PAGINAS_OFFLINE = ['/'];
