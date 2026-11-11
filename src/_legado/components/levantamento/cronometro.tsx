'use client';

import { useEffect, useState } from 'react';
import { IconCronometro } from '@/components/icons';
import type { Levantamento } from '@/lib/dominio';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar } from '@/lib/local/repo';
import { cn } from '@/lib/cn';

export function tempoDecorrido(l: Pick<Levantamento, 'visita_inicio' | 'visita_acumulado_ms'>, agora: number) {
  return (l.visita_acumulado_ms ?? 0) + (l.visita_inicio ? Math.max(0, agora - l.visita_inicio) : 0);
}

export function formatarDuracao(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(seg)}` : `${p(m)}:${p(seg)}`;
}

/** Relógio que só bate enquanto o cronômetro anda. */
function useAgora(ativo: boolean) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);
  return agora;
}

/**
 * Cronômetro da visita. O começo fica gravado no levantamento (sincroniza), então
 * fechar o app ou trocar de aparelho não perde a contagem.
 */
export function Cronometro({ levantamento, className }: { levantamento: Levantamento; className?: string }) {
  const rodando = levantamento.visita_inicio != null;
  const agora = useAgora(rodando);
  const decorrido = tempoDecorrido(levantamento, agora);

  const alternar = () =>
    comIndicador(() =>
      rodando
        ? atualizar('levantamentos', levantamento.id, {
            visita_inicio: null,
            visita_acumulado_ms: tempoDecorrido(levantamento, Date.now()),
          })
        : atualizar('levantamentos', levantamento.id, {
            visita_inicio: Date.now(),
            // Começar a visita põe o levantamento em campo.
            ...(levantamento.status === 'planejado' ? { status: 'em_campo' as const } : {}),
          }),
    );

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rodando ? 'Pausar cronômetro da visita' : decorrido ? 'Retomar cronômetro da visita' : 'Iniciar visita'}
      className={cn(
        'foco numeros inline-flex min-h-8 items-center gap-1.5 rounded-pill px-2.5 text-xs font-bold whitespace-nowrap transition-colors',
        rodando ? 'bg-limao text-on-limao' : 'bg-gray4 text-gray hover:text-tinta',
        className,
      )}
    >
      <IconCronometro size={14} className={cn(rodando && 'animate-pulse')} />
      {decorrido || rodando ? formatarDuracao(decorrido) : 'Iniciar'}
    </button>
  );
}
