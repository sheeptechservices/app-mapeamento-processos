import { describe, expect, it } from 'vitest';
import type { Processo } from './dominio';
import { dadosProcessoVazio } from './local/repo';
import { contagem, perfilProcessos } from './perfil';

let n = 0;
type P = Processo & { setor?: string | null; h?: number | null };
function proc(campos: Partial<P>): P {
  n++;
  return {
    ...dadosProcessoVazio('s1', 'c1', null),
    id: `p${n}`,
    codigo: `PRC-00${n}`,
    organizacao_id: 'sheep',
    criado_por: 'a',
    criado_em: n,
    atualizado_em: n,
    excluido: 0,
    _ts: {},
    _pendente: 0,
    ...campos,
  };
}

const lista = [
  proc({
    setor: 'Fiscal',
    h: 40,
    frequencia: 'mensal',
    nivel_automacao: 'manual',
    documentado: 'nao',
    origem_numero: 'cliente',
    sistemas: ['Domínio', 'Excel'],
    pessoas_envolvidas: 3,
  }),
  proc({
    setor: 'fiscal',
    h: 10,
    frequencia: 'diario',
    nivel_automacao: 'parcial',
    documentado: 'sim',
    origem_numero: 'medido',
    sistemas: ['excel'],
    pessoas_envolvidas: 1,
  }),
  proc({ setor: 'RH', h: 20, frequencia: 'mensal', nivel_automacao: 'manual', sistemas: ['Excel', 'Excel'] }),
  proc({ setor: null, h: null }),
];
const info = {
  setor: (p: Processo) => (p as P).setor ?? null,
  horas: (p: Processo) => (p as P).h ?? null,
  completo: (p: Processo) => (p as P).h != null,
};

describe('perfilProcessos', () => {
  const perfil = perfilProcessos(lista, info);

  it('totais: processos, horas, pessoas informadas e completos', () => {
    expect(perfil).toMatchObject({ total: 4, horas_mes: 70, pessoas: 4, completos: 3 });
  });

  it('setor junta maiúsculas, ordena pelos maiores e põe "Sem setor" no fim', () => {
    expect(perfil.setores.map(f => [f.rotulo, f.n, f.horas])).toEqual([
      ['Fiscal', 2, 50],
      ['RH', 1, 20],
      ['Sem setor', 1, 0],
    ]);
  });

  it('opções fixas na ordem delas, com "Não informado" quando falta', () => {
    expect(perfil.automacao.map(f => [f.rotulo, f.n])).toEqual([
      ['Manual', 2],
      ['Parcial', 1],
      ['Automático', 0],
      ['Não informado', 1],
    ]);
    expect(perfil.origens.map(f => f.chave)).toEqual(['estimativa', 'cliente', 'medido', '']);
    expect(contagem(perfil.documentacao, 'nao')).toBe(1);
  });

  it('frequência só com o que aparece, na ordem do período', () => {
    expect(perfil.frequencias.map(f => [f.rotulo, f.n])).toEqual([
      ['Diário', 1],
      ['Mensal', 2],
      ['Não informado', 1],
    ]);
  });

  it('sinais do radar: quantos processos têm cada sinal', () => {
    expect(Object.fromEntries(perfil.sinais.map(s => [s.chave, s.n]))).toEqual({
      manual: 2,
      sem_doc: 1,
      frequente: 1,
      prioridade: 0,
      sistemas: 1, // Excel e excel no mesmo processo contam como um só
      validar: 2,
    });
  });

  it('sistema conta uma vez por processo, juntando maiúsculas', () => {
    expect(perfil.sistemas.map(f => [f.rotulo, f.n])).toEqual([
      ['Excel', 3],
      ['Domínio', 1],
    ]);
  });
});
