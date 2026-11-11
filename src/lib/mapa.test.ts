import { describe, expect, it } from 'vitest';
import type { Cliente, Processo, Sessao } from './dominio';
import { dadosClienteVazio, dadosProcessoVazio, dadosSessaoVazia } from './local/repo';
import { montarMapa } from './mapa';

const base = { organizacao_id: 'sheep', criado_por: 'a', atualizado_em: 0, excluido: 0 as const, _ts: {}, _pendente: 0 as const };
const cliente = (id: string, nome: string): Cliente => ({ ...dadosClienteVazio(), ...base, id, nome, criado_em: 0 });
const sessao = (id: string, cliente_id: string, data: string): Sessao => ({ ...dadosSessaoVazia(cliente_id), ...base, id, data, criado_em: 0 });
const processo = (id: string, sessao_id: string, cliente_id: string): Processo => ({
  ...dadosProcessoVazio(sessao_id, cliente_id, null),
  ...base,
  id,
  codigo: id,
  criado_em: 0,
});

const clientes = [cliente('c1', 'Contabilidade Horizonte'), cliente('c2', 'Clínica Vida Plena'), cliente('c3', 'Cliente sem sessão')];
const sessoes = [sessao('s1', 'c1', '2026-09-10'), sessao('s2', 'c1', '2026-10-20'), sessao('s3', 'c2', '2026-10-30')];
const processos = [processo('p1', 's1', 'c1'), processo('p2', 's1', 'c1'), processo('p3', 's3', 'c2')];

describe('montarMapa', () => {
  it('cliente > sessões (mais recente primeiro) > processos', () => {
    const mapa = montarMapa(clientes, sessoes, processos, false);
    expect(mapa.map(c => c.cliente.id)).toEqual(['c1', 'c2', 'c3']);
    expect(mapa[0].sessoes.map(s => s.sessao.id)).toEqual(['s2', 's1']);
    expect(mapa[0].sessoes[1].processos.map(p => p.id)).toEqual(['p1', 'p2']);
    expect(mapa[0].total).toBe(2);
  });

  it('sem filtro mostra pasta vazia (cliente sem sessão, sessão sem processo)', () => {
    const mapa = montarMapa(clientes, sessoes, processos, false);
    expect(mapa[2].sessoes).toEqual([]);
    expect(mapa[0].sessoes[0].processos).toEqual([]);
  });

  it('com filtro mostra só as pastas com resultado', () => {
    const mapa = montarMapa(clientes, sessoes, [processos[2]], true);
    expect(mapa.map(c => c.cliente.id)).toEqual(['c2']);
    expect(mapa[0].sessoes.map(s => s.sessao.id)).toEqual(['s3']);
  });

  it('cliente que a busca achou pelo nome aparece inteiro, mesmo sem processo encontrado', () => {
    const mapa = montarMapa(clientes, sessoes, [], true, new Set(['c3', 'c1']));
    expect(mapa.map(c => c.cliente.id)).toEqual(['c1', 'c3']);
    expect(mapa[0].sessoes.map(s => s.sessao.id)).toEqual(['s2', 's1']);
  });

  it('mantém a ordem dos processos que já vieram ordenados', () => {
    const mapa = montarMapa(clientes, sessoes, [processos[1], processos[0]], false);
    expect(mapa[0].sessoes[1].processos.map(p => p.id)).toEqual(['p2', 'p1']);
  });
});
