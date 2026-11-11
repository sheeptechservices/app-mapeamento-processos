import { describe, expect, it } from 'vitest';
import { agregarPor, calcularProcesso, consolidar, pesoSobreFaturamento, REDUCAO_PADRAO_PCT } from './roi';

const ctx = { custo_hora_cliente: 45, custo_hora_padrao: 40, reducao_padrao_pct: 60, horizonte_meses: 12 };

describe('calcularProcesso', () => {
  it('calcula o exemplo do PRD: 300 XML/mês, 10 min cada', () => {
    const r = calcularProcesso({ vezes_mes: 300, tempo_medio_min: 10, perda_mes: 1200, reducao_pct: 70 }, ctx);
    expect(r.horas_mes).toBe(50);
    expect(r.custo_hora).toBe(45);
    expect(r.custo_mes).toBe(2250);
    expect(r.peso_mes).toBe(3450);
    expect(r.horas_liberadas_mes).toBeCloseTo(35);
    expect(r.ganho_mes).toBeCloseTo(2415);
    expect(r.ganho_ano).toBeCloseTo(28_980);
    expect(r.completo).toBe(true);
  });

  describe('herança do custo da hora', () => {
    const p = { vezes_mes: 20, tempo_medio_min: 60 };
    it('usa o do processo primeiro', () => {
      const r = calcularProcesso({ ...p, custo_hora_override: 120 }, ctx);
      expect([r.custo_hora, r.custo_hora_fonte]).toEqual([120, 'processo']);
    });
    it('senão o do cliente', () => {
      const r = calcularProcesso(p, ctx);
      expect([r.custo_hora, r.custo_hora_fonte]).toEqual([45, 'cliente']);
    });
    it('senão o padrão das Configurações', () => {
      const r = calcularProcesso(p, { custo_hora_padrao: 40 });
      expect([r.custo_hora, r.custo_hora_fonte]).toEqual([40, 'padrao']);
      expect(r.custo_mes).toBe(800);
    });
    it('sem nenhum, falta o custo da hora', () => {
      const r = calcularProcesso(p, {});
      expect(r.custo_hora).toBeNull();
      expect(r.custo_hora_fonte).toBeNull();
      expect(r.faltando).toEqual(['custo_hora']);
    });
    it('custo 0 informado no processo é válido e vence os outros', () => {
      const r = calcularProcesso({ ...p, custo_hora_override: 0 }, ctx);
      expect([r.custo_hora, r.custo_mes]).toEqual([0, 0]);
    });
  });

  it('redução: informada, padrão das Configurações ou 60%', () => {
    const p = { vezes_mes: 60, tempo_medio_min: 30 };
    expect(calcularProcesso({ ...p, reducao_pct: 0 }, ctx).reducao).toBe(0);
    expect(calcularProcesso(p, { ...ctx, reducao_padrao_pct: 40 }).reducao).toBe(0.4);
    const sem = calcularProcesso(p, { custo_hora_cliente: 45 });
    expect(sem.reducao).toBe(REDUCAO_PADRAO_PCT / 100);
    expect(sem.reducao_padrao).toBe(true);
  });

  it('o ganho do período segue o horizonte configurado', () => {
    const p = { vezes_mes: 10, tempo_medio_min: 60, reducao_pct: 50 };
    expect(calcularProcesso(p, { ...ctx, horizonte_meses: 24 }).ganho_ano).toBe(225 * 24);
    expect(calcularProcesso(p, { ...ctx, horizonte_meses: 0 }).ganho_ano).toBe(225 * 12);
  });

  it('ganho validado é a parte confirmada pelo cliente', () => {
    const p = { vezes_mes: 10, tempo_medio_min: 60, reducao_pct: 50 };
    expect(calcularProcesso({ ...p, ganho_validado_pct: 40 }, ctx).ganho_validado_mes).toBe(90);
    expect(calcularProcesso(p, ctx).ganho_validado_mes).toBe(0);
    expect(calcularProcesso({ ...p, ganho_validado_pct: 250 }, ctx).ganho_validado_mes).toBe(225);
  });

  it('campos vazios viram lacuna, nunca zero', () => {
    const r = calcularProcesso({}, {});
    expect(r.horas_mes).toBeNull();
    expect(r.custo_mes).toBeNull();
    expect(r.ganho_mes).toBeNull();
    expect(r.ganho_ano).toBeNull();
    expect(r.faltando).toEqual(['vezes_mes', 'tempo_medio_min', 'custo_hora']);
  });

  it('só a perda informada ainda gera ganho', () => {
    const r = calcularProcesso({ perda_mes: 5000, reducao_pct: 50 }, ctx);
    expect(r.custo_mes).toBeNull();
    expect(r.ganho_mes).toBe(2500);
  });

  it('ignora negativos e inválidos e limita a redução a 100%', () => {
    const r = calcularProcesso({ vezes_mes: -5, tempo_medio_min: Number.NaN, reducao_pct: 150 }, ctx);
    expect(r.horas_mes).toBeNull();
    expect(r.reducao).toBe(1);
  });

  it('marca ROI baseado só em estimativa', () => {
    expect(calcularProcesso({ origem_numero: 'estimativa' }, ctx).so_estimativa).toBe(true);
    expect(calcularProcesso({}, ctx).so_estimativa).toBe(true);
    expect(calcularProcesso({ origem_numero: 'cliente' }, ctx).so_estimativa).toBe(false);
  });
});

