// Cálculo de ROI (seção 10 do PRD v6). Roda no cliente, sem rede, e é a única
// fonte das contas: cards, relatório, dashboard, exportação e IA leem daqui.
//
// Regra de ouro: campo vazio é "não informado", nunca zero. Um processo sem
// volume não tem custo zero, ele tem custo desconhecido - e aparece como lacuna.

export type OrigemNumero = 'cliente' | 'medido' | 'estimativa';

export const REDUCAO_PADRAO_PCT = 60;
export const HORIZONTE_PADRAO_MESES = 12;

/** Campos que o cálculo precisa para dar o custo do processo. */
export type CampoROI = 'vezes_mes' | 'tempo_medio_min' | 'custo_hora';

export const ROTULO_CAMPO_ROI: Record<CampoROI, string> = {
  vezes_mes: 'quantas vezes',
  tempo_medio_min: 'tempo médio',
  custo_hora: 'custo da hora',
};

export interface EntradaProcessoROI {
  id?: string;
  cliente_id?: string;
  area_id?: string | null;
  status?: string | null;
  vezes_mes?: number | null;
  tempo_medio_min?: number | null;
  custo_hora_override?: number | null;
  perda_mes?: number | null;
  reducao_pct?: number | null;
  origem_numero?: OrigemNumero | null;
  em_risco?: boolean | null;
  ganho_validado_pct?: number | null;
}

/** De onde o cálculo tira o que o processo não informa. */
export interface ContextoROI {
  /** Custo da hora do cliente do processo. */
  custo_hora_cliente?: number | null;
  /** Padrões das Configurações. */
  custo_hora_padrao?: number | null;
  reducao_padrao_pct?: number | null;
  horizonte_meses?: number | null;
}

export type FonteCustoHora = 'processo' | 'cliente' | 'padrao';

export interface ROIProcesso {
  horas_mes: number | null;
  custo_hora: number | null;
  custo_hora_fonte: FonteCustoHora | null;
  custo_mes: number | null;
  perda_mes: number | null;
  /** Fração de 0 a 1. */
  reducao: number;
  reducao_padrao: boolean;
  horas_liberadas_mes: number | null;
  /** custo_mes + perda_mes: o tamanho do problema, base do ranking. */
  peso_mes: number | null;
  ganho_mes: number | null;
  /** Ganho no horizonte configurado (12 meses por padrão: "ganho por ano"). */
  ganho_ano: number | null;
  /** Parte do ganho mensal confirmada pelo cliente. */
  ganho_validado_mes: number;
  faltando: CampoROI[];
  completo: boolean;
  origem: OrigemNumero | 'nao_informada';
  /** O número que sustenta o ganho não foi informado nem medido pelo cliente. */
  so_estimativa: boolean;
}

