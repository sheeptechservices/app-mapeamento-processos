// Protocolo de sincronização entre o aparelho e o servidor. Compartilhado pelos
// dois lados: o aparelho manda o que está pendente e recebe tudo o que mudou na
// organização desde o seu cursor.
import { z } from 'zod';

export const TABELAS = [
  'configuracoes',
  'clientes',
  'sessoes',
  'areas',
  'processos',
  'roteiro_blocos',
  'roteiro_perguntas',
  'capturas',
  'anexos',
] as const;
export type TabelaSyncNome = (typeof TABELAS)[number];

type Tipo = 'texto' | 'numero' | 'bool' | 'json';

/** Colunas de dado de cada tabela e como elas viajam (o SQLite não tem bool nem lista). */
export const COLUNAS: Record<TabelaSyncNome, Record<string, Tipo>> = {
  configuracoes: {
    custo_hora_padrao: 'numero',
    reducao_padrao_pct: 'numero',
    horizonte_meses: 'numero',
    setores: 'json',
    segmentos: 'json',
    sistemas: 'json',
    rotulos_status: 'json',
    rotulos_frequencia: 'json',
    modelos_roteiro: 'json',
    ia: 'json',
  },
  clientes: {
    nome: 'texto',
    cnpj: 'texto',
    segmento: 'texto',
    cidade: 'texto',
    contato_nome: 'texto',
    contato_email: 'texto',
    contato_telefone: 'texto',
    logo: 'texto',
    custo_hora: 'numero',
    funcionarios: 'numero',
    faturamento_mensal: 'numero',
    estagio: 'texto',
    razao_social: 'texto',
    atividade: 'texto',
    porte: 'texto',
    abertura: 'texto',
    endereco: 'texto',
    telefone: 'texto',
    email: 'texto',
    site: 'texto',
    instagram: 'texto',
    socios: 'texto',
    observacoes: 'texto',
  },
  sessoes: {
    cliente_id: 'texto',
    data: 'texto',
    titulo: 'texto',
    participantes: 'json',
    status: 'texto',
    validado_em: 'numero',
    consentimento_gravacao: 'bool',
    observacoes: 'texto',
    visita_inicio: 'numero',
    visita_acumulado_ms: 'numero',
  },
  areas: {
    sessao_id: 'texto',
    nome: 'texto',
    responsavel: 'texto',
    pessoas: 'numero',
    entrega: 'texto',
    ordem: 'numero',
  },
  processos: {
    sessao_id: 'texto',
    cliente_id: 'texto',
    area_id: 'texto',
    codigo: 'texto',
    titulo: 'texto',
    ponto_focal: 'texto',
    status: 'texto',
    descricao: 'texto',
    gatilho: 'texto',
    fim: 'texto',
    frequencia: 'texto',
    sistemas: 'json',
    pessoas_envolvidas: 'numero',
    vezes_mes: 'numero',
    tempo_medio_min: 'numero',
    custo_hora_override: 'numero',
    perda_mes: 'numero',
    reducao_pct: 'numero',
    origem_numero: 'texto',
    nivel_automacao: 'texto',
    documentado: 'texto',
    gargalos: 'texto',
    pontos_atencao: 'texto',
    ganho_esperado: 'texto',
    observacoes: 'texto',
    eisenhower: 'numero',
    em_risco: 'bool',
    ganho_validado_pct: 'numero',
    responsaveis: 'json',
  },
  roteiro_blocos: {
    sessao_id: 'texto',
    titulo: 'texto',
    ordem: 'numero',
    minutos_previstos: 'numero',
    anotacoes: 'texto',
  },
  roteiro_perguntas: {
    sessao_id: 'texto',
    bloco_id: 'texto',
    texto: 'texto',
    essencial: 'bool',
    feita: 'bool',
    anotacao: 'texto',
    ordem: 'numero',
  },
  capturas: {
    sessao_id: 'texto',
    tipo: 'texto',
    conteudo: 'texto',
    processo_gerado_id: 'texto',
    status: 'texto',
  },
  anexos: {
    processo_id: 'texto',
    sessao_id: 'texto',
    cliente_id: 'texto',
    tipo: 'texto',
    url: 'texto',
    imagem: 'texto',
    descricao: 'texto',
    ordem: 'numero',
  },
};

/** Campos de controle que também participam da mescla por campo. */
export const CAMPOS_CONTROLE_MESCLADOS = ['excluido'] as const;

const registroWire = z
  .object({
    id: z.string().min(1).max(64),
    criado_por: z.string().max(64).optional(),
    criado_em: z.number(),
    atualizado_em: z.number(),
    excluido: z.union([z.literal(0), z.literal(1)]),
    _ts: z.record(z.string(), z.number()),
    /** Campos alterados no aparelho desde a última sincronização bem-sucedida. */
    _alterados: z.array(z.string()).default([]),
  })
  .passthrough();

export type RegistroWire = z.infer<typeof registroWire>;

export const pedidoSync = z.object({
  /** Cursor do servidor: o maior sincronizado_em que o aparelho já recebeu. */
  desde: z.number().min(0),
  /** Próxima página de uma resposta com `mais`: usa o cursor exato (sem a sobreposição). */
  continuacao: z.boolean().optional(),
  /** Anexos que o aparelho recebeu sem o arquivo e não tem: o servidor manda inteiros. */
  buscar: z.array(z.string().min(1).max(64)).max(500).optional(),
  mudancas: z.object(
    Object.fromEntries(TABELAS.map(t => [t, z.array(registroWire).max(500).default([])])) as Record<
      TabelaSyncNome,
      z.ZodDefault<z.ZodArray<typeof registroWire>>
    >,
  ),
});

export type PedidoSync = z.input<typeof pedidoSync>;

export interface ConflitoSync {
  tabela: TabelaSyncNome;
  id: string;
  campos: string[];
}

export interface RespostaSync {
  cursor: number;
  registros: Record<TabelaSyncNome, Record<string, unknown>[]>;
  conflitos: ConflitoSync[];
  /** Registros recusados (outra organização, ou usuário só de leitura). */
  recusados: { tabela: TabelaSyncNome; id: string }[];
  /** Ainda há anexos a receber: o aparelho pede a próxima página com `continuacao`. */
  mais?: boolean;
}

/**
 * Tamanho máximo (bytes do JSON) de um pedido e de uma página de anexos. A Vercel
 * aceita até 4,5 MB por pedido e por resposta; fotos são o que pesa.
 */
export const ORCAMENTO_BYTES = 2_500_000;
/** Tabelas que vêm em páginas (as que guardam arquivo). */
export const TABELAS_PAGINADAS: readonly TabelaSyncNome[] = ['anexos'];
/**
 * Coluna pesada de cada tabela paginada. Na janela de sobreposição do cursor
 * (registros que o aparelho quase certamente já tem) ela vem sem o valor e com
 * `_sem_arquivo`, para a mesma foto não descer de novo a cada sincronização.
 */
export const COLUNA_ARQUIVO: Partial<Record<TabelaSyncNome, string>> = { anexos: 'imagem' };

/** Janela de sobreposição do cursor: puxa um pouco antes para não perder escrita concorrente. */
export const SOBREPOSICAO_MS = 5_000;
