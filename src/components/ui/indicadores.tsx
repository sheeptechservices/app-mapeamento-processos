import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Linha de indicadores com divisórias verticais finas (assinatura da v6): número
 * e rótulo lado a lado, numa faixa clara de cantos arredondados. No celular os
 * três cabem numa linha, como na referência; o rótulo quebra embaixo se faltar
 * espaço.
 */
export function LinhaIndicadores({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex divide-x divide-borda overflow-hidden rounded-2xl border border-borda bg-superficie',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  /** Primeiro indicador ganha o fundo levemente marcado, como na referência. */
  destaque?: boolean;
}) {
  return (
    <div className={cn('min-w-0 flex-1 px-3 py-3 tablet:px-6 tablet:py-5', destaque && 'bg-verde-suave/60')}>
      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="numeros text-[17px] leading-none tracking-tight tablet:text-[28px]">{valor}</span>
        <span className="text-[11px] leading-tight text-tinta-2 tablet:text-[13px]">{rotulo}</span>
      </p>
      {detalhe && <p className="mt-1.5 hidden truncate text-xs text-tinta-2 tablet:block">{detalhe}</p>}
    </div>
  );
}
