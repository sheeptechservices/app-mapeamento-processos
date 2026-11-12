'use client';

import { AlvoDica, AreaDica } from '@/components/ui/dica';
import { horas, numero, percentual } from '@/lib/formato';
import type { Fatia } from '@/lib/perfil';
import { cn } from '@/lib/cn';

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
 * Quantos processos em cada categoria (setor, frequência, sistema): barras
 * horizontais em tinta, número escrito ao lado. Mostra as maiores; o resto soma
 * em "Outros". A dica traz a parte do total e as horas por mês.
 */
export function BarrasContagem({
  fatias,
  total,
  maximo = 6,
  colorido,
  vazio,
}: {
  fatias: Fatia[];
  /** Base do percentual (processos da sessão). */
  total: number;
  maximo?: number;
  vazio: string;
  /** Cor de identidade por linha (paleta categórica --serie-*, ordem fixa); Outros e Sem setor em cinza. */
  colorido?: boolean;
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
        {linhas.map((l, i) => (
          <li key={l.chave || 'sem'}>
            <AlvoDica id={l.chave || 'sem'} className="block cursor-default" conteudo={<DicaFatia f={l} total={total} />}>
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn('min-w-0 truncate', l.chave ? 'text-tinta-2' : 'text-tinta-3')}>{l.rotulo}</span>
                <span className="numeros shrink-0 text-tinta">{numero(l.n)}</span>
              </span>
              <span className="barra mt-1.5 block">
                <span
                  style={{
                    width: `${Math.max((l.n / maior) * 100, 3)}%`,
                    ...(!l.chave || l.chave === '__outros'
                      ? { background: 'var(--borda-forte)' }
                      : colorido && i < 7
                        ? { background: `var(--serie-${i + 1})` }
                        : {}),
                  }}
                />
              </span>
            </AlvoDica>
          </li>
        ))}
      </ul>
    </AreaDica>
  );
}
