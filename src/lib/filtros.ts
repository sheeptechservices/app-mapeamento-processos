// Busca, filtros e ordenação do mapa de processos. Funções puras: a tela só
// guarda o estado dos filtros e chama daqui (e os testes também).
import type { Eisenhower, OrigemNumero, Processo, StatusProcesso } from './dominio';

export type AbaFiltro = 'todos' | 'analise' | 'risco';
export type Ordem = 'ganho' | 'recentes' | 'az';
export type OrigemFiltro = OrigemNumero | 'nao_informada';

export interface FiltrosProcesso {
  busca: string;
  /** Nomes de setor (a área de cada sessão tem um nome; o filtro é pelo nome). */
  setores: string[];
  status: StatusProcesso[];
  prioridade: Eisenhower[];
  origem: OrigemFiltro[];
  /** Só os marcados como em risco. */
  soRisco: boolean;
  ordem: Ordem;
}

export const FILTROS_VAZIOS: FiltrosProcesso = {
  busca: '',
  setores: [],
  status: [],
  prioridade: [],
  origem: [],
  soRisco: false,
  ordem: 'ganho',
};

export function semAcento(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** O que a função precisa saber de cada processo além dos campos dele. */
export interface InfoProcesso {
  setor: (p: Processo) => string | null;
  ganhoMes: (p: Processo) => number | null;
}

/** Processos da aba (Todos, Em análise, Em risco). */
export function daAba(p: Processo, aba: AbaFiltro) {
  if (aba === 'analise') return p.status === 'em_analise';
  if (aba === 'risco') return p.em_risco;
  return true;
}

/**
 * Busca no título, no setor e na descrição (e também no ID PRC-001, gargalo e
 * observações), sem diferença de acento ou maiúscula.
 */
export function casaBusca(p: Processo, busca: string, setor?: string | null) {
  const t = semAcento(busca.trim());
  if (!t) return true;
  return semAcento(
    [p.titulo, setor, p.descricao, p.codigo, p.gargalos, p.observacoes].filter(Boolean).join(' ').replace(/\s+/g, ' '),
  ).includes(t);
}

export function filtrarProcessos(processos: Processo[], f: FiltrosProcesso, aba: AbaFiltro, info: InfoProcesso): Processo[] {
  const setores = new Set(f.setores.map(semAcento));
  const lista = processos.filter(p => {
    if (!daAba(p, aba) || !casaBusca(p, f.busca, info.setor(p))) return false;
    if (setores.size) {
      const s = info.setor(p);
      if (!s || !setores.has(semAcento(s))) return false;
    }
    if (f.status.length && !f.status.includes(p.status)) return false;
    if (f.prioridade.length && (p.eisenhower == null || !f.prioridade.includes(p.eisenhower))) return false;
    if (f.origem.length && !f.origem.includes(p.origem_numero ?? 'nao_informada')) return false;
    if (f.soRisco && !p.em_risco) return false;
    return true;
  });
  return ordenar(lista, f.ordem, info);
}

export function ordenar(lista: Processo[], ordem: Ordem, info: InfoProcesso): Processo[] {
  const copia = [...lista];
  if (ordem === 'recentes') return copia.sort((a, b) => b.criado_em - a.criado_em);
  if (ordem === 'az') return copia.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'));
  // Maior ganho primeiro; quem não tem ganho calculado vai para o fim, por código.
  return copia.sort((a, b) => {
    const ga = info.ganhoMes(a);
    const gb = info.ganhoMes(b);
    if (ga == null && gb == null) return a.codigo.localeCompare(b.codigo);
    if (ga == null) return 1;
    if (gb == null) return -1;
    return gb - ga;
  });
}

/** Quantos valores de filtro estão marcados (o contador do botão Filtros). */
export function contarFiltros(f: FiltrosProcesso) {
  return f.setores.length + f.status.length + f.prioridade.length + f.origem.length + (f.soRisco ? 1 : 0);
}

/** Há busca ou filtro em uso (a árvore abre só as pastas com resultado). */
export function filtrando(f: FiltrosProcesso) {
  return f.busca.trim().length > 0 || contarFiltros(f) > 0;
}

export interface EtiquetaFiltro {
  chave: string;
  rotulo: string;
  remover: (f: FiltrosProcesso) => FiltrosProcesso;
}

/** Etiquetas removíveis dos filtros ativos, na ordem dos grupos. */
export function etiquetasAtivas(
  f: FiltrosProcesso,
  rotulos: { status: (s: StatusProcesso) => string; prioridade: (e: Eisenhower) => string; origem: (o: OrigemFiltro) => string },
): EtiquetaFiltro[] {
  return [
    ...(f.soRisco ? [{ chave: 'risco', rotulo: 'Em risco', remover: (x: FiltrosProcesso) => ({ ...x, soRisco: false }) }] : []),
    ...f.setores.map(s => ({
      chave: `setor:${s}`,
      rotulo: s,
      remover: (x: FiltrosProcesso) => ({ ...x, setores: x.setores.filter(v => v !== s) }),
    })),
    ...f.status.map(s => ({
      chave: `status:${s}`,
      rotulo: rotulos.status(s),
      remover: (x: FiltrosProcesso) => ({ ...x, status: x.status.filter(v => v !== s) }),
    })),
    ...f.prioridade.map(e => ({
      chave: `prioridade:${e}`,
      rotulo: rotulos.prioridade(e),
      remover: (x: FiltrosProcesso) => ({ ...x, prioridade: x.prioridade.filter(v => v !== e) }),
    })),
    ...f.origem.map(o => ({
      chave: `origem:${o}`,
      rotulo: rotulos.origem(o),
      remover: (x: FiltrosProcesso) => ({ ...x, origem: x.origem.filter(v => v !== o) }),
    })),
  ];
}
