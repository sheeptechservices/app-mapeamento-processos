import { describe, expect, it } from 'vitest';
import type { Processo } from './dominio';
import { contarFiltros, etiquetasAtivas, FILTROS_VAZIOS, filtrarProcessos, filtrando, type FiltrosProcesso } from './filtros';
import { dadosProcessoVazio } from './local/repo';

let n = 0;
function proc(campos: Partial<Processo> & { setor?: string; ganho?: number | null }): Processo & { setor?: string; ganho?: number | null } {
  n++;
  return {
    ...dadosProcessoVazio('s1', 'c1', null),
    id: `p${n}`,
    codigo: `PRC-00${n}`,
    organizacao_id: 'sheep',
    criado_por: 'a',
    criado_em: n * 1000,
    atualizado_em: n * 1000,
    excluido: 0,
    _ts: {},
    _pendente: 0,
    ...campos,
  };
}

const lista = [
  proc({
    titulo: 'Importação de XML de notas',
    setor: 'Fiscal',
    status: 'em_proposta',
    eisenhower: 1,
    origem_numero: 'cliente',
    gargalos: 'Erro de CFOP no SPED',
    em_risco: true,
    ganho: 2940,
  }),
  proc({
    titulo: 'Emissão de guias DAS',
    descricao: 'Gera a guia no PGDAS e manda pelo WhatsApp.',
    setor: 'Fiscal',
    status: 'em_analise',
    eisenhower: 2,
    origem_numero: 'estimativa',
    ganho: 653,
  }),
  proc({
    titulo: 'Fechamento da folha',
    setor: 'Departamento Pessoal',
    status: 'em_analise',
    eisenhower: 1,
    origem_numero: 'medido',
    ganho: 1640,
  }),
  proc({
    titulo: 'Conciliação bancária',
    setor: 'Contábil',
    status: 'pendente',
    ganho: null,
    observacoes: 'Cliente usa **três bancos**; o Sicredi não exporta OFX.',
  }),
  proc({ titulo: 'Agendamento pelo WhatsApp', setor: null as unknown as string, status: 'pendente', em_risco: true, ganho: 1200 }),
];

const info = {
  setor: (p: Processo) => (p as Processo & { setor?: string }).setor ?? null,
  ganhoMes: (p: Processo) => (p as Processo & { ganho?: number | null }).ganho ?? null,
};
const f = (mudanca: Partial<FiltrosProcesso>) => ({ ...FILTROS_VAZIOS, ...mudanca });
const titulos = (l: Processo[]) => l.map(p => p.titulo);

