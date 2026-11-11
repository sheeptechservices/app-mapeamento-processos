// Resumo de um conjunto de processos para os gráficos da sessão: quantos em cada
// etapa (na ordem do funil) e o ganho por setor.
import { STATUS_PROCESSO, type Processo, type StatusProcesso } from './dominio';

/** Etapas na ordem do funil, cada uma com sua cor da rampa (--etapa-1 a 5). */
export const ETAPAS: { status: StatusProcesso; cor: string }[] = STATUS_PROCESSO.map((s, i) => ({
  status: s.valor,
  cor: `var(--etapa-${i + 1})`,
}));

export function contarEtapas(processos: Pick<Processo, 'status'>[]): Record<StatusProcesso, number> {
  const c = Object.fromEntries(STATUS_PROCESSO.map(s => [s.valor, 0])) as Record<StatusProcesso, number>;
  for (const p of processos) c[p.status] = (c[p.status] ?? 0) + 1;
  return c;
}
