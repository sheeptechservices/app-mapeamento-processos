import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAGINAS_OFFLINE, rotas } from './rotas';

describe('páginas offline', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  const listaSw = JSON.parse(
    /const PAGINAS_OFFLINE = (\[[^\]]+\])/.exec(sw)![1].replace(/'/g, '"').replace(/,\s*\]/, ']'),
  ) as string[];

  it('o service worker pré-cacheia exatamente as páginas de rotas.ts', () => {
    expect(listaSw).toEqual(PAGINAS_OFFLINE);
  });

  it('a página única existe no app', () => {
    expect(PAGINAS_OFFLINE).toEqual(['/']);
    expect(existsSync('src/app/(app)/page.tsx')).toBe(true);
  });

  it('cliente, sessão e processo vão na query string da mesma página', () => {
    expect(rotas.mapa()).toBe('/');
    expect(rotas.mapa({ sessao: 's1', processo: 'p1' })).toBe('/?s=s1&p=p1');
    expect(rotas.mapa({ cliente: 'c 1' })).toBe('/?c=c%201');
  });
});
