// Árvore do Mapa de processo: pasta de cliente > pasta de sessão > processos.
// Função pura: a tela só desenha o resultado (e os testes conferem a montagem).
import type { Cliente, Processo, Sessao } from './dominio';

export interface PastaSessao {
  sessao: Sessao;
  processos: Processo[];
}

export interface PastaCliente {
  cliente: Cliente;
  sessoes: PastaSessao[];
  /** Processos visíveis no cliente (somando as sessões). */
  total: number;
}

/**
 * `processos` já vem filtrado e ordenado. Sem filtro, todas as pastas aparecem
 * (inclusive cliente sem sessão e sessão vazia, para dá-las de criar). Com
 * filtro, só aparecem as pastas que têm algum processo encontrado, menos os
 * clientes de `inteiros` (a busca acertou o nome deles): esses aparecem com
 * todas as sessões, mesmo vazias.
 */
export function montarMapa(
  clientes: Cliente[],
  sessoes: Sessao[],
  processos: Processo[],
  filtrando: boolean,
  inteiros: Set<string> = new Set(),
): PastaCliente[] {
  const porSessao = new Map<string, Processo[]>();
  for (const p of processos) porSessao.set(p.sessao_id, [...(porSessao.get(p.sessao_id) ?? []), p]);

  return clientes
    .map(cliente => {
      const pastas = sessoes
        .filter(s => s.cliente_id === cliente.id)
        // Sessão mais recente primeiro.
        .sort((a, b) => b.data.localeCompare(a.data) || b.criado_em - a.criado_em)
        .map(sessao => ({ sessao, processos: porSessao.get(sessao.id) ?? [] }))
        .filter(p => !filtrando || inteiros.has(cliente.id) || p.processos.length > 0);
      return { cliente, sessoes: pastas, total: pastas.reduce((s, p) => s + p.processos.length, 0) };
    })
    .filter(c => !filtrando || inteiros.has(c.cliente.id) || c.total > 0);
}
