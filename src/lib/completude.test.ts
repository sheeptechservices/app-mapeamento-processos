import { describe, expect, it } from 'vitest';
import { CAMPOS_COMPLETUDE, completude } from './completude';
import { dadosProcessoVazio } from './local/repo';

describe('completude do cadastro do processo', () => {
  it('processo recém-criado só com o título', () => {
    const r = completude({ ...dadosProcessoVazio('s', 'c', null), titulo: 'Conciliação bancária' });
    expect(r.fracao).toBeCloseTo(1 / CAMPOS_COMPLETUDE.length);
    expect(r.faltando).toContain('setor');
    expect(r.faltando).toContain('descrição');
  });

  it('texto em branco e lista vazia contam como não preenchidos; tudo preenchido dá 100%', () => {
    const cheio = {
      ...dadosProcessoVazio('s', 'c', 'area-1'),
      titulo: 'Fechamento de caixa',
      ponto_focal: 'Paula',
      descricao: 'Junta as planilhas',
      gatilho: 'Fim do dia',
      fim: 'Caixa fechado',
      frequencia: 'diario' as const,
      vezes_mes: 22,
      sistemas: ['ERP'],
      pessoas_envolvidas: 2,
      tempo_medio_min: 40,
      origem_numero: 'cliente' as const,
      nivel_automacao: 'manual' as const,
      documentado: 'nao' as const,
      gargalos: 'Planilhas diferentes',
      pontos_atencao: 'Depende da Paula',
      ganho_esperado: 'Fechamento sozinho',
      eisenhower: 2 as const,
    };
    expect(completude(cheio)).toEqual({ fracao: 1, faltando: [] });
    expect(completude({ ...cheio, gatilho: '   ', sistemas: [] }).faltando).toEqual(['gatilho', 'sistemas']);
  });
});
