// Contratos das funções de IA. Os esquemas `*Modelo` são o formato que o modelo
// devolve (saída estruturada, validada pelo SDK); os tipos `*Resultado` são o
// que a rota entrega ao app depois das travas (guardrails.ts).
import { z } from 'zod';

const NIVEL = z.enum(['alto', 'medio', 'baixo']);

// ─── Extração (texto livre ou transcrição -> processo) ─────────────────────

const numeroComTrecho = z.object({
  valor: z.number().nullable().describe('Só o número dito no texto, convertido para a unidade do campo. null se não foi dito.'),
  trecho: z.string().nullable().describe('Trecho literal do texto que contém o número. null se valor for null.'),
});

export const extracaoModelo = z.object({
  titulo: z.string().describe('Nome curto do processo, começando por verbo ou substantivo. Até 60 caracteres.'),
  area: z.string().nullable().describe('Nome da área responsável, preferindo uma das áreas existentes.'),
  ponto_focal: z.string().nullable(),
  descricao: z.string().describe('Como o processo funciona hoje, com as palavras do cliente.'),
  gatilho: z.string().nullable(),
  frequencia: z.enum(['diaria', 'semanal', 'quinzenal', 'mensal', 'sob_demanda', 'eventual']).nullable(),
  sistemas: z.array(z.string()),
  vezes_mes: numeroComTrecho.describe('Execuções por mês. Por dia vezes 22, por semana vezes 4,3.'),
  tempo_medio_min: numeroComTrecho.describe('Minutos por execução. Horas vezes 60.'),
  pessoas_envolvidas: numeroComTrecho,
  perda_mes: numeroComTrecho.describe('Perda ou receita em risco por mês, em reais.'),
  gargalos: z.string().nullable(),
  pontos_atencao: z.string().nullable(),
  faixas_estimadas: z
    .array(
      z.object({
        campo: z.enum(['vezes_mes', 'tempo_medio_min', 'perda_mes']),
        minimo: z.number(),
        maximo: z.number(),
        justificativa: z.string(),
      }),
    )
    .describe('Só para números NÃO ditos: uma faixa plausível, que o app mostra como Estimativa Sheep.'),
  perguntas_faltantes: z.array(z.string()).describe('Perguntas curtas para completar os números que faltaram.'),
});
export type ExtracaoModelo = z.infer<typeof extracaoModelo>;

export const pedidoExtracao = z.object({
  levantamento_id: z.string().max(64),
  texto: z.string().min(3).max(6000),
  areas: z.array(z.string().max(80)).max(40),
  segmento: z.string().max(80).nullable(),
});

export interface FaixaEstimada {
  campo: 'vezes_mes' | 'tempo_medio_min' | 'perda_mes';
  minimo: number;
  maximo: number;
  justificativa: string;
}

export interface ExtracaoResultado {
  titulo: string;
  area: string | null;
  ponto_focal: string | null;
  descricao: string;
  gatilho: string | null;
  frequencia: ExtracaoModelo['frequencia'];
  sistemas: string[];
  vezes_mes: number | null;
  tempo_medio_min: number | null;
  pessoas_envolvidas: number | null;
  perda_mes: number | null;
  gargalos: string | null;
  pontos_atencao: string | null;
  faixas_estimadas: FaixaEstimada[];
  perguntas_faltantes: string[];
  /** Números que o modelo trouxe mas que não estão no texto: descartados pela trava. */
  descartados: string[];
}

// ─── Análise do levantamento ──────────────────────────────────────────────

const comEvidencia = {
  texto: z.string(),
  evidencias: z.array(z.string()).describe('Referências (PRC-001, A2, P5, B3, LEV) que sustentam o item. Obrigatório.'),
};

