'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Area, Captura, Levantamento, Processo, RoteiroBloco, RoteiroPergunta } from '@/lib/dominio';
import { useAreas, useCapturas, useLevantamento, useProcessos, useRoteiro } from '@/lib/local/consultas';
import { calcularProcesso, consolidar, type ROIConsolidado, type ROIProcesso } from '@/lib/roi';

interface Valor {
  levantamento: Levantamento;
  areas: Area[];
  processos: Processo[];
  roteiro: { bloco: RoteiroBloco; perguntas: RoteiroPergunta[] }[];
  capturas: Captura[];
  roi: ROIConsolidado;
  roiDe: (p: Processo) => ROIProcesso;
}

const Contexto = createContext<Valor | null>(null);

/** Carrega o levantamento uma vez para todas as telas dele. */
export function LevantamentoProvider({
  id,
  children,
  carregando,
  inexistente,
}: {
  id: string;
  children: ReactNode;
  carregando: ReactNode;
  inexistente: ReactNode;
}) {
  const levantamento = useLevantamento(id);
  const areas = useAreas(id);
  const processos = useProcessos(id);
  const roteiro = useRoteiro(id);
  const capturas = useCapturas(id);

  const valor = useMemo<Valor | null>(() => {
    if (!levantamento || !areas || !processos || !roteiro || !capturas) return null;
    return {
      levantamento,
      areas,
      processos,
      roteiro,
      capturas,
      roi: consolidar(processos, levantamento),
      roiDe: p => calcularProcesso(p, levantamento),
    };
  }, [levantamento, areas, processos, roteiro, capturas]);

  if (levantamento === null) return <>{inexistente}</>;
  if (!valor) return <>{carregando}</>;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useLev() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useLev fora do LevantamentoProvider');
  return v;
}