describe('consolidar e agregar', () => {
  const clientes: Record<string, number> = { horizonte: 45, vida: 90 };
  const processos = [
    { id: 'a', cliente_id: 'horizonte', area_id: 'fiscal', vezes_mes: 300, tempo_medio_min: 10, perda_mes: 1200, reducao_pct: 70, origem_numero: 'cliente' as const, ganho_validado_pct: 100 },
    { id: 'b', cliente_id: 'horizonte', area_id: 'dp', vezes_mes: 22, tempo_medio_min: 120, origem_numero: 'estimativa' as const, em_risco: true },
    { id: 'c', cliente_id: 'horizonte', area_id: 'fiscal', vezes_mes: 40 },
    { id: 'd', cliente_id: 'vida', area_id: 'recepcao', vezes_mes: 600, tempo_medio_min: 3 },
  ];
  const ctxDe = (p: { cliente_id: string }) => ({ custo_hora_cliente: clientes[p.cliente_id], reducao_padrao_pct: 60, horizonte_meses: 12 });

  it('soma a carteira usando o custo da hora de cada cliente', () => {
    const c = consolidar(processos, ctxDe);
    const ganhoB = 44 * 45 * 0.6;
    const ganhoD = 30 * 90 * 0.6;
    expect(c.processos).toBe(4);
    expect(c.completos).toBe(3);
    expect(c.em_risco).toBe(1);
    expect(c.horas_mes).toBeCloseTo(50 + 44 + 30);
    expect(c.ganho_mes).toBeCloseTo(2415 + ganhoB + ganhoD);
    expect(c.ganho_ano).toBeCloseTo((2415 + ganhoB + ganhoD) * 12);
    expect(c.ganho_validado_mes).toBeCloseTo(2415);
    expect(c.fracao_validada).toBeCloseTo(2415 / (2415 + ganhoB + ganhoD));
  });

  it('ranking por custo + perda, sem quem não tem peso', () => {
    const c = consolidar(processos, ctxDe);
    expect(c.ranking.map(r => r.id)).toEqual(['a', 'd', 'b']);
  });

  it('agrega por área e por cliente, ordenado por ganho', () => {
    const areas = agregarPor(processos, p => p.area_id, ctxDe);
    expect(areas.map(a => a.chave)).toEqual(['fiscal', 'recepcao', 'dp']);
    expect(areas[0].roi.processos).toBe(2);
    const porCliente = agregarPor(processos, p => p.cliente_id, ctxDe);
    expect(porCliente.map(a => a.chave)).toEqual(['horizonte', 'vida']);
  });

  it('mede quanto do ganho depende de estimativa', () => {
    const c = consolidar(processos, ctxDe);
    expect(c.parcela_estimativa).toBeCloseTo((44 * 45 * 0.6 + 30 * 90 * 0.6) / c.ganho_mes);
  });

  it('peso sobre o faturamento só com faturamento informado', () => {
    expect(pesoSobreFaturamento({ custo_mes: 3000, perda_mes: 1000 }, 400_000)).toBeCloseTo(0.01);
    expect(pesoSobreFaturamento({ custo_mes: 3000, perda_mes: 1000 }, null)).toBeNull();
  });

  it('conjunto vazio não quebra', () => {
    const c = consolidar([], ctx);
    expect([c.processos, c.cobertura, c.ganho_ano, c.fracao_validada]).toEqual([0, 0, 0, 0]);
  });
});
