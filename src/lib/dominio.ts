// Tipos e vocabulário do sistema (PRD v6). Os valores gravados são códigos
// curtos e fixos; o que aparece na tela sai dos rótulos (status e frequências
// têm nome editável em Ajustes, o código nunca muda).
import type { OrigemNumero } from './roi';

export type { OrigemNumero };

/** Campos de controle de todo registro local (sincronização). */
export interface Registro {
  id: string;
  organizacao_id: string;
  criado_por: string;
  criado_em: number;
  atualizado_em: number;
  excluido: 0 | 1;
  /** Carimbo (ms) da última escrita de cada campo: base do "last write wins" por campo. */
  _ts: Record<string, number>;
  /** 1 enquanto a alteração não chegou ao servidor. */
  _pendente: 0 | 1;
  /** Campos que outro consultor alterou ao mesmo tempo (marca de conflito). */
  _conflitos?: string[];
}

/** Campos de dado (sem os de controle): o que um formulário pode alterar. */
export type Dados<T extends Registro> = Omit<T, keyof Registro>;

// ─── Cliente ──────────────────────────────────────────────────────────────

export type EstagioCliente = 'mapeando' | 'em_analise' | 'em_proposta' | 'em_execucao' | 'em_risco';

export interface Cliente extends Registro {
  nome: string;
  cnpj: string | null;
  segmento: string | null;
  cidade: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  /** Logo reduzida a 256px no aparelho, guardada como data URL (offline e sincroniza). */
  logo: string | null;
  custo_hora: number | null;
  funcionarios: number | null;
  faturamento_mensal: number | null;
  estagio: EstagioCliente;
  // Ficha da empresa (pesquisa antes da visita). Tudo opcional.
  razao_social: string | null;
  /** CNAE principal, com código e descrição. */
  atividade: string | null;
  /** Porte na Receita (ME, EPP, Demais) e regime, se souber. */
  porte: string | null;
  /** Data de abertura do CNPJ (AAAA-MM-DD). */
  abertura: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  instagram: string | null;
  /** Sócios e quem decide, um por linha. */
  socios: string | null;
  /** Contexto geral (ficha livre): história, produtos, números, o que levar para a visita. */
  observacoes: string | null;
  /** Contexto específico: o recorte desta empresa que importa para o mapeamento. */
  contexto_especifico: string | null;
}

// ─── Sessão de mapeamento ─────────────────────────────────────────────────

export type StatusSessao = 'em_andamento' | 'em_revisao' | 'validada';

export interface Sessao extends Registro {
  cliente_id: string;
  data: string; // AAAA-MM-DD
  titulo: string | null;
  participantes: string[];
  status: StatusSessao;
  validado_em: number | null;
  consentimento_gravacao: boolean;
  observacoes: string | null;
  /** Cronômetro da visita: quando a contagem atual começou (null = parado). */
  visita_inicio: number | null;
  visita_acumulado_ms: number;
}

export interface Area extends Registro {
  sessao_id: string;
  nome: string;
  responsavel: string | null;
  pessoas: number | null;
  entrega: string | null;
  ordem: number;
}

// ─── Processo ─────────────────────────────────────────────────────────────

export type StatusProcesso = 'pendente' | 'em_analise' | 'em_proposta' | 'em_execucao' | 'automatizado';
export type Frequencia = 'diario' | 'semanal' | 'mensal' | 'anual' | 'sob_demanda';
export type NivelAutomacao = 'manual' | 'parcial' | 'automatico';
export type Documentado = 'nao' | 'parcial' | 'sim';
/**
 * Prioridade do processo: 1 urgente, 2 alta, 3 média, 4 baixa. O campo segue
 * chamado `eisenhower` no banco (era a matriz de Eisenhower; os números se mantêm).
 */
export type Eisenhower = 1 | 2 | 3 | 4;

