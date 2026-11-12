import { describe, expect, it } from 'vitest';
import { familiaDe, montar, partir, tamanhoLegivel } from './arquivo';

describe('arquivos anexados', () => {
  it('parte em pedaços que decodificam sozinhos e monta de volta igual', async () => {
    const original = new Uint8Array(10_000).map((_, i) => (i * 37) % 256);
    const base64 = Buffer.from(original).toString('base64');
    const partes = partir(base64, 1_000);
    expect(partes.length).toBeGreaterThan(10);
    expect(partes.slice(0, -1).every(p => p.length === 1_000)).toBe(true);
    const blob = montar(partes, 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(original);
  });

  it('reconhece o tipo pela extensão e escreve o tamanho', () => {
    expect(familiaDe('Relatório.PDF')).toBe('pdf');
    expect(familiaDe('controle.xlsx')).toBe('planilha');
    expect(familiaDe('procedimento.docx')).toBe('documento');
    expect(familiaDe('sem-extensao')).toBe('outro');
    expect(tamanhoLegivel(512)).toBe('512 B');
    expect(tamanhoLegivel(250 * 1024)).toBe('250 KB');
    expect(tamanhoLegivel(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
});
