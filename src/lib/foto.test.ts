import { describe, expect, it } from 'vitest';
import { dominioDe, normalizarLink } from './foto';

describe('links dos anexos', () => {
  it('aceita endereço sem protocolo e recusa o que não é link', () => {
    expect(normalizarLink('drive.google.com/arquivo/123')).toBe('https://drive.google.com/arquivo/123');
    expect(normalizarLink('  https://exemplo.com.br/planilha ')).toBe('https://exemplo.com.br/planilha');
    expect(normalizarLink('planilha de compras')).toBeNull();
    expect(normalizarLink('javascript:alert(1)')).toBeNull();
    expect(normalizarLink('')).toBeNull();
  });

  it('mostra só o domínio', () => {
    expect(dominioDe('https://www.exemplo.com.br/a/b?c=1')).toBe('exemplo.com.br');
  });
});