export interface Processo extends Registro {
  sessao_id: string;
  /** Repetido da sessão para as leituras da carteira não precisarem juntar tabelas. */
  cliente_id: string;
  area_id: string | null;
  codigo: string; // PRC-001
  titulo: string;
  ponto_focal: string | null;
  status: StatusProcesso;
  descricao: string | null;
  gatilho: string | null;
  fim: string | null;
  frequencia: Frequencia | null;
  sistemas: string[];
  pessoas_envolvidas: number | null;
  vezes_mes: number | null;
  tempo_medio_min: number | null;
  custo_hora_override: number | null;
  perda_mes: number | null;
  reducao_pct: number | null;
  origem_numero: OrigemNumero | null;
  nivel_automacao: NivelAutomacao | null;
  documentado: Documentado | null;
  gargalos: string | null;
  pontos_atencao: string | null;
  ganho_esperado: string | null;
  /** Anotações livres sobre o processo (texto rico: listas, negrito, itálico). */
  observacoes: string | null;
  eisenhower: Eisenhower | null;
  em_risco: boolean;
  /** Parte do ganho confirmada pelo cliente, de 0 a 100. */
  ganho_validado_pct: number | null;
  /** Consultores Sheep responsáveis (ids de usuário). */
  responsaveis: string[];
}

// ─── Roteiro da visita e capturas ─────────────────────────────────────────

export interface RoteiroBloco extends Registro {
  sessao_id: string;
  titulo: string;
  ordem: number;
  minutos_previstos: number | null;
  anotacoes: string | null;
}

export interface RoteiroPergunta extends Registro {
  sessao_id: string;
  bloco_id: string;
  texto: string;
  essencial: boolean;
  feita: boolean;
  anotacao: string | null;
  ordem: number;
}

export type StatusCaptura = 'pendente' | 'convertida' | 'descartada';

export interface Captura extends Registro {
  sessao_id: string;
  tipo: 'texto' | 'audio';
  conteudo: string;
  processo_gerado_id: string | null;
  status: StatusCaptura;
}

// ─── Anexos do processo ───────────────────────────────────────────────────

/**
 * Anexo de um processo: foto (galeria ou câmera, reduzida no aparelho e
 * guardada como data URL) ou link, cada um com uma descrição breve.
 */
export interface Anexo extends Registro {
  processo_id: string;
  /** Repetidos do processo para a exclusão em cascata de sessão e cliente. */
  sessao_id: string;
  cliente_id: string;
  tipo: 'foto' | 'link' | 'arquivo';
  /** Endereço do link (tipo link). */
  url: string | null;
  /** Foto reduzida em data URL (tipo foto). */
  imagem: string | null;
  descricao: string | null;
  ordem: number;
  /** Arquivo (PDF, planilha, documento): nome original, tipo, tamanho em bytes e em quantas partes foi guardado. */
  nome: string | null;
  mime: string | null;
  tamanho: number | null;
  partes: number | null;
}

/**
 * Pedaço do conteúdo de um anexo do tipo arquivo (base64). Arquivo grande vai
 * em várias partes para cada uma caber num pedido de sincronização.
 */
export interface AnexoParte extends Registro {
  anexo_id: string;
  processo_id: string;
  sessao_id: string;
  cliente_id: string;
  ordem: number;
  dados: string | null;
}

// ─── Configurações da organização ─────────────────────────────────────────

export interface ModeloRoteiro {
  segmento: string;
  blocos: { titulo: string; minutos: number; perguntas: { texto: string; essencial?: boolean }[] }[];
}

export interface FlagsIA {
  analise_automatica: boolean;
  sugerir_perguntas: boolean;
  transcricao: boolean;
  uso_offline: boolean;
}

/** Uma linha por organização (id = id da organização). */
export interface Configuracoes extends Registro {
  custo_hora_padrao: number | null;
  reducao_padrao_pct: number;
  horizonte_meses: number;
  setores: string[];
  /** Segmentos de cliente criados pela equipe (somam aos padrões). */
  segmentos: string[];
  /** Sistemas usados nos processos, criados pela equipe (somam às sugestões). */
  sistemas: string[];
  rotulos_status: Partial<Record<StatusProcesso, string>>;
  rotulos_frequencia: Partial<Record<Frequencia, string>>;
  modelos_roteiro: ModeloRoteiro[];
  ia: FlagsIA;
}

// ─── Rótulos ──────────────────────────────────────────────────────────────

export interface Opcao<T> {
  valor: T;
  rotulo: string;
  dica?: string;
}

export const ESTAGIOS_CLIENTE: Opcao<EstagioCliente>[] = [
  { valor: 'mapeando', rotulo: 'Mapeando' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'em_proposta', rotulo: 'Em proposta' },
  { valor: 'em_execucao', rotulo: 'Em execução' },
  { valor: 'em_risco', rotulo: 'Em risco' },
];

