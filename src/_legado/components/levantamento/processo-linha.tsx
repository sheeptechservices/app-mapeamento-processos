'use client';

import Link from 'next/link';
import { IconAlerta, IconSeta } from '@/components/icons';
import type { Processo } from '@/lib/dominio';
import { reais } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { useLev } from './contexto';
import { rotas } from '@/lib/rotas';

/** Linha de processo: código, título, ganho por mês e o que falta para o ROI. */
export function ProcessoLinha({ processo, compacta }: { processo: Processo; compacta?: boolean }) {
  const { levantamento, roiDe } = useLev();
  const r = roiDe(processo);
  const descartado = processo.status === 'descartado';

  return (
    <Link
      href={rotas.processo(levantamento.id, processo.id)}
      className={cn(
        'foco group flex items-center gap-3 rounded-md transition-[background-color,transform] duration-100 hover:bg-gray4 active:scale-[0.99]',
        compacta ? 'min-h-10 px-2 py-1.5' : 'min-h-[56px] px-3 py-2.5',
        descartado && 'opacity-55',
      )}
    >
      <span className="numeros shrink-0 text-[11px] font-bold text-gray2">{processo.codigo}</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold', compacta ? 'text-[13px]' : 'text-[15px]')}>
          {processo.titulo || 'Sem título'}
        </span>
        {!compacta && !!processo._conflitos?.length && (
          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ambar">
            <IconAlerta size={12} /> Editado por outro consultor ao mesmo tempo
          </span>
        )}
        {!compacta && !processo._conflitos?.length && !r.completo && !descartado && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-ambar">
            <IconAlerta size={12} />
            {r.faltando.length === 3 ? 'Sem números' : `Falta ${r.faltando.length === 1 ? '1 número' : `${r.faltando.length} números`}`}
          </span>
        )}
      </span>
      {!compacta && (
        <span className="numeros shrink-0 text-right text-sm font-bold">
          {r.ganho_mes != null && r.ganho_mes > 0 ? (
            <>
              {reais(r.ganho_mes)}
              <span className="block text-[11px] font-medium text-gray">ganho/mês</span>
            </>
          ) : (
            <span className="text-gray2">-</span>
          )}
        </span>
      )}
      {compacta && !r.completo && !descartado && <span className="size-1.5 shrink-0 rounded-pill bg-ambar" aria-label="Faltam números" />}
      {!compacta && <IconSeta size={16} className="shrink-0 text-gray2 transition-transform group-hover:translate-x-0.5" />}
    </Link>
  );
}