describe('filtrarProcessos', () => {
  it('sem filtro traz tudo, do maior ganho para o menor, sem ganho no fim', () => {
    expect(titulos(filtrarProcessos(lista, FILTROS_VAZIOS, 'todos', info))).toEqual([
      'Importação de XML de notas',
      'Fechamento da folha',
      'Agendamento pelo WhatsApp',
      'Emissão de guias DAS',
      'Conciliação bancária',
    ]);
  });

  it('abas: em análise pelo status, em risco pela marca', () => {
    expect(titulos(filtrarProcessos(lista, FILTROS_VAZIOS, 'analise', info))).toEqual(['Fechamento da folha', 'Emissão de guias DAS']);
    expect(titulos(filtrarProcessos(lista, FILTROS_VAZIOS, 'risco', info))).toEqual([
      'Importação de XML de notas',
      'Agendamento pelo WhatsApp',
    ]);
  });

  it('busca por título, setor, descrição, ID, gargalo ou observações, sem acento e sem maiúscula', () => {
    expect(titulos(filtrarProcessos(lista, f({ busca: 'conciliacao' }), 'todos', info))).toEqual(['Conciliação bancária']);
    expect(titulos(filtrarProcessos(lista, f({ busca: 'prc-002' }), 'todos', info))).toEqual(['Emissão de guias DAS']);
    expect(titulos(filtrarProcessos(lista, f({ busca: 'cfop' }), 'todos', info))).toEqual(['Importação de XML de notas']);
    expect(titulos(filtrarProcessos(lista, f({ busca: 'sicredi' }), 'todos', info))).toEqual(['Conciliação bancária']);
    // Setor (vem de fora do processo) e descrição
    expect(titulos(filtrarProcessos(lista, f({ busca: 'departamento' }), 'todos', info))).toEqual(['Fechamento da folha']);
    expect(titulos(filtrarProcessos(lista, f({ busca: 'pgdas' }), 'todos', info))).toEqual(['Emissão de guias DAS']);
    expect(filtrarProcessos(lista, f({ busca: '   ' }), 'todos', info)).toHaveLength(5);
  });

  it('setor e status aceitam vários valores', () => {
    expect(titulos(filtrarProcessos(lista, f({ setores: ['fiscal', 'Contábil'] }), 'todos', info))).toEqual([
      'Importação de XML de notas',
      'Emissão de guias DAS',
      'Conciliação bancária',
    ]);
    expect(filtrarProcessos(lista, f({ status: ['pendente', 'em_proposta'] }), 'todos', info)).toHaveLength(3);
  });

  it('prioridade e origem (sem origem informada tem filtro próprio)', () => {
    expect(titulos(filtrarProcessos(lista, f({ prioridade: [1] }), 'todos', info))).toEqual([
      'Importação de XML de notas',
      'Fechamento da folha',
    ]);
    expect(filtrarProcessos(lista, f({ origem: ['nao_informada'] }), 'todos', info)).toHaveLength(2);
  });

  it('filtro Em risco (substitui a antiga aba)', () => {
    expect(titulos(filtrarProcessos(lista, f({ soRisco: true }), 'todos', info))).toEqual([
      'Importação de XML de notas',
      'Agendamento pelo WhatsApp',
    ]);
    expect(titulos(filtrarProcessos(lista, f({ soRisco: true, setores: ['Fiscal'] }), 'todos', info))).toEqual([
      'Importação de XML de notas',
    ]);
  });

  it('filtros combinam com a aba', () => {
    expect(titulos(filtrarProcessos(lista, f({ setores: ['Fiscal'] }), 'risco', info))).toEqual(['Importação de XML de notas']);
  });

  it('ordena por recentes e de A a Z', () => {
    expect(filtrarProcessos(lista, f({ ordem: 'recentes' }), 'todos', info)[0].titulo).toBe('Agendamento pelo WhatsApp');
    expect(titulos(filtrarProcessos(lista, f({ ordem: 'az' }), 'todos', info))[0]).toBe('Agendamento pelo WhatsApp');
    expect(titulos(filtrarProcessos(lista, f({ ordem: 'az' }), 'todos', info))[1]).toBe('Conciliação bancária');
  });
});

describe('contador e etiquetas', () => {
  const ativos = f({ setores: ['Fiscal'], status: ['em_analise', 'pendente'], prioridade: [1], origem: ['estimativa'], busca: 'xml' });
  const rotulos = {
    status: (s: string) => ({ em_analise: 'Em análise', pendente: 'Pendente' })[s as 'pendente'] ?? s,
    prioridade: (e: number) => `Prioridade ${e}`,
    origem: () => 'Estimativa Sheep',
  };

  it('conta cada valor marcado, sem contar busca nem ordem', () => {
    expect(contarFiltros(ativos)).toBe(5);
    expect(contarFiltros({ ...ativos, soRisco: true })).toBe(6);
    expect(contarFiltros(FILTROS_VAZIOS)).toBe(0);
  });

  it('sabe quando há busca ou filtro em uso', () => {
    expect(filtrando(FILTROS_VAZIOS)).toBe(false);
    expect(filtrando({ ...FILTROS_VAZIOS, busca: '  ' })).toBe(false);
    expect(filtrando({ ...FILTROS_VAZIOS, busca: 'xml' })).toBe(true);
    expect(filtrando({ ...FILTROS_VAZIOS, soRisco: true })).toBe(true);
    expect(filtrando({ ...FILTROS_VAZIOS, ordem: 'az' })).toBe(false);
  });

  it('etiqueta de Em risco vem primeiro e se remove sozinha', () => {
    const e = etiquetasAtivas({ ...FILTROS_VAZIOS, soRisco: true, setores: ['Fiscal'] }, rotulos);
    expect(e.map(x => x.rotulo)).toEqual(['Em risco', 'Fiscal']);
    expect(e[0].remover({ ...FILTROS_VAZIOS, soRisco: true }).soRisco).toBe(false);
  });

  it('cada etiqueta remove só o seu valor', () => {
    const etiquetas = etiquetasAtivas(ativos, rotulos);
    expect(etiquetas.map(e => e.rotulo)).toEqual(['Fiscal', 'Em análise', 'Pendente', 'Prioridade 1', 'Estimativa Sheep']);
    const semAnalise = etiquetas[1].remover(ativos);
    expect(semAnalise.status).toEqual(['pendente']);
    expect(semAnalise.setores).toEqual(['Fiscal']);
    expect(contarFiltros(semAnalise)).toBe(4);
  });
});