export const STATUS_SESSAO: Opcao<StatusSessao>[] = [
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'em_revisao', rotulo: 'Em revisão' },
  { valor: 'validada', rotulo: 'Validada' },
];

export const STATUS_PROCESSO: Opcao<StatusProcesso>[] = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'em_proposta', rotulo: 'Em proposta' },
  { valor: 'em_execucao', rotulo: 'Em execução', dica: 'Proposta aceita, automação sendo feita' },
  { valor: 'automatizado', rotulo: 'Automatizado' },
];

/**
 * Processo que já virou trabalho (em execução ou automatizado): só aí fazem
 * sentido risco, ganho validado e responsáveis.
 */
export function emExecucao(status: StatusProcesso): boolean {
  return status === 'em_execucao' || status === 'automatizado';
}

export const FREQUENCIAS: Opcao<Frequencia>[] = [
  { valor: 'diario', rotulo: 'Diário' },
  { valor: 'semanal', rotulo: 'Semanal' },
  { valor: 'mensal', rotulo: 'Mensal' },
  { valor: 'anual', rotulo: 'Anual' },
  { valor: 'sob_demanda', rotulo: 'Sob demanda' },
];

/**
 * Quantas vezes cada período cabe num mês (diário conta dias úteis). O processo
 * guarda o volume mensal (`vezes_mes`, base do ROI); a tela pergunta no período
 * da frequência ("quantas vezes por dia") e converte.
 */
export const POR_MES: Record<Frequencia, number> = { diario: 22, semanal: 4.3, mensal: 1, anual: 1 / 12, sob_demanda: 1 };
export const PERIODO_FREQUENCIA: Record<Frequencia, string> = {
  diario: 'por dia',
  semanal: 'por semana',
  mensal: 'por mês',
  anual: 'por ano',
  sob_demanda: 'por mês, em média',
};

/** Volume mensal visto no período da frequência (arredondado a 2 casas). */
export function vezesNoPeriodo(vezesMes: number | null, f: Frequencia): number | null {
  if (vezesMes == null) return null;
  return Math.round((vezesMes / POR_MES[f]) * 100) / 100;
}

/** Quantidade no período da frequência convertida para o mês. */
export function vezesNoMes(noPeriodo: number | null, f: Frequencia): number | null {
  if (noPeriodo == null) return null;
  // Sem arredondar (6 por ano = 0,5 por mês); só limpa a sobra de ponto flutuante.
  return Number((noPeriodo * POR_MES[f]).toPrecision(12));
}

// ─── Tempo médio em minutos, horas ou dias ────────────────────────────────
// O processo guarda minutos (`tempo_medio_min`, base do ROI); a tela deixa
// escolher a unidade. Um dia conta a jornada de 8 horas.
export type UnidadeTempo = 'min' | 'h' | 'dias';
export const MIN_POR_UNIDADE: Record<UnidadeTempo, number> = { min: 1, h: 60, dias: 480 };
export const UNIDADES_TEMPO: Opcao<UnidadeTempo>[] = [
  { valor: 'min', rotulo: 'min' },
  { valor: 'h', rotulo: 'h' },
  { valor: 'dias', rotulo: 'dias' },
];

/** Unidade que mostra o número mais redondo (480 min = 1 dia; 90 min = 90 min). */
export function unidadeTempoInicial(min: number | null): UnidadeTempo {
  if (min == null || min <= 0) return 'min';
  if (min >= 480 && min % 480 === 0) return 'dias';
  if (min >= 60 && min % 60 === 0) return 'h';
  return 'min';
}
export function tempoNaUnidade(min: number | null, u: UnidadeTempo): number | null {
  if (min == null) return null;
  return Math.round((min / MIN_POR_UNIDADE[u]) * 100) / 100;
}
export function tempoEmMinutos(v: number | null, u: UnidadeTempo): number | null {
  if (v == null) return null;
  return Number((v * MIN_POR_UNIDADE[u]).toPrecision(12));
}

export const NIVEIS_AUTOMACAO: Opcao<NivelAutomacao>[] = [
  { valor: 'manual', rotulo: 'Manual' },
  { valor: 'parcial', rotulo: 'Parcial' },
  { valor: 'automatico', rotulo: 'Automático' },
];

