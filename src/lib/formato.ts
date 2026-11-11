// Formatação no padrão pt-BR. Ausência de valor vira "-", nunca "R$ 0,00":
// zero e "não informado" são coisas diferentes num levantamento.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const VAZIO = '-';

export function reais(v: number | null | undefined, centavos = false): string {
  if (v == null || !Number.isFinite(v)) return VAZIO;
  return (centavos ? brlCentavos : brl).format(v);
}

/** Valor compacto para placar: R$ 12,4 mil, R$ 1,2 mi. */
export function reaisCompacto(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return VAZIO;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${num1.format(v / 1_000_000)} mi`;
  if (abs >= 10_000) return `R$ ${num1.format(v / 1_000)} mil`;
  return brl.format(v);
}

export function horas(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return VAZIO;
  return `${v >= 100 ? num0.format(v) : num1.format(v)} h`;
}

export function numero(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return VAZIO;
  return num1.format(v);
}

/** Recebe fração (0,6) e devolve "60%". */
export function percentual(fracao: number | null | undefined): string {
  if (fracao == null || !Number.isFinite(fracao)) return VAZIO;
  return pct.format(fracao);
}

/** Lê número digitado em pt-BR ("1.234,5", "12,5", "300"). Vazio vira null. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  // Com vírgula, ponto é milhar. Sem vírgula, ponto seguido de 3 dígitos também.
  let normal: string;
  if (t.includes(',')) normal = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, '');
  else normal = t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function numeroParaCampo(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  return String(v).replace('.', ',');
}

export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return VAZIO;
  const [a, m, d] = iso.slice(0, 10).split('-');
  if (!a || !m || !d) return VAZIO;
  return `${d}/${m}/${a}`;
}

export function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

/** "Qua, 11 de novembro". */
export function dataExtenso(d: Date): string {
  const dia = diaSemana.format(d).replace('.', '');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${diaMes.format(d)}`;
}

/** Máscara de CNPJ: 12.345.678/0001-90. */
export function mascaraCnpj(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Máscara de telefone: (44) 99812-4410 ou (44) 3029-7781. */
export function mascaraTelefone(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** DD/MM/AAAA digitado vira AAAA-MM-DD; data incompleta ou impossível vira null. */
export function lerDataBr(t: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const [, d, mes, a] = m;
  const data = new Date(Number(a), Number(mes) - 1, Number(d));
  if (data.getDate() !== Number(d) || data.getMonth() !== Number(mes) - 1) return null;
  return `${a}-${mes}-${d}`;
}

export function mascaraData(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
}
