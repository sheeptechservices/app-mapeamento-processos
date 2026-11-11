'use client';

import Link from 'next/link';
import { IconCheckCirculo } from '@/components/icons';
import { estiloBotao } from '@/components/ui/botao';
import { cn } from '@/lib/cn';
import { rotas } from '@/lib/rotas';
import { useLev } from '@/components/levantamento/contexto';
import { AvisoEstimativa, Kpi, RankingGargalos } from '@/components/levantamento/placar-resumo';
import { ORIGENS } from '@/lib/dominio';
import { horas, percentual, reais, reaisCompacto } from '@/lib/formato';

export default function Placar() {
  const { levantamento, roi } = useLev();
  const origens = [
    ...ORIGENS.map(o => ({ rotulo: o.rotulo, valor: roi.ganho_mes_por_origem[o.valor] })),
    { rotulo: 'Sem origem', valor: roi.ganho_mes_por_origem.nao_informada },
  ].filter(o => o.valor > 0);

  return (
    <div className="surge space-y-6">
      <div>
        <p className="rotulo">ROI estimado</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Placar</h1>
        <p className="mt-1 text-sm text-gray">
          {roi.processos} processos na conta - {percentual(roi.cobertura)} com volume, tempo e custo da hora
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Kpi destaque rotulo="Ganho projetado/ano" valor={reaisCompacto(roi.ganho_ano)} detalhe={`${reais(roi.ganho_mes)} por mês`} />
        <Kpi rotulo="Horas gastas por mês" valor={horas(roi.horas_mes)} detalhe={`${horas(roi.horas_liberadas_mes)} podem ser liberadas`} />
        <Kpi rotulo="Custo dos processos/mês" valor={reais(roi.custo_mes)} />
        <Kpi rotulo="Perda ou receita em risco/mês" valor={reais(roi.perda_mes)} />
      </div>

      {roi.peso_sobre_faturamento != null && (
        <div className="cartao p-4">
          <p className="rotulo">Sobre o faturamento</p>
          <p className="mt-2 text-sm leading-relaxed">
            Os processos mapeados custam e arriscam <strong className="numeros">{percentual(roi.peso_sobre_faturamento)}</strong> do
            faturamento mensal. O ganho projetado equivale a{' '}
            <strong className="numeros">{percentual(roi.ganho_sobre_faturamento_anual)}</strong> do faturamento do ano (
            {reaisCompacto((levantamento.faturamento_mensal ?? 0) * 12)}).
          </p>
        </div>
      )}

      <AvisoEstimativa parcela={roi.parcela_estimativa} />

      {roi.ranking.length > 0 && (
        <Link href={rotas.lev(levantamento.id, 'validar')} className={cn(estiloBotao({ variante: 'escuro', tamanho: 'lg' }), 'w-full')}>
          <IconCheckCirculo size={18} /> Validar os maiores gargalos com o cliente
        </Link>
      )}

      <section className="cartao p-4">
        <p className="rotulo mb-4">Maiores gargalos (custo + perda por mês)</p>
        <RankingGargalos limite={10} />
      </section>

      {origens.length > 0 && (
        <section className="cartao p-4">
          <p className="rotulo mb-3">Ganho por origem do número</p>
          <div className="flex h-2.5 overflow-hidden rounded-pill bg-gray4">
            {origens.map((o, i) => (
              <span
                key={o.rotulo}
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(o.valor / roi.ganho_mes) * 100}%`,
                  background: ['var(--black)', 'var(--gray)', 'var(--amber)', 'var(--gray2)'][i],
                }}
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {origens.map((o, i) => (
              <li key={o.rotulo} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-pill"
                  style={{ background: ['var(--black)', 'var(--gray)', 'var(--amber)', 'var(--gray2)'][i] }}
                />
                <span className="flex-1">{o.rotulo}</span>
                <span className="numeros font-semibold">{reais(o.valor)}/mês</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
