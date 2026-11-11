// Interpretação local de texto livre (captura rápida). Roda no aparelho, sem
// rede, e só pega o que está escrito: número sem unidade clara não vira campo.
// Na Fase 3 a IA assume a extração; esta versão continua como plano offline.
//
// Ex.: "o fiscal importa XML de uns 300 clientes por mês, cada um leva uns 10
// minutos, e erra muito no SPED" -> área Fiscal, 300x/mês, 10 min, gargalo.
import { SETORES_PADRAO } from './dominio';
import { lerNumero } from './formato';

export interface PropostaProcesso {
  titulo: string;
  descricao: string;
  /** Área existente reconhecida no texto. */
  area_id: string | null;
  /** Área sugerida que ainda não existe no levantamento. */
  area_nova: string | null;
  vezes_mes: number | null;
  tempo_medio_min: number | null;
  pessoas_envolvidas: number | null;
  perda_mes: number | null;
  gargalos: string | null;
}

const DIAS_UTEIS = 22;
const SEMANAS_MES = 4.3;

function semAcento(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const NUM = String.raw`(\d+(?:[.,]\d+)*)`;

/** Apelidos de área que aparecem na fala. */
const APELIDOS: Record<string, string> = {
  dp: 'Departamento Pessoal',
  'departamento pessoal': 'Departamento Pessoal',
  'pessoal': 'Departamento Pessoal',
  folha: 'Departamento Pessoal',
  contabilidade: 'Contábil',
  contabil: 'Contábil',
  vendas: 'Comercial',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  compras: 'Compras',
  rh: 'RH',
  logistica: 'Logística',
  expedicao: 'Logística',
  producao: 'Produção',
  fabrica: 'Produção',
  qualidade: 'Qualidade',
  atendimento: 'Atendimento',
  recepcao: 'Atendimento',
  marketing: 'Marketing',
  ti: 'TI',
  diretoria: 'Diretoria',
  operacao: 'Operação',
};

function acharArea(texto: string, areas: { id: string; nome: string }[]) {
  const t = ` ${semAcento(texto)} `;
  const palavra = (nome: string) => new RegExp(String.raw`[^a-z]${semAcento(nome).replace(/\s+/g, '\\s+')}[^a-z]`).test(t);
  const existente = areas.find(a => a.nome && palavra(a.nome));
  if (existente) return { area_id: existente.id, area_nova: null };
  for (const [apelido, nome] of Object.entries(APELIDOS)) {
    if (!palavra(apelido)) continue;
    const jaTem = areas.find(a => semAcento(a.nome) === semAcento(nome));
    return jaTem ? { area_id: jaTem.id, area_nova: null } : { area_id: null, area_nova: nome };
  }
  const sugestao = SETORES_PADRAO.find(s => palavra(s));
  return { area_id: null, area_nova: sugestao ?? null };
}

function volumeMensal(t: string): { valor: number; trecho: string } | null {
  const periodos: [RegExp, number][] = [
    [new RegExp(String.raw`${NUM}\s*(?:x|vezes)?\s*(?:[a-z]+\s+){0,3}?(?:por|ao|p\/|\/)\s*mes`), 1],
    [new RegExp(String.raw`${NUM}\s*(?:[a-z]+\s+){0,2}?mensa(?:l|is)`), 1],
    [new RegExp(String.raw`${NUM}\s*(?:x|vezes)?\s*(?:[a-z]+\s+){0,3}?(?:por|ao|p\/|\/)\s*semana`), SEMANAS_MES],
    [new RegExp(String.raw`${NUM}\s*(?:x|vezes)?\s*(?:[a-z]+\s+){0,3}?(?:por|ao|p\/|\/)\s*dia`), DIAS_UTEIS],
  ];
  for (const [re, fator] of periodos) {
    const m = re.exec(t);
    const n = m ? lerNumero(m[1]) : null;
    if (m && n != null) return { valor: Math.round(n * fator), trecho: m[0] };
  }
  return null;
}

function tempoMinutos(t: string): { valor: number; trecho: string } | null {
  const m = new RegExp(String.raw`${NUM}\s*(min(?:utos?)?|h(?:oras?)?|hrs?)\b`).exec(t);
  if (!m) return null;
  const n = lerNumero(m[1]);
  if (n == null) return null;
  return { valor: m[2].startsWith('h') ? n * 60 : n, trecho: m[0] };
}

function pessoas(t: string) {
  const m = new RegExp(String.raw`${NUM}\s+(?:pessoas|colaboradores|analistas|atendentes|operadores)`).exec(t);
  return m ? lerNumero(m[1]) : null;
}

function perda(t: string): { valor: number; trecho: string } | null {
  const m =
    new RegExp(String.raw`r\$\s*${NUM}\s*(mil)?`).exec(t) ?? new RegExp(String.raw`${NUM}\s*(mil)?\s*reais`).exec(t);
  if (!m) return null;
  const n = lerNumero(m[1]);
  return n == null ? null : { valor: m[2] ? n * 1000 : n, trecho: m[0] };
}

const SINAIS_GARGALO = /(err|atras|trava|demor|retrabalho|multa|perde|perdem|esquec|manual|redigit|digita de novo|falta|reclama|gargalo|depende)/;

function gargalo(texto: string) {
  const trechos = texto
    .split(/[.;]|,\s*(?:e|mas)\s+|\s+mas\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  const achados = trechos.filter(s => SINAIS_GARGALO.test(semAcento(s)));
  if (!achados.length) return null;
  return achados.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('. ');
}

function titulo(texto: string, area: string | null) {
  let primeira = texto.split(/[,.;]/)[0].trim();
  // Tira o sujeito ("o fiscal", "a equipe do DP") e o que é número/quantidade.
  if (area) primeira = primeira.replace(new RegExp(String.raw`^(?:o|a|os|as)?\s*(?:pessoal do |equipe d[oa] )?${area}\s+`, 'i'), '');
  // Tira só a quantidade e o período ("uns 300", "por mês"); o objeto da frase fica.
  primeira = primeira
    .replace(/^(?:o|a|os|as|eles|ela|ele|a gente)\s+/i, '')
    .replace(/\s*(?:uns|umas|cerca de|mais ou menos|aproximadamente)?\s*\d[\d.,]*\s*(?:x|vezes)?(?=\s|$)/gi, ' ')
    .replace(/\s*(?:por|ao|p\/|\/)\s*(?:m[eê]s|dia|semana)(?=\s|[,.;]|$)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!primeira) return 'Processo da captura';
  const t = primeira.charAt(0).toUpperCase() + primeira.slice(1);
  return t.length > 60 ? `${t.slice(0, 57).trimEnd()}...` : t;
}

export function extrairProcesso(texto: string, areas: { id: string; nome: string }[]): PropostaProcesso {
  const limpo = texto.trim();
  const t = semAcento(limpo);
  const area = acharArea(limpo, areas);
  const nomeArea = area.area_id ? areas.find(a => a.id === area.area_id)!.nome : area.area_nova;
  const tempo = tempoMinutos(t);
  const dinheiro = perda(t);
  // Volume nunca sai do trecho que deu o tempo ("10 minutos por dia") nem do
  // dinheiro ("R$ 2.500 por mês"): esses são tempo e perda, não quantidade.
  let semUnidades = t;
  for (const u of [tempo, dinheiro]) if (u) semUnidades = semUnidades.replace(u.trecho, ' ');
  const vol = volumeMensal(semUnidades);
  return {
    titulo: titulo(limpo, nomeArea),
    descricao: limpo,
    ...area,
    vezes_mes: vol?.valor ?? null,
    tempo_medio_min: tempo?.valor ?? null,
    pessoas_envolvidas: pessoas(t),
    perda_mes: dinheiro?.valor ?? null,
    gargalos: gargalo(limpo),
  };
}
