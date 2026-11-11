'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { IconEditar } from '@/components/icons';
import { cn } from '@/lib/cn';
import { lerTextoRico, type Trecho } from '@/lib/texto-rico';

function Trechos({ trechos }: { trechos: Trecho[] }) {
  return trechos.map((t, i) =>
    t.tipo === 'negrito' ? (
      <strong key={i} className="font-semibold text-tinta">
        {t.valor}
      </strong>
    ) : t.tipo === 'italico' ? (
      <em key={i} className="text-tinta-2 italic">
        {t.valor}
      </em>
    ) : (
      <span key={i}>{t.valor}</span>
    ),
  );
}

/** Texto com formatação leve (títulos, listas, negrito, itálico), sem HTML. */
export function TextoRico({ texto, className }: { texto: string | null | undefined; className?: string }) {
  const blocos = lerTextoRico(texto);
  return (
    <div className={cn('space-y-2.5 text-[15px] leading-relaxed text-tinta', className)}>
      {blocos.map((b, i) =>
        b.tipo === 'titulo' ? (
          <p key={i} className="pt-1.5 text-[12px] font-semibold tracking-wide text-tinta-3 uppercase first:pt-0">
            <Trechos trechos={b.trechos} />
          </p>
        ) : b.tipo === 'lista' ? (
          <ul key={i} className="space-y-1">
            {b.itens.map((item, j) => (
              <li
                key={j}
                className={cn(
                  'relative pl-4 before:absolute before:top-[0.68em] before:left-0.5 before:size-[5px] before:rounded-pilula',
                  item.nivel ? 'ml-4 before:border before:border-tinta-3' : 'before:bg-verde-tinta',
                )}
              >
                <Trechos trechos={item.trechos} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.linhas.map((l, j) => (
              <span key={j} className="block">
                <Trechos trechos={l} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}

/**
 * Texto longo formatado no formulário: mostra o texto já formatado e, ao tocar,
 * vira o campo para editar (com a cola da formatação embaixo). Ao sair do
 * campo, volta a mostrar formatado.
 */
export function LinhaTextoRico({
  rotulo,
  valor,
  aoMudar,
  placeholder = 'Não informado',
}: {
  rotulo: string;
  valor: string | null | undefined;
  aoMudar: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [editando, setEditando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  }, [valor, editando]);

  return (
    <div className={cn('group/rico relative px-4 pt-3 pb-3.5', editando ? 'bg-sutil/60' : 'transition-colors hover:bg-sutil/40')}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-tinta-2">
          {rotulo}
        </label>
        {!editando && (
          // Link esticado: o bloco inteiro abre a edição.
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="foco inline-flex items-center gap-1 rounded-pilula px-2 py-1 text-[12px] font-semibold text-tinta-2 after:absolute after:inset-0 after:content-[''] hover:text-tinta"
          >
            <IconEditar size={14} /> Editar
          </button>
        )}
      </div>
      {editando ? (
        <div key="editar" className="troca">
          <textarea
            id={id}
            ref={ref}
            autoFocus
            rows={4}
            className="mt-1.5 w-full resize-none bg-transparent font-mono text-[13px] leading-relaxed outline-none placeholder:text-tinta-3"
            placeholder={placeholder}
            value={valor ?? ''}
            onChange={e => aoMudar(e.target.value)}
            onBlur={() => setEditando(false)}
          />
          <p className="mt-1 text-[12px] text-tinta-3">
            <b className="font-semibold">**negrito**</b> - <i>*itálico*</i> - &quot;- &quot; lista (2 espaços antes: subitem) - &quot;## &quot; título
          </p>
        </div>
      ) : (
        <div key="ver" className="troca mt-1.5">
          {valor?.trim() ? <TextoRico texto={valor} /> : <p className="text-[15px] text-tinta-3">{placeholder}</p>}
        </div>
      )}
    </div>
  );
}