export const analiseModelo = z.object({
  resumo: z.string().describe('Duas ou três frases sobre onde está o dinheiro e o tempo do cliente.'),
  insights: z.array(z.object(comEvidencia)),
  convergencias: z.array(z.object(comEvidencia)).describe('Pontos em que áreas diferentes repetem trabalho, dado ou problema.'),
  oportunidades: z.array(
    z.object({ ...comEvidencia, quick_win: z.boolean(), impacto: NIVEL, esforco: NIVEL }),
  ),
  riscos: z.array(z.object({ ...comEvidencia, severidade: NIVEL, tipo: z.string() })),
  lacunas: z.array(
    z.object({
      processo: z.string().describe('Código do processo, ex.: PRC-003'),
      campos: z.array(z.string()),
      faixa_sugerida: z.string().nullable().describe('Faixa plausível, sempre tratada como Estimativa Sheep. null se não houver base.'),
    }),
  ),
  proximas_perguntas: z.array(
    z.object({ texto: z.string(), motivo: z.string(), evidencias: z.array(z.string()), bloco: z.string().nullable() }),
  ),
});
export type AnaliseModelo = z.infer<typeof analiseModelo>;

const textoCurto = z.string().max(2000).nullable();
export const pedidoAnalise = z.object({
  levantamento: z.object({
    id: z.string().max(64),
    cliente_nome: z.string().max(200),
    segmento: z.string().max(80).nullable(),
    cidade: z.string().max(120).nullable(),
    funcionarios: z.number().nullable(),
    custo_hora: z.number().nullable(),
    faturamento_mensal: z.number().nullable(),
    observacoes: textoCurto,
  }),
  areas: z
    .array(
      z.object({
        id: z.string(),
        nome: z.string().max(120),
        responsavel: z.string().max(120).nullable(),
        pessoas: z.number().nullable(),
        entrega: textoCurto,
      }),
    )
    .max(60),
  processos: z.array(z.record(z.string(), z.unknown())).max(200),
  roteiro: z
    .array(
      z.object({
        id: z.string(),
        titulo: z.string(),
        anotacoes: textoCurto,
        perguntas: z.array(z.object({ id: z.string(), texto: z.string(), feita: z.boolean(), anotacao: textoCurto })),
      }),
    )
    .max(30),
});
export type PedidoAnalise = z.infer<typeof pedidoAnalise>;

export interface Evidencia {
  tipo: 'processo' | 'area' | 'pergunta' | 'bloco' | 'levantamento';
  id: string;
  rotulo: string;
}

interface ItemResultado {
  texto: string;
  evidencias: Evidencia[];
}

export interface AnaliseResultado {
  resumo: string;
  insights: ItemResultado[];
  convergencias: ItemResultado[];
  oportunidades: (ItemResultado & { quick_win: boolean; impacto: 'alto' | 'medio' | 'baixo'; esforco: 'alto' | 'medio' | 'baixo' })[];
  riscos: (ItemResultado & { severidade: 'alto' | 'medio' | 'baixo'; tipo: string })[];
  lacunas: { processo_id: string; codigo: string; campos: string[]; faixa_sugerida: string | null }[];
  proximas_perguntas: (ItemResultado & { motivo: string; bloco_id: string | null })[];
  /** Itens que o modelo trouxe sem evidência válida e que a trava descartou. */
  descartados: number;
}

export interface AnaliseSalva {
  levantamento_id: string;
  criado_em: number;
  modelo: string;
  assinatura: string;
  resultado: AnaliseResultado;
}

// ─── Roteiro adaptado ao segmento ─────────────────────────────────────────

export const roteiroModelo = z.object({
  sugestoes: z.array(
    z.object({
      bloco: z.string().describe('Título exato de um dos blocos existentes'),
      texto: z.string(),
      essencial: z.boolean(),
      motivo: z.string(),
    }),
  ),
});

export const pedidoRoteiro = z.object({
  levantamento_id: z.string().max(64),
  segmento: z.string().min(2).max(80),
  cliente: z.string().max(200),
  observacoes: textoCurto,
  blocos: z.array(z.object({ id: z.string(), titulo: z.string(), perguntas: z.array(z.string()) })).max(30),
});

export interface SugestaoRoteiro {
  bloco_id: string;
  bloco: string;
  texto: string;
  essencial: boolean;
  motivo: string;
}
