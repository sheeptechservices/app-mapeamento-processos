'use client';

import { rotuloStatus, type Configuracoes, type StatusProcesso } from '@/lib/dominio';
import { AlvoDica, AreaDica } from '@/components/ui/dica';
import { horas, numero, percentual } from '@/lib/formato';
import type { Fatia } from '@/lib/perfil';
import { ETAPAS } from '@/lib/sessao-resumo';
import { cn } from '@/lib/cn';

/**
 * Barra segmentada das etapas (Pendente -> Automatizado), cores da rampa ordinal
 * validada. Nunca só cor: a legenda traz nome e quantidade, e cada trecho mostra
 * a dica da casa ao passar o mouse (ou tocar). Com `compacta`, só a barra (cartão
 * da sessão no mapa, onde o cartão inteiro é clicável: fica o `title`).
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
  const estilo = (n: number, cor: string) => ({ flexGrow: n, flexBasis: 0, background: cor, animation: 'cresce 0.7s var(--curva) both' });
  if (compacta) {
    return (
      <div className={className}>
        <div
          role="img"
          aria-label={total ? `Processos por etapa: ${resumo}` : 'Nenhum processo ainda'}
          className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-pilula bg-sutil"
        >
          {presentes.map(e => (
            <span
              key={e.status}
              title={`${rotuloStatus(e.status, cfg)}: ${contagem[e.status]}`}
              className="h-full origin-left transition-[flex-grow] duration-500 ease-v6 first:rounded-l-pilula last:rounded-r-pilula"
              style={estilo(contagem[e.status], e.cor)}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      <AreaDica>
        <div
          role="img"
          aria-label={total ? `Processos por etapa: ${resumo}` : 'Nenhum processo ainda'}
          className="marcas flex h-3 w-full gap-[2px] rounded-pilula bg-sutil"
        >
          {presentes.map(e => {
            const n = contagem[e.status];
            return (
              <AlvoDica
                key={e.status}
                id={e.status}
                conteudo={
                  <>
                    <strong>{rotuloStatus(e.status, cfg)}</strong>
                    {n} {n === 1 ? 'processo' : 'processos'}
                    <span className="apoio">{percentual(n / total)} da sessão</span>
                  </>
                }
                // Alvo maior que a marca: a faixa de toque passa da barra em cima e embaixo.
                className="relative h-full origin-left cursor-default transition-[flex-grow,opacity] duration-500 ease-v6 before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] first:rounded-l-pilula last:rounded-r-pilula"
                style={estilo(n, e.cor)}
              />
            );
          })}
        </div>
      </AreaDica>
      {
        <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5">
          {ETAPAS.map(e => (
            <li key={e.status} className={cn('flex items-center gap-2 text-[13px]', !contagem[e.status] && 'text-tinta-3')}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: e.cor }} />
              <span className="min-w-0 truncate text-tinta-2">{rotuloStatus(e.status, cfg)}</span>
              <span className="numeros ml-auto text-tinta">{contagem[e.status]}</span>
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

const processos = (n: number) => `${numero(n)} ${n === 1 ? 'processo' : 'processos'}`;

/** Texto da dica de uma fatia: quantos, parte do total e as horas por mês que tomam hoje. */
function DicaFatia({ f, total }: { f: Fatia; total: number }) {
  return (
    <>
      <strong>{f.rotulo}</strong>
      {processos(f.n)}
      {total > 0 && ` (${percentual(f.n / total)})`}
      {f.horas > 0 && <span className="apoio">{horas(f.horas)} por mês hoje</span>}
    </>
  );
}

/**
 * Distribuição ordinal (ex.: Manual -> Parcial -> Automático) numa barra
 * segmentada, com as cores da rampa na ordem e "Não informado" em cinza. A
 * legenda traz nome e quantidade de todas as opções; cada trecho tem dica.
 */
