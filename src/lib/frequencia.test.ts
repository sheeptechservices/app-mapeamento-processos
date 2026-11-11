import { describe, expect, it } from 'vitest';
import { tempoEmMinutos, tempoNaUnidade, unidadeTempoInicial, vezesNoMes, vezesNoPeriodo } from './dominio';

describe('quantas vezes no período da frequência', () => {
  it('converte para o mês (diário conta 22 dias úteis)', () => {
    expect(vezesNoMes(15, 'diario')).toBe(330);
    expect(vezesNoMes(3, 'semanal')).toBe(12.9);
    expect(vezesNoMes(2, 'mensal')).toBe(2);
    expect(vezesNoMes(6, 'anual')).toBe(0.5);
    expect(vezesNoMes(null, 'diario')).toBeNull();
  });

  it('volta do mês para o período sem sujeira de casas decimais', () => {
    expect(vezesNoPeriodo(330, 'diario')).toBe(15);
    expect(vezesNoPeriodo(12.9, 'semanal')).toBe(3);
    expect(vezesNoPeriodo(0.5, 'anual')).toBe(6);
    expect(vezesNoPeriodo(null, 'semanal')).toBeNull();
  });

  it('ida e volta preserva o que a pessoa digitou', () => {
    for (const f of ['diario', 'semanal', 'mensal', 'anual', 'sob_demanda'] as const) {
      expect(vezesNoPeriodo(vezesNoMes(7.5, f), f)).toBe(7.5);
    }
  });
});

describe('tempo médio em minutos, horas ou dias', () => {
  it('converte para minutos (dia de 8 h) e volta', () => {
    expect(tempoEmMinutos(2, 'h')).toBe(120);
    expect(tempoEmMinutos(1.5, 'dias')).toBe(720);
    expect(tempoEmMinutos(null, 'h')).toBeNull();
    expect(tempoNaUnidade(100, 'h')).toBe(1.67);
    expect(tempoNaUnidade(960, 'dias')).toBe(2);
  });

  it('abre na unidade mais redonda', () => {
    expect(unidadeTempoInicial(null)).toBe('min');
    expect(unidadeTempoInicial(90)).toBe('min');
    expect(unidadeTempoInicial(120)).toBe('h');
    expect(unidadeTempoInicial(960)).toBe('dias');
  });
});
