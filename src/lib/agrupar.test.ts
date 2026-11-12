import { describe, expect, it } from 'vitest';
import { agruparProcessos } from './agrupar';
import type { Processo } from './dominio';
import { dadosProcessoVazio } from './local/repo';

let n = 0;
function proc(campos: Partial<Processo> & { setor?: string | null }): Processo & { setor?: string | null } {
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
  proc({ titulo: 'Folha', setor: 'RH', eisenhower: 2, frequencia: 'mensal' }),
  proc({ titulo: 'Notas', setor: 'Fiscal', eisenhower: 1, frequencia: 'diario' }),
  proc({ titulo: 'Agenda', setor: null }),
  proc({ titulo: 'Guias', setor: 'fiscal', eisenhower: 1, frequencia: 'mensal' }),
];
const info = { setor: (p: Processo) => (p as Processo & { setor?: string | null }).setor ?? null };
const resumo = (gs: ReturnType<typeof agruparProcessos>) => gs.map(g => [g.rotulo, g.processos.map(p => p.titulo)]);

describe('agruparProcessos', () => {
  it('por setor: alfabético, sem diferença de maiúscula, "Sem setor" no fim', () => {
    expect(resumo(agruparProcessos(lista, 'setor', info))).toEqual([
      ['Fiscal', ['Notas', 'Guias']],
      ['RH', ['Folha']],
      ['Sem setor', ['Agenda']],
    ]);
  });

  it('por prioridade: de Urgente a Baixa, só os grupos com processos', () => {
    expect(resumo(agruparProcessos(lista, 'prioridade', info))).toEqual([
      ['Urgente', ['Notas', 'Guias']],
      ['Alta', ['Folha']],
      ['Sem prioridade', ['Agenda']],
    ]);
  });

  it('por frequência: na ordem do período e com o rótulo das Configurações', () => {
    const cfg = { rotulos_frequencia: { mensal: 'Todo mês' } };
    expect(resumo(agruparProcessos(lista, 'frequencia', { ...info, cfg }))).toEqual([
      ['Diário', ['Notas']],
      ['Todo mês', ['Folha', 'Guias']],
      ['Sem frequência', ['Agenda']],
    ]);
  });
});