export const DOCUMENTADO: Opcao<Documentado>[] = [
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'parcial', rotulo: 'Parcial' },
  { valor: 'sim', rotulo: 'Sim' },
];

export const PRIORIDADES: Opcao<Eisenhower>[] = [
  { valor: 1, rotulo: 'Urgente', dica: 'Resolver já: trava a operação ou gera prejuízo' },
  { valor: 2, rotulo: 'Alta', dica: 'Entra no próximo ciclo de automação' },
  { valor: 3, rotulo: 'Média', dica: 'Vale fazer quando houver espaço' },
  { valor: 4, rotulo: 'Baixa', dica: 'Pode esperar' },
];

export const ORIGENS: Opcao<OrigemNumero>[] = [
  { valor: 'cliente', rotulo: 'Cliente informou', dica: 'Número dito pelo cliente' },
  { valor: 'medido', rotulo: 'Medido', dica: 'Cronometrado ou tirado de relatório' },
  { valor: 'estimativa', rotulo: 'Estimativa Sheep', dica: 'Faixa estimada pela Sheep, a validar' },
];

export function rotuloDe<T>(lista: Opcao<T>[], v: T | null | undefined) {
  return lista.find(x => x.valor === v)?.rotulo ?? '-';
}

/** Rótulo de status/frequência respeitando o nome editado em Ajustes. */
export function rotuloStatus(s: StatusProcesso, cfg?: Pick<Configuracoes, 'rotulos_status'> | null) {
  return cfg?.rotulos_status?.[s] || rotuloDe(STATUS_PROCESSO, s);
}
export function rotuloFrequencia(f: Frequencia | null, cfg?: Pick<Configuracoes, 'rotulos_frequencia'> | null) {
  if (!f) return '-';
  return cfg?.rotulos_frequencia?.[f] || rotuloDe(FREQUENCIAS, f);
}

/** Nome legível de cada campo do processo (conflitos e lacunas). */
export const ROTULO_CAMPO_PROCESSO: Record<string, string> = {
  titulo: 'título',
  area_id: 'setor',
  ponto_focal: 'ponto focal',
  status: 'status',
  descricao: 'descrição',
  gatilho: 'gatilho',
  fim: 'fim',
  frequencia: 'frequência',
  sistemas: 'sistemas',
  pessoas_envolvidas: 'pessoas envolvidas',
  vezes_mes: 'quantas vezes (frequência)',
  tempo_medio_min: 'tempo médio',
  custo_hora_override: 'custo da hora',
  perda_mes: 'perda ou receita em risco',
  reducao_pct: 'redução esperada',
  origem_numero: 'origem do número',
  nivel_automacao: 'quão automático',
  documentado: 'documentado',
  gargalos: 'gargalos',
  pontos_atencao: 'pontos de atenção',
  ganho_esperado: 'ganho esperado',
  observacoes: 'observações',
  eisenhower: 'prioridade',
  em_risco: 'em risco',
  ganho_validado_pct: 'ganho validado',
  responsaveis: 'responsáveis',
  excluido: 'exclusão',
};

// ─── Padrões ──────────────────────────────────────────────────────────────

export const SETORES_PADRAO = [
  'Comercial',
  'Operação',
  'Financeiro',
  'Fiscal',
  'Contábil',
  'Departamento Pessoal',
  'RH',
  'Compras',
  'Logística',
  'Produção',
  'Qualidade',
  'Atendimento',
  'Marketing',
  'TI',
  'Diretoria',
];

export const SEGMENTOS = [
  'Contabilidade',
  'Clínica e saúde',
  'Indústria',
  'Distribuição',
  'Varejo',
  'Agronegócio',
  'Serviços',
  'Construção',
  'Logística',
  'Educação',
];

export const SUGESTOES_SISTEMAS = [
  'Planilha Excel',
  'WhatsApp',
  'E-mail',
  'ERP',
  'Domínio Sistemas',
  'Questor',
  'Omie',
  'Bling',
  'TOTVS',
  'Sankhya',
  'SAP',
  'Portal da prefeitura',
  'e-CAC',
  'Papel',
];

export const IA_PADRAO: FlagsIA = {
  analise_automatica: true,
  sugerir_perguntas: true,
  transcricao: true,
  uso_offline: true,
};

export const CONFIG_PADRAO = {
  custo_hora_padrao: 45,
  reducao_padrao_pct: 60,
  horizonte_meses: 12,
};
