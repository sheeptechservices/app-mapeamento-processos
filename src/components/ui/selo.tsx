import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TomSelo = 'risco' | 'analise' | 'pendente' | 'proposta' | 'automatizado' | 'verde';

const tons: Record<TomSelo, { caixa: string; ponto: string }> = {
  risco: { caixa: 'bg-risco-fundo text-risco', ponto: 'bg-risco' },
  analise: { caixa: 'bg-analise-fundo text-analise', ponto: 'bg-analise' },
  pendente: { caixa: 'bg-pendente-fundo text-pendente', ponto: 'bg-pendente' },
  proposta: { caixa: 'border border-borda-forte bg-superficie text-tinta', ponto: 'bg-tinta' },
  automatizado: { caixa: 'bg-automatizado-fundo text-automatizado', ponto: 'bg-automatizado' },
  verde: { caixa: 'bg-verde-suave text-verde-tinta', ponto: 'bg-verde' },
};

/** Selo suave em pílula, com a bolinha na cor do estado (como o "At Risk" da referência). */
export function Selo({ tom, children, className }: { tom: TomSelo; children: ReactNode; className?: string }) {
  const t = tons[tom];
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-pilula px-2.5 text-[12px] font-medium whitespace-nowrap',
        t.caixa,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-pilula', t.ponto)} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Etiqueta discreta de categoria ("# Fiscal"). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="text-[13px] text-tinta-2"># {children}</span>;
}
