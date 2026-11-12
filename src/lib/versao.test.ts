import { describe, expect, it } from 'vitest';
import { haNovaVersao } from './versao';

describe('haNovaVersao', () => {
  it('avisa só quando a versão no ar é outra', () => {
    expect(haNovaVersao('abc123', 'def456')).toBe(true);
    expect(haNovaVersao('abc123', 'abc123')).toBe(false);
  });

  it('resposta vazia ou estranha nunca vira atualização', () => {
    expect(haNovaVersao('abc123', null)).toBe(false);
    expect(haNovaVersao('abc123', '')).toBe(false);
    expect(haNovaVersao('abc123', undefined)).toBe(false);
    expect(haNovaVersao('abc123', 42)).toBe(false);
    expect(haNovaVersao('', 'def456')).toBe(false);
  });
});
