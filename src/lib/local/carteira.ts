'use client';

import { useMemo } from 'react';
import { CONFIG_PADRAO, IA_PADRAO, type Configuracoes, type Processo } from '@/lib/dominio';
import { calcularProcesso, consolidar, type ContextoROI } from '@/lib/roi';
import { useClientes, useConfiguracoes, useProcessos, useSessoes, useTodasAreas } from './consultas';

/** Configurações com os padrões preenchidos (antes da primeira sincronização ainda não existe a linha). */
export type ConfigEfetiva = Pick<
  Configuracoes,
  'custo_hora_padrao' | 'reducao_padrao_pct' | 'horizonte_meses' | 'setores' | 'segmentos' | 'sistemas' | 'rotulos_status' | 'rotulos_frequencia' | 'ia'
>;

export function configEfetiva(cfg: Configuracoes | null | undefined): ConfigEfetiva {
  return {
    custo_hora_padrao: cfg?.custo_hora_padrao ?? CONFIG_PADRAO.custo_hora_padrao,
    reducao_padrao_pct: cfg?.reducao_padrao_pct ?? CONFIG_PADRAO.reducao_padrao_pct,
    horizonte_meses: cfg?.horizonte_meses ?? CONFIG_PADRAO.horizonte_meses,
    setores: cfg?.setores ?? [],
    segmentos: cfg?.segmentos ?? [],
    sistemas: cfg?.sistemas ?? [],
    rotulos_status: cfg?.rotulos_status ?? {},
    rotulos_frequencia: cfg?.rotulos_frequencia ?? {},
    ia: { ...IA_PADRAO, ...cfg?.ia },
  };
}

/**
 * A carteira inteira do aparelho, com o contexto de ROI de cada processo
 * (custo da hora do cliente dele e os padrões das Configurações). `undefined`
 * enquanto carrega.
 */
export function useCarteira() {
  const clientes = useClientes();
  const sessoes = useSessoes();
  const processos = useProcessos();
  const areas = useTodasAreas();
  const cfgBruta = useConfiguracoes();

  return useMemo(() => {
    if (!clientes || !sessoes || !processos || !areas || cfgBruta === undefined) return undefined;
    const config = configEfetiva(cfgBruta);
    const clientePorId = new Map(clientes.map(c => [c.id, c]));
    const sessaoPorId = new Map(sessoes.map(s => [s.id, s]));
    const areaPorId = new Map(areas.map(a => [a.id, a]));
    // Processo de cliente ou sessão excluídos não conta (a exclusão em cascata pode estar a caminho).
    const vivos = processos.filter(p => clientePorId.has(p.cliente_id) && sessaoPorId.has(p.sessao_id));
    const ctxDe = (p: Pick<Processo, 'cliente_id'>): ContextoROI => ({
      custo_hora_cliente: clientePorId.get(p.cliente_id)?.custo_hora,
      custo_hora_padrao: config.custo_hora_padrao,
      reducao_padrao_pct: config.reducao_padrao_pct,
      horizonte_meses: config.horizonte_meses,
    });
    return {
      config,
      configuracoes: cfgBruta,
      clientes,
      sessoes,
      processos: vivos,
      clientePorId,
      sessaoPorId,
      areaPorId,
      ctxDe,
      roiDe: (p: Processo) => calcularProcesso(p, ctxDe(p)),
      roi: consolidar(vivos, ctxDe),
    };
  }, [clientes, sessoes, processos, areas, cfgBruta]);
}

export type Carteira = NonNullable<ReturnType<typeof useCarteira>>;
