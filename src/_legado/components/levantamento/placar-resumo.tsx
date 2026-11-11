'use client';

import Link from 'next/link';
import { IconAlerta, IconInfo } from '@/components/icons';
import { horas, percentual, reais, reaisCompacto } from '@/lib/formato';
import { cn } from '@/lib/cn';
import { useLev } from './contexto';
import { rotas } from '@/lib/rotas';

export function Kpi({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={cn('rounded-md p-3.5', destaque ? 'bg-limao text-on-limao' : 'bg-gray4')}>
      <p className={cn('text-[11px] font-bold tracking-wide uppercase', destaque ? 'opacity-70' : 'text-gray')}>{rotulo}</p>
      <p className="numeros mt-1 text-[22px] leading-none font-extrabold tracking-tight">{valor}</p>
      {detalhe && <p className={cn('mt-1.5 text-xs', destaque ? 'opacity-75' : 'text-gray')}>{detalhe}</p>}
    </div>
  );
}

/** Aviso quando o ganho se apoia demais em número não confirmado pelo cliente. */
export function AvisoEstimativa({ parcela }: { parcela: number }) {
  if (parcela < 0.5) return null;
  return (
    <p className="surge flex items-start gap-2 rounded-md bg-ambar-suave px-3 py-2.5 text-xs leading-relaxed text-ambar">
      <IconAlerta size={16} className="mt-px shrink-0" />
      {percentual(parcela)} do ganho vem de Estimativa Sheep ou de número sem origem. Valide com o cliente antes de levar para a
      proposta.
    </p>
  );
}

/** Ranking dos maiores gargalos por custo + perda mensal. */
export function RankingGargalos({ limite = 5 }: { limite?: number }) {
  const { levantamento, processos, roi } = useLev();
  const topo = roi.ranking.slice(0, limite);
  const maior = topo[0]?.peso_mes ?? 1;
  if (!topo.length) {
    return <p className="text-sm text-gray">O ranking aparece quando os processos tiverem volume, tempo ou perda.</p>;
  }
  return (
    <ol key={topo.map(t => t.id).join()} className="lista-anima space-y-3">
      {topo.map((item, i) => {
        const p = processos.find(x => x.id === item.id);
        return (
          <li key={item.id}>
            <Link href={rotas.processo(levantamento.id, item.id)} className="foco group block rounded-sm">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="numeros w-4 shrink-0 font-bold text-gray2">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold group-hover:underline">{p?.titulo}</span>
                <span className="numeros shrink-0 font-bold">{reais(item.peso_mes)}</span>
              </div>
              <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-pill bg-gray4">
                <span
                  className="block h-full rounded-pill bg-tinta transition-[width] duration-500"
                  style={{ width: `${Math.max(4, (item.peso_mes / maior) * 100)}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Coluna direita do desktop. */
export function PlacarResumo() {
  const { levantamento, roi } = useLev();
  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <p className="rotulo">Placar de ROI</p>
        <Link href={rotas.lev(levantamento.id, 'placar')} className="text-xs font-semibold text-gray hover:text-tinta hover:underline">
          Ver completo
        </Link>
      </div>
      <Kpi destaque rotulo="Ganho projetado/ano" valor={reaisCompacto(roi.ganho_ano)} detalhe={`${reais(roi.ganho_mes)} por mês`} />
      <div className="grid grid-cols-2 gap-2">
        <Kpi rotulo="Horas/mês" valor={horas(roi.horas_mes)} detalhe={`${horas(roi.horas_liberadas_mes)} liberadas`} />
        <Kpi rotulo="Custo/mês" valor={reaisCompacto(roi.custo_mes)} />
        <Kpi rotulo="Perda/mês" valor={reaisCompacto(roi.perda_mes)} />
        <Kpi rotulo="Com números" valor={`${roi.completos}/${roi.processos}`} detalhe="processos completos" />
      </div>
      <AvisoEstimativa parcela={roi.parcela_estimativa} />
      <div>
        <p className="rotulo mb-3">Maiores gargalos</p>
        <RankingGargalos />
      </div>
      {levantamento.custo_hora == null && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-gray">
          <IconInfo size={16} className="mt-px shrink-0" />
          Sem custo médio da hora, o custo só aparece nos processos que têm custo próprio.{' '}
          <Link href={rotas.lev(levantamento.id, 'dados')} className="font-semibold text-tinta underline">
            Informar
          </Link>
        </p>
      )}
    </div>
  );
}