/** Número válido para conta: finito e não negativo. Qualquer outra coisa é ausência. */
function valido(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

export function horizonte(ctx: ContextoROI) {
  const h = valido(ctx.horizonte_meses);
  return h && h > 0 ? h : HORIZONTE_PADRAO_MESES;
}

export function calcularProcesso(p: EntradaProcessoROI, ctx: ContextoROI = {}): ROIProcesso {
  const vezes = valido(p.vezes_mes);
  const tempo = valido(p.tempo_medio_min);
  const perda_mes = valido(p.perda_mes);

  // Herança do custo da hora: processo, senão cliente, senão o padrão das Configurações.
  const fontes: [FonteCustoHora, number | null][] = [
    ['processo', valido(p.custo_hora_override)],
    ['cliente', valido(ctx.custo_hora_cliente)],
    ['padrao', valido(ctx.custo_hora_padrao)],
  ];
  const achada = fontes.find(([, v]) => v != null);
  const custo_hora = achada?.[1] ?? null;

  const pctInformado = valido(p.reducao_pct);
  const pctPadrao = valido(ctx.reducao_padrao_pct) ?? REDUCAO_PADRAO_PCT;
  const reducao = Math.min(pctInformado ?? pctPadrao, 100) / 100;

  const horas_mes = vezes != null && tempo != null ? (vezes * tempo) / 60 : null;
  const custo_mes = horas_mes != null && custo_hora != null ? horas_mes * custo_hora : null;
  const peso_mes = custo_mes == null && perda_mes == null ? null : (custo_mes ?? 0) + (perda_mes ?? 0);
  const ganho_mes = peso_mes != null ? peso_mes * reducao : null;
  const validadoPct = Math.min(valido(p.ganho_validado_pct) ?? 0, 100);

  const faltando: CampoROI[] = [];
  if (vezes == null) faltando.push('vezes_mes');
  if (tempo == null) faltando.push('tempo_medio_min');
  if (custo_hora == null) faltando.push('custo_hora');

  const origem = p.origem_numero ?? 'nao_informada';

  return {
    horas_mes,
    custo_hora,
    custo_hora_fonte: achada?.[0] ?? null,
    custo_mes,
    perda_mes,
    reducao,
    reducao_padrao: pctInformado == null,
    horas_liberadas_mes: horas_mes != null ? horas_mes * reducao : null,
    peso_mes,
    ganho_mes,
    ganho_ano: ganho_mes != null ? ganho_mes * horizonte(ctx) : null,
    ganho_validado_mes: ganho_mes != null ? (ganho_mes * validadoPct) / 100 : 0,
    faltando,
    completo: faltando.length === 0,
    origem,
    so_estimativa: origem === 'estimativa' || origem === 'nao_informada',
  };
}

export interface ItemRanking {
  id: string;
  peso_mes: number;
  ganho_mes: number;
}

export interface ROIConsolidado {
  processos: number;
  completos: number;
  /** Fração de processos com volume, tempo e custo da hora. */
  cobertura: number;
  em_risco: number;
  horas_mes: number;
  horas_liberadas_mes: number;
  custo_mes: number;
  perda_mes: number;
  ganho_mes: number;
  ganho_ano: number;
  ganho_validado_mes: number;
  /** ganho_validado_mes / ganho_mes (0 quando não há ganho). */
  fracao_validada: number;
  ranking: ItemRanking[];
  ganho_mes_por_origem: Record<OrigemNumero | 'nao_informada', number>;
  /** Parte do ganho que se apoia só em estimativa ou em número sem origem. */
  parcela_estimativa: number;
}

/**
 * Soma um conjunto de processos (uma sessão, uma área, um cliente ou a carteira).
 * `contextoDe` diz o contexto de cada processo: é por ele que o custo da hora do
 * cliente certo entra na conta mesmo quando os processos são de vários clientes.
 */
export function consolidar<P extends EntradaProcessoROI>(
  processos: P[],
  contextoDe: ContextoROI | ((p: P) => ContextoROI),
): ROIConsolidado {
  const ctxDe = typeof contextoDe === 'function' ? contextoDe : () => contextoDe;
  const soma = { horas_mes: 0, horas_liberadas_mes: 0, custo_mes: 0, perda_mes: 0, ganho_mes: 0, ganho_ano: 0, ganho_validado_mes: 0 };
  const porOrigem: ROIConsolidado['ganho_mes_por_origem'] = { cliente: 0, medido: 0, estimativa: 0, nao_informada: 0 };
  const ranking: ItemRanking[] = [];
  let completos = 0;
  let em_risco = 0;

  processos.forEach((p, i) => {
    const r = calcularProcesso(p, ctxDe(p));
    if (r.completo) completos++;
    if (p.em_risco) em_risco++;
    soma.horas_mes += r.horas_mes ?? 0;
    soma.horas_liberadas_mes += r.horas_liberadas_mes ?? 0;
    soma.custo_mes += r.custo_mes ?? 0;
    soma.perda_mes += r.perda_mes ?? 0;
    soma.ganho_mes += r.ganho_mes ?? 0;
    soma.ganho_ano += r.ganho_ano ?? 0;
    soma.ganho_validado_mes += r.ganho_validado_mes;
    porOrigem[r.origem] += r.ganho_mes ?? 0;
    if (r.peso_mes != null && r.peso_mes > 0) {
      ranking.push({ id: p.id ?? String(i), peso_mes: r.peso_mes, ganho_mes: r.ganho_mes ?? 0 });
    }
  });

  ranking.sort((a, b) => b.peso_mes - a.peso_mes);

  return {
    processos: processos.length,
    completos,
    cobertura: processos.length ? completos / processos.length : 0,
    em_risco,
    ...soma,
    fracao_validada: soma.ganho_mes > 0 ? soma.ganho_validado_mes / soma.ganho_mes : 0,
    ranking,
    ganho_mes_por_origem: porOrigem,
    parcela_estimativa: soma.ganho_mes > 0 ? (porOrigem.estimativa + porOrigem.nao_informada) / soma.ganho_mes : 0,
  };
}

/** Agrupa e consolida (ganho por área, por cliente). Grupos ordenados por ganho. */
export function agregarPor<P extends EntradaProcessoROI>(
  processos: P[],
  chave: (p: P) => string | null | undefined,
  contextoDe: ContextoROI | ((p: P) => ContextoROI),
): { chave: string | null; roi: ROIConsolidado }[] {
  const grupos = new Map<string | null, P[]>();
  for (const p of processos) {
    const k = chave(p) ?? null;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return [...grupos.entries()]
    .map(([k, lista]) => ({ chave: k, roi: consolidar(lista, contextoDe) }))
    .sort((a, b) => b.roi.ganho_mes - a.roi.ganho_mes);
}

/** Peso dos processos sobre o faturamento mensal do cliente. */
export function pesoSobreFaturamento(roi: Pick<ROIConsolidado, 'custo_mes' | 'perda_mes'>, faturamento_mensal: number | null | undefined) {
  const f = valido(faturamento_mensal);
  return f && f > 0 ? (roi.custo_mes + roi.perda_mes) / f : null;
}
