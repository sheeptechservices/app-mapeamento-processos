// Contas do calendário do seletor de data, sempre em AAAA-MM-DD e sem fuso:
// a data é só dia, mês e ano (Date em UTC só para somar dias sem pular por
// horário de verão).

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Semana começa no domingo, como no calendário brasileiro de parede. */
export const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const DIAS_SEMANA_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const p2 = (n: number) => String(n).padStart(2, '0');

/** Mês de 0 a 11. */
export function isoDe(ano: number, mes: number, dia: number): string {
  const d = new Date(Date.UTC(ano, mes, dia));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

export function partes(iso: string): { ano: number; mes: number; dia: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  return isoDe(ano, mes, dia) === iso ? { ano, mes, dia } : null;
}

export function somarDias(iso: string, n: number): string {
  const p = partes(iso)!;
  return isoDe(p.ano, p.mes, p.dia + n);
}

/** Soma meses mantendo o dia quando dá (31/01 + 1 mês = 28 ou 29/02). */
export function somarMeses(iso: string, n: number): string {
  const p = partes(iso)!;
  const ultimo = new Date(Date.UTC(p.ano, p.mes + n + 1, 0)).getUTCDate();
  return isoDe(p.ano, p.mes + n, Math.min(p.dia, ultimo));
}

export function diaDaSemana(iso: string): number {
  const p = partes(iso)!;
  return new Date(Date.UTC(p.ano, p.mes, p.dia)).getUTCDay();
}

export interface DiaGrade {
  iso: string;
  dia: number;
  doMes: boolean;
}

/** Seis semanas (42 dias) para a grade não mudar de altura entre meses. */
export function gradeDoMes(ano: number, mes: number): DiaGrade[] {
  const primeiro = isoDe(ano, mes, 1);
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  return Array.from({ length: 42 }, (_, i) => {
    const iso = somarDias(inicio, i);
    const p = partes(iso)!;
    return { iso, dia: p.dia, doMes: p.mes === mes };
  });
}

export function hojeLocal(agora = new Date()): string {
  return `${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}`;
}

/** "Hoje", "Amanhã", "Ontem" ou nada, para dar contexto ao lado da data. */
export function relativo(iso: string, hoje: string): string | null {
  if (iso === hoje) return 'Hoje';
  if (iso === somarDias(hoje, 1)) return 'Amanhã';
  if (iso === somarDias(hoje, -1)) return 'Ontem';
  return null;
}
