'use client';

import Link from 'next/link';
import { IconAlerta, IconCheck, IconEditar } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import type { Processo } from '@/lib/dominio';
import { horas, percentual, reais } from '@/lib/formato';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar } from '@/lib/local/repo';
import type { ROIProcesso } from '@/lib/roi';
import { rotas } from '@/lib/rotas';
import { cn } from '@/lib/cn';

/** A frase que o consultor lê para o cliente confirmar. Só cita número que existe. */
function frase(p: Processo, r: ROIProcesso) {
  const partes: string[] = [];
  if (r.horas_mes != null) {
    partes.push(
      `hoje consome ${horas(r.horas_mes)} por mês${r.custo_mes != null ? `, cerca de ${reais(r.custo_mes)} em horas da equipe` : ''}`,
    );
  }
  if (r.perda_mes) partes.push(`${r.horas_mes != null ? 'e ' : ''}coloca ${reais(r.perda_mes)} por mês em risco`);
  let texto = `${p.titulo || 'Este processo'} ${partes.join(' ')}.`;
  if (r.ganho_mes) {
    texto += ` Automatizando, a estimativa é ganhar ${reais(r.ganho_mes)} por mês`;
    texto += r.horas_liberadas_mes ? ` e liberar ${horas(r.horas_liberadas_mes)} da equipe.` : '.';
  }
  return texto;
}

export default function Validar() {
  const { levantamento, processos, roi, roiDe } = useLev();
  const topo = roi.ranking
    .slice(0, 3)
    .map(item => processos.find(p => p.id === item.id))
    .filter((p): p is Processo => !!p);
  const validados = topo.filter(p => p.validado_cliente).length;
  const somaTopo = roi.ranking.slice(0, 3).reduce((s, i) => s + i.peso_mes, 0);
  const pesoTotal = roi.custo_mes + roi.perda_mes;

  return (
    <div className="surge space-y-6">
      <div>
        <p className="rotulo">Fechamento</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Validar com o cliente</h1>
        <p className="mt-1 text-sm leading-relaxed text-gray">
          Leia em voz alta os maiores gargalos e o custo de cada um. Marque o que o cliente confirmar; o que ele corrigir, ajuste no
          processo.
        </p>
      </div>

      {!topo.length ? (
        <div className="rounded-lg border border-dashed border-gray3 p-6 text-center">
          <p className="font-semibold">Ainda não há gargalo com número</p>
          <p className="mt-1 text-sm text-gray">Preencha volume, tempo ou perda dos processos para o ranking aparecer.</p>
        </div>
      ) : (
        <>
          <div className="cartao flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray">Os {topo.length} maiores somam</p>
              <p className="numeros text-2xl font-extrabold">{reais(somaTopo)}/mês</p>
              {pesoTotal > 0 && (
                <p className="text-xs text-gray">{percentual(somaTopo / pesoTotal)} do custo e da perda mapeados</p>
              )}
            </div>
            <div className="text-right">
              <p className="numeros text-2xl font-extrabold">
                {validados}/{topo.length}
              </p>
              <p className="text-xs text-gray">validados</p>
            </div>
          </div>

          <ol className="lista-anima space-y-3">
            {topo.map((p, i) => {
              const r = roiDe(p);
              return (
                <li key={p.id} className={cn('cartao p-4 transition-colors', p.validado_cliente && 'border-verde/40')}>
                  <div className="flex items-start gap-3">
                    <span className="numeros grid size-8 shrink-0 place-items-center rounded-pill bg-tinta text-sm font-bold text-bg">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] leading-snug font-semibold">{frase(p, r)}</p>
                      {r.so_estimativa && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-ambar">
                          <IconAlerta size={14} className="mt-px shrink-0" />
                          {r.origem === 'estimativa' ? 'Número estimado pela Sheep: peça para o cliente confirmar.' : 'Origem do número não informada: confirme com o cliente.'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      aria-pressed={p.validado_cliente}
                      onClick={() =>
                        comIndicador(() =>
                          atualizar('processos', p.id, {
                            validado_cliente: !p.validado_cliente,
                            // Validar um número estimado o torna informado pelo cliente.
                            ...(!p.validado_cliente && r.so_estimativa ? { origem_numero: 'cliente' as const } : {}),
                          }),
                        )
                      }
                      className={cn(
                        'foco inline-flex min-h-[var(--toque)] flex-1 items-center justify-center gap-2 rounded-md border text-sm font-bold transition-[background-color,border-color,color,transform] active:scale-[0.98]',
                        p.validado_cliente ? 'border-verde bg-verde text-white' : 'border-gray3 hover:border-tinta',
                      )}
                    >
                      <IconCheck size={18} strokeWidth={2.4} />
                      {p.validado_cliente ? 'Cliente validou' : 'Cliente confirmou'}
                    </button>
                    <Link
                      href={rotas.processo(levantamento.id, p.id)}
                      className="foco inline-flex min-h-[var(--toque)] items-center gap-1.5 rounded-md border border-gray3 px-4 text-sm font-semibold transition-colors hover:bg-gray4"
                    >
                      <IconEditar size={16} /> Ajustar
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
