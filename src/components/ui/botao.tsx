import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'icone';
type Tamanho = 'sm' | 'md' | 'lg';

// Botões da estética v6: pílula; primário preto, secundário em contorno.
const variantes: Record<Variante, string> = {
  primario: 'bg-tinta text-sobre-tinta hover:-translate-y-px hover:shadow-card-hover active:translate-y-0',
  secundario: 'border border-borda-forte bg-superficie text-tinta hover:border-tinta-3 hover:bg-sutil',
  fantasma: 'text-tinta hover:bg-sutil',
  perigo: 'bg-risco text-white hover:-translate-y-px hover:brightness-110 active:translate-y-0',
  icone: 'bg-sutil text-tinta hover:bg-borda',
};

const tamanhos: Record<Tamanho, string> = {
  sm: 'min-h-9 px-3.5 text-[13px] gap-1.5',
  md: 'min-h-[var(--toque)] px-5 text-[14px] gap-2',
  lg: 'min-h-[52px] px-6 text-[15px] gap-2',
};

/** Classes do botão da casa, para usar também em `<Link>`. */
export function estiloBotao({ variante = 'secundario', tamanho = 'md' }: { variante?: Variante; tamanho?: Tamanho } = {}) {
  return cn(
    'foco inline-flex select-none items-center justify-center rounded-pilula font-semibold whitespace-nowrap',
    'transition-[translate,scale,box-shadow,background-color,border-color,filter] duration-200 ease-v6 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-40',
    variante === 'icone' ? 'size-[var(--toque)] p-0' : tamanhos[tamanho],
    variantes[variante],
  );
}

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante, tamanho, className, type = 'button', ...resto },
  ref,
) {
  return <button ref={ref} type={type} className={cn(estiloBotao({ variante, tamanho }), className)} {...resto} />;
});

/** Grupo de botões de ícone em pílula cinza (componente de assinatura da v6). */
export function GrupoIcones({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('inline-flex items-center gap-0.5 rounded-pilula bg-sutil p-1', className)}>{children}</div>;
}

export const BotaoIcone = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }>(
  function BotaoIcone({ rotulo, className, type = 'button', ...resto }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={rotulo}
        title={rotulo}
        className={cn(
          'foco grid size-9 place-items-center rounded-pilula text-tinta-2 transition-[background-color,color,scale,box-shadow] duration-150 hover:bg-superficie hover:text-tinta hover:shadow-card active:scale-90',
          className,
        )}
        {...resto}
      />
    );
  },
);
