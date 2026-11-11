import { describe, expect, it } from 'vitest';
import { lerTextoRico, trechos } from './texto-rico';

describe('trechos', () => {
  it('negrito e itálico (asterisco e sublinhado)', () => {
    expect(trechos('**Ana** - *sócia* e _gerente_')).toEqual([
      { tipo: 'negrito', valor: 'Ana' },
      { tipo: 'texto', valor: ' - ' },
      { tipo: 'italico', valor: 'sócia' },
      { tipo: 'texto', valor: ' e ' },
      { tipo: 'italico', valor: 'gerente' },
    ]);
  });

  it('não confunde asterisco solto nem sublinhado no meio de palavra', () => {
    expect(trechos('2 * 3 = 6 e nome_do_arquivo')).toEqual([{ tipo: 'texto', valor: '2 * 3 = 6 e nome_do_arquivo' }]);
  });
});

describe('lerTextoRico', () => {
  it('título, parágrafo e lista com subitem', () => {
    const b = lerTextoRico('## Serviços\nClínica de SST.\nDuas unidades.\n\n- PGR\n  - rural\n- ASO');
    expect(b.map(x => x.tipo)).toEqual(['titulo', 'paragrafo', 'lista']);
    expect(b[1]).toMatchObject({ linhas: [[{ valor: 'Clínica de SST.' }], [{ valor: 'Duas unidades.' }]] });
    expect(b[2]).toMatchObject({ itens: [{ nivel: 0 }, { nivel: 1 }, { nivel: 0 }] });
  });

  it('texto vazio não gera bloco', () => {
    expect(lerTextoRico('')).toEqual([]);
    expect(lerTextoRico(null)).toEqual([]);
  });
});
