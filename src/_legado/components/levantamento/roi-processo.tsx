'use client';

import { IconAlerta } from '@/components/icons';
import { rotuloDe, ORIGENS } from '@/lib/dominio';
import { horas, percentual, reais } from '@/lib/formato';
import { ROTULO_CAMPO_ROI, type ROIProcesso } from '@/lib/roi';
import { cn } from '@/lib/cn';

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm opacity-75">{rotulo}</span>
      <span className={cn('numeros text-right', forte ? 'text-lg font-extrabold' : 'font-bold')}>{valor}</span>
    </div>
  );
}

/** A conta do processo, aberta: o consultor vê de onde sai cada número. */
export function ROIProcessoCartao({ r, compacto }: { r: ROIProcesso; compacto?: boolean }) {
  return (
    <div className="rounded-lg bg-tinta p-4 text-bg">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wide uppercase opacity-60">ROI do processo</p>
        <span
          className={cn(
            'rounded-pill px-2 py-0.5 text-[11px] font-bold',
            r.so_estimativa ? 'bg-ambar text-white' : 'bg-limao text-on-limao',
          )}
        >
          {r.origem === 'nao_informada' ? 'Origem não informada' : rotuloDe(ORIGENS, r.origem)}
        </span>
      </div>
      <div className="mt-2 divide-y divide-white/10 dark:divide-black/10">
        <Linha rotulo="Horas por mês" valor={horas(r.horas_mes)} />
        {!compacto && (
          <Linha
            rotulo={r.custo_hora_do_processo ? 'Custo da hora (do processo)' : 'Custo da hora (do levantamento)'}
            valor={reais(r.custo_hora, true)}
          />
        )}
        <Linha rotulo="Custo por mês" valor={reais(r.custo_mes)} />
        <Linha rotulo="Perda ou receita em risco" valor={reais(r.perda_mes)} />
        <Linha rotulo={`Redução esperada${r.reducao_padrao ? ' (padrão)' : ''}`} valor={percentual(r.reducao)} />
        <Linha rotulo="Horas liberadas por mês" valor={horas(r.horas_liberadas_mes)} />
        <Linha rotulo="Ganho por mês" valor={reais(r.ganho_mes)} forte />
        <Linha rotulo="Ganho por ano" valor={reais(r.ganho_ano)} forte />
      </div>
      {!r.completo && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-white/10 px-3 py-2 text-xs leading-relaxed dark:bg-black/10">
          <IconAlerta size={14} className="mt-px shrink-0 text-limao dark:text-limao-tinta" />
          Falta {r.faltando.map(c => ROTULO_CAMPO_ROI[c]).join(', ')} para fechar a conta.
        </p>
      )}
    </div>
  );
}
