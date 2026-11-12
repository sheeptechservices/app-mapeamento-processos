import { ROTULO_CAMPO_PROCESSO, type Processo } from './dominio';

/**
 * Campos que contam para a completude do cadastro do processo (o que o
 * mapeamento precisa levantar). Ficam de fora o status (sempre tem), as
 * observações e os anexos (opcionais), o que é herdado (custo da hora,
 * redução) e o acompanhamento (só depois de "Em execução").
 */
export const CAMPOS_COMPLETUDE = [
  'titulo',
  'area_id',
  'ponto_focal',
  'descricao',
  'gatilho',
  'fim',
  'frequencia',
  'vezes_mes',
  'sistemas',
  'pessoas_envolvidas',
  'tempo_medio_min',
  'origem_numero',
  'nivel_automacao',
  'documentado',
  'gargalos',
  'pontos_atencao',
  'ganho_esperado',
  'eisenhower',
] as const satisfies readonly (keyof Processo)[];

function preenchido(v: unknown) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Fração (0 a 1) dos campos do cadastro preenchidos e os nomes dos que faltam. */
export function completude(p: Pick<Processo, (typeof CAMPOS_COMPLETUDE)[number]>) {
  const faltando = CAMPOS_COMPLETUDE.filter(c => !preenchido(p[c]));
  return {
    fracao: (CAMPOS_COMPLETUDE.length - faltando.length) / CAMPOS_COMPLETUDE.length,
    faltando: faltando.map(c => ROTULO_CAMPO_PROCESSO[c] ?? c),
  };
}
