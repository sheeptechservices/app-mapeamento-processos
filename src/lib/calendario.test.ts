import { describe, expect, it } from 'vitest';
import { diaDaSemana, gradeDoMes, hojeLocal, isoDe, partes, relativo, somarDias, somarMeses } from './calendario';

describe('calendário', () => {
  it('monta a grade de novembro de 2026 começando no domingo', () => {
    const g = gradeDoMes(2026, 10);
    expect(g).toHaveLength(42);
    // 01/11/2026 é domingo: a grade começa nele.
    expect(g[0]).toEqual({ iso: '2026-11-01', dia: 1, doMes: true });
    expect(g.filter(d => d.doMes)).toHaveLength(30);
    expect(g[41]).toMatchObject({ iso: '2026-12-12', doMes: false });
  });

  it('grade de mês que começa no meio da semana traz dias do mês anterior', () => {
    const g = gradeDoMes(2027, 1); // fevereiro de 2027 começa numa segunda
    expect(g[0]).toEqual({ iso: '2027-01-31', dia: 31, doMes: false });
    expect(g[1].iso).toBe('2027-02-01');
  });

  it('soma dias e meses virando ano e respeitando fim de mês', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarMeses('2027-01-31', 1)).toBe('2027-02-28');
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29');
    expect(somarMeses('2026-11-15', -12)).toBe('2025-11-15');
  });

  it('valida data impossível', () => {
    expect(partes('2026-02-30')).toBeNull();
    expect(partes('2026-11-11')).toEqual({ ano: 2026, mes: 10, dia: 11 });
    expect(isoDe(2026, 12, 1)).toBe('2027-01-01');
  });

  it('dia da semana, hoje e relativo', () => {
    expect(diaDaSemana('2026-11-12')).toBe(4); // quinta
    expect(hojeLocal(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11');
    expect(relativo('2026-11-12', '2026-11-11')).toBe('Amanhã');
    expect(relativo('2026-11-10', '2026-11-11')).toBe('Ontem');
    expect(relativo('2026-11-20', '2026-11-11')).toBeNull();
  });
});
