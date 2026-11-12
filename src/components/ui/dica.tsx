'use client';

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Dica dos gráficos (tooltip da casa): balão escuro que aparece em cima da marca
 * ao passar o mouse e desliza de uma marca para a outra. No toque, tocar mostra
 * e tocar fora (ou na mesma marca) esconde. A informação nunca fica só aqui: a
 * legenda e os rótulos do gráfico continuam dizendo o essencial.
 *
 * Uso: `AreaDica` em volta do gráfico (é a referência de posição) e `AlvoDica`
 * em cada marca, com o `conteudo` do balão.
 */

type Ativa = { id: string; conteudo: ReactNode; x: number; y: number; toque: boolean };
const Contexto = createContext<{
  ativa: Ativa | null;
  area: RefObject<HTMLDivElement | null>;
  mostrar: (a: Ativa) => void;
  esconder: () => void;
} | null>(null);

export function AreaDica({ children, className }: { children: ReactNode; className?: string }) {
  const [ativa, setAtiva] = useState<Ativa | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const balao = useRef<HTMLDivElement>(null);

  // Mantém o balão dentro da área: o centro segue a marca, mas encosta na borda se faltar espaço.
  useLayoutEffect(() => {
    const b = balao.current;
    const a = area.current;
    if (!b || !a || !ativa) return;
    const meia = b.offsetWidth / 2;
    const x = Math.min(Math.max(ativa.x, meia), Math.max(a.clientWidth - meia, meia));
    b.style.left = `${x}px`;
    b.style.setProperty('--seta', `${ativa.x - x}px`);
    b.style.top = `${ativa.y}px`;
  }, [ativa]);

  // No toque, tocar fora da área esconde o balão.
  useEffect(() => {
    if (!ativa?.toque) return;
    const fora = (e: PointerEvent) => {
      if (!area.current?.contains(e.target as Node)) setAtiva(null);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [ativa?.toque]);

  return (
    <Contexto.Provider value={{ ativa, area, mostrar: setAtiva, esconder: () => setAtiva(null) }}>
      <div ref={area} className={cn('relative', className)} onPointerLeave={e => e.pointerType !== 'touch' && setAtiva(null)}>
        {children}
        <div ref={balao} role="tooltip" aria-hidden={!ativa} className={cn('dica', ativa && 'visivel')}>
          {ativa?.conteudo}
        </div>
      </div>
    </Contexto.Provider>
  );
}

/** Marca do gráfico que mostra o balão. `className` vai no elemento (barra, trecho, quadrinho). */
export function AlvoDica({
  id,
  conteudo,
  children,
  className,
  style,
}: {
  id: string;
  conteudo: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ctx = useContext(Contexto);
  const ref = useRef<HTMLSpanElement>(null);

  const posicionar = (toque: boolean) => {
    const el = ref.current;
    const area = ctx?.area.current;
    if (!el || !area || !ctx) return;
    const r = el.getBoundingClientRect();
    const ra = area.getBoundingClientRect();
    ctx.mostrar({ id, conteudo, x: r.left - ra.left + r.width / 2, y: r.top - ra.top, toque });
  };

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      data-ativa={ctx?.ativa?.id === id || undefined}
      onPointerEnter={e => e.pointerType !== 'touch' && posicionar(false)}
      onPointerUp={e => {
        if (e.pointerType !== 'touch') return;
        if (ctx?.ativa?.id === id) ctx.esconder();
        else posicionar(true);
      }}
    >
      {children}
    </span>
  );
}

/**
 * Para marcas que não são `span` (fatias de donut, pontos de radar, quadrinhos
 * em SVG): devolve os eventos e o `data-ativa` para espalhar no elemento.
 * `ponto` diz onde o balão aponta, nas coordenadas da tela (padrão: o topo do
 * centro do elemento).
 */
export function useAlvoDica() {
  const ctx = useContext(Contexto);
  return (id: string, conteudo: ReactNode, ponto?: (el: Element) => { x: number; y: number }) => {
    const posicionar = (el: Element, toque: boolean) => {
      const area = ctx?.area.current;
      if (!area || !ctx) return;
      const ra = area.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const p = ponto ? ponto(el) : { x: r.left + r.width / 2, y: r.top };
      ctx.mostrar({ id, conteudo, x: p.x - ra.left, y: p.y - ra.top, toque });
    };
    return {
      'data-ativa': ctx?.ativa?.id === id || undefined,
      onPointerEnter: (e: React.PointerEvent<Element>) => e.pointerType !== 'touch' && posicionar(e.currentTarget, false),
      onPointerUp: (e: React.PointerEvent<Element>) => {
        if (e.pointerType !== 'touch') return;
        if (ctx?.ativa?.id === id) ctx.esconder();
        else posicionar(e.currentTarget, true);
      },
    };
  };
}
