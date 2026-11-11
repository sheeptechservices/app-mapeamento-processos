'use client';

import { rotuloStatus, type Configuracoes, type StatusProcesso } from '@/lib/dominio';
import { reais } from '@/lib/formato';
import { ETAPAS } from '@/lib/sessao-resumo';
import { cn } from '@/lib/cn';

/**
 * Barra segmentada das etapas (Pendente -> Automatizado), cores da rampa ordinal
 * validada. Nunca só cor: a legenda traz nome e quantidade, e cada trecho tem
 * título (passar o mouse). Com `compacta`, só a barra (cartão da sessão no mapa).
 */
export function BarraEtapas({
  contagem,
  cfg,
  compacta,
  className,
}: {
  contagem: Record<StatusProcesso, number>;
  cfg?: Pick<Configuracoes, 'rotulos_status'> | null;
  compacta?: boolean;
  className?: string;
}) {
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  const presentes = ETAPAS.filter(e => contagem[e.status] > 0);
  const resumo = presentes.map(e => `${contagem[e.status]} ${rotuloStatus(e.status, cfg).toLowerCase()}`).join(', ');
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={total ? `Processos por etapa: ${resumo}` : 'Nenhum processo ainda'}
        className={cn('flex w-full gap-[2px] overflow-hidden rounded-pilula bg-sutil', compacta ? 'h-1.5' : 'h-3')}
      >
        {presentes.map(e => (
          <span
            key={e.status}
            title={`${rotuloStatus(e.status, cfg)}: ${contagem[e.status]}`}
            className="h-full origin-left transition-[flex-grow] duration-500 ease-v6 first:rounded-l-pilula last:rounded-r-pilula"
            style={{ flexGrow: contagem[e.status], flexBasis: 0, background: e.cor, animation: 'cresce 0.7s var(--curva) both' }}
          />
        ))}
      </div>
      {!compacta && (
        <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5">
          {ETAPAS.map(e => (
            <li key={e.status} className={cn('flex items-center gap-2 text-[13px]', !contagem[e.status] && 'text-tinta-3')}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: e.cor }} />
              <span className="min-w-0 truncate text-tinta-2">{rotuloStatus(e.status, cfg)}</span>
              <span className="numeros ml-auto text-tinta">{contagem[e.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Ganho por mês de cada setor (uma série, magnitude): barras horizontais em
 * tinta, valor escrito ao lado. Mostra os maiores; o resto soma em "Outros".
 */
export function GanhoPorSetor({ grupos, maximo = 5 }: { grupos: { setor: string; ganho: number; processos: number }[]; maximo?: number }) {
  const comGanho = grupos.filter(g => g.ganho > 0).sort((a, b) => b.ganho - a.ganho);
  if (!comGanho.length) {
    return (
      <p className="text-[13px] leading-relaxed text-tinta-2">
        O ganho aparece quando os processos tiverem quantas vezes, tempo médio e custo da hora.
      </p>
    );
  }
  const topo = comGanho.slice(0, maximo);
  const resto = comGanho.slice(maximo);
  const linhas = resto.length
    ? [...topo, { setor: 'Outros', ganho: resto.reduce((a, g) => a + g.ganho, 0), processos: resto.reduce((a, g) => a + g.processos, 0) }]
    : topo;
  const maior = Math.max(...linhas.map(l => l.ganho));
  return (
    <ul className="space-y-3">
      {linhas.map(l => (
        <li key={l.setor} title={`${l.setor}: ${reais(l.ganho)} por mês em ${l.processos} ${l.processos === 1 ? 'processo' : 'processos'}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-tinta-2">{l.setor}</span>
            <span className="numeros shrink-0 text-tinta">{reais(l.ganho)}</span>
          </div>
          <div className="barra mt-1.5">
            <span style={{ width: `${Math.max((l.ganho / maior) * 100, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