export function BarraSegmentada({ fatias, rotulo }: { fatias: Fatia[]; rotulo: string }) {
  const total = fatias.reduce((a, f) => a + f.n, 0);
  const conhecidas = fatias.filter(f => f.chave).length;
  // Rampa ordinal validada: com 3 opções usa as pontas e o meio (1, 3, 5).
  const cor = (f: Fatia, i: number) =>
    !f.chave ? 'var(--borda-forte)' : `var(--etapa-${conhecidas <= 1 ? 3 : Math.round(1 + (i * 4) / (conhecidas - 1))})`;
  const comCor = fatias.map((f, i) => ({ f, cor: cor(f, i) }));
  const resumo = fatias
    .filter(f => f.n)
    .map(f => `${f.n} ${f.rotulo.toLowerCase()}`)
    .join(', ');
  return (
    <div>
      <AreaDica>
        <div
          role="img"
          aria-label={total ? `${rotulo}: ${resumo}` : `${rotulo}: nenhum processo`}
          className="marcas flex h-3 w-full gap-[2px] rounded-pilula bg-sutil"
        >
          {comCor
            .filter(({ f }) => f.n > 0)
            .map(({ f, cor }) => (
              <AlvoDica
                key={f.chave || 'sem'}
                id={f.chave || 'sem'}
                conteudo={<DicaFatia f={f} total={total} />}
                className="relative h-full cursor-default transition-[flex-grow,opacity] duration-500 ease-v6 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] first:rounded-l-pilula last:rounded-r-pilula"
                style={{ flexGrow: f.n, flexBasis: 0, background: cor, animation: 'cresce 0.7s var(--curva) both' }}
              />
            ))}
        </div>
      </AreaDica>
      <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5">
        {comCor.map(({ f, cor }) => (
          <li key={f.chave || 'sem'} className={cn('flex items-center gap-2 text-[13px]', !f.n && 'text-tinta-3')}>
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: cor }} />
            <span className="min-w-0 truncate text-tinta-2">{f.rotulo}</span>
            <span className="numeros ml-auto text-tinta">{f.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Quantos processos em cada categoria (setor, frequência, sistema): barras
 * horizontais em tinta, número escrito ao lado. Mostra as maiores; o resto soma
 * em "Outros". A dica traz a parte do total e as horas por mês.
 */
export function BarrasContagem({
  fatias,
  total,
  maximo = 6,
  vazio,
}: {
  fatias: Fatia[];
  /** Base do percentual (processos da sessão). */
  total: number;
  maximo?: number;
  vazio: string;
}) {
  if (!fatias.length) return <p className="text-[13px] leading-relaxed text-tinta-2">{vazio}</p>;
  const topo = fatias.slice(0, maximo);
  const resto = fatias.slice(maximo);
  const linhas = resto.length
    ? [
        ...topo,
        {
          chave: '__outros',
          rotulo: `Outros (${resto.length})`,
          n: resto.reduce((a, f) => a + f.n, 0),
          horas: resto.reduce((a, f) => a + f.horas, 0),
        },
      ]
    : topo;
  const maior = Math.max(...linhas.map(l => l.n));
  return (
    <AreaDica>
      <ul className="marcas space-y-3">
        {linhas.map(l => (
          <li key={l.chave || 'sem'}>
            <AlvoDica id={l.chave || 'sem'} className="block cursor-default" conteudo={<DicaFatia f={l} total={total} />}>
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn('min-w-0 truncate', l.chave ? 'text-tinta-2' : 'text-tinta-3')}>{l.rotulo}</span>
                <span className="numeros shrink-0 text-tinta">{numero(l.n)}</span>
              </span>
              <span className="barra mt-1.5 block">
                <span style={{ width: `${Math.max((l.n / maior) * 100, 3)}%`, ...(l.chave ? {} : { background: 'var(--borda-forte)' }) }} />
              </span>
            </AlvoDica>
          </li>
        ))}
      </ul>
    </AreaDica>
  );
}
