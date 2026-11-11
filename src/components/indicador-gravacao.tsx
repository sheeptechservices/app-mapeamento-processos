'use client';

import { useSyncExternalStore } from 'react';
import { IconAlerta, IconAparelho, IconOffline, IconSalvo } from '@/components/icons';
import { useEstadoGravacao } from '@/lib/local/gravacao';
import { assinarSync, estadoSync, sincronizar, type EstadoSync } from '@/lib/local/sync';
import { cn } from '@/lib/cn';

const SYNC_SERVIDOR: EstadoSync = { fase: 'ocioso', pendentes: 0, ultima: null };

type Tom = 'neutro' | 'alerta';

function descrever(gravacao: string, sync: EstadoSync): { texto: string; icone: React.ReactNode; tom: Tom; vivo?: boolean } {
  const n = sync.pendentes;
  const alteracoes = `${n} ${n === 1 ? 'alteração' : 'alterações'}`;
  if (gravacao === 'salvando') return { texto: 'Salvando', icone: <span className="spinner sm" />, tom: 'neutro' };
  if (gravacao === 'offline')
    return { texto: n ? `Offline - ${alteracoes} no aparelho` : 'Offline - salvo no aparelho', icone: <IconOffline size={18} />, tom: 'alerta' };
  if (sync.fase === 'sincronizando') return { texto: 'Sincronizando', icone: <span className="spinner sm" />, tom: 'neutro' };
  if (sync.fase === 'sem_sessao') return { texto: 'Entre de novo para sincronizar', icone: <IconAlerta size={18} />, tom: 'alerta' };
  if (sync.fase === 'erro' && n) return { texto: `${alteracoes} sem sincronizar`, icone: <IconAlerta size={18} />, tom: 'alerta' };
  if (n) return { texto: `${alteracoes} no aparelho`, icone: <IconAparelho size={18} />, tom: 'neutro' };
  if (sync.ultima) return { texto: 'Salvo', icone: <IconSalvo size={18} />, tom: 'neutro', vivo: true };
  return { texto: 'Salvo no aparelho', icone: <IconAparelho size={18} />, tom: 'neutro' };
}

/**
 * Salvo / Salvando / Offline. `compacto` mostra só o ícone (grupo de botões do
 * topo); o texto vai no title e para o leitor de tela.
 */
export function IndicadorGravacao({ compacto, className }: { compacto?: boolean; className?: string }) {
  const { estado } = useEstadoGravacao();
  const sync = useSyncExternalStore(assinarSync, estadoSync, () => SYNC_SERVIDOR);
  const d = descrever(estado, sync);
  const podeTentar = sync.fase === 'erro' || (sync.pendentes > 0 && sync.fase === 'ocioso' && estado !== 'offline');

  return (
    <button
      type="button"
      role="status"
      aria-live="polite"
      aria-label={d.texto}
      title={podeTentar ? `${d.texto} - toque para sincronizar` : d.texto}
      onClick={() => podeTentar && void sincronizar()}
      className={cn(
        'foco inline-flex items-center gap-1.5 rounded-pilula text-[13px] font-medium whitespace-nowrap transition-colors',
        compacto ? 'size-9 justify-center' : 'min-h-9 px-3',
        d.tom === 'alerta' ? 'bg-analise-fundo text-analise' : 'text-tinta-2 hover:bg-superficie hover:text-tinta',
        podeTentar ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <span key={d.texto} className="troca relative inline-flex items-center gap-1.5">
        {d.icone}
        {/* Em dia com o servidor: ponto verde que respira (o sistema está vivo). */}
        {d.vivo && <span aria-hidden="true" className="ponto-vivo absolute -top-0.5 -right-0.5" />}
        {!compacto && <span>{d.texto}</span>}
      </span>
    </button>
  );
}
