'use client';

import type { CSSProperties, ReactNode } from 'react';
import { AreaDica, useAlvoDica } from '@/components/ui/dica';
import { horas, numero, percentual } from '@/lib/formato';
import type { Fatia } from '@/lib/perfil';
import { cn } from '@/lib/cn';

/*
 * Gráficos do perfil dos processos no quadro da sessão. Cada forma tem um
 * trabalho: donut para partes de um todo com poucas opções, radar para os sinais
 * de automação lado a lado, colunas para a frequência (ordem do período),
 * pirulito para os sistemas e waffle (um quadrinho por processo) para a origem
 * dos números. Cores: rampa ordinal --etapa-* para o que tem ordem, paleta
 * categórica --serie-* para identidade, cinza para "Não informado". Nunca só
 * cor: sempre legenda ou rótulo escrito, e dica em cada marca.
 */

const processos = (n: number) => `${numero(n)} ${n === 1 ? 'processo' : 'processos'}`;

export function DicaFatia({ f, total }: { f: Fatia; total: number }) {
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
 * Cor de cada fatia: `rampa` dá as cores das opções conhecidas, na ordem (padrão:
 * rampa verde --etapa-*, com 3 opções nas pontas e no meio); "Não informado" é cinza.
 */
export function coresOrdinais(fatias: Fatia[], rampa?: string[]) {
  const conhecidas = fatias.filter(f => f.chave).length;
  return fatias.map((f, i) =>
    !f.chave ? 'var(--borda-forte)' : (rampa?.[i] ?? `var(--etapa-${conhecidas <= 1 ? 3 : Math.round(1 + (i * 4) / (conhecidas - 1))})`),
  );
}

/** Rampa azul de 3 passos (Documentado: Não -> Parcial -> Sim). */
export const RAMPA_AZUL = ['var(--azul-1)', 'var(--azul-2)', 'var(--azul-3)'];

function Legenda({ fatias, cores, colunas = 1 }: { fatias: Fatia[]; cores: string[]; colunas?: 1 | 2 }) {
  return (
    <ul className={cn('grid gap-x-5 gap-y-1.5', colunas === 2 && 'grid-cols-2')}>
      {fatias.map((f, i) => (
        <li key={f.chave || 'sem'} className={cn('flex items-center gap-2 text-[13px]', !f.n && 'text-tinta-3')}>
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: cores[i] }} />
          <span className="min-w-0 truncate text-tinta-2">{f.rotulo}</span>
          <span className="numeros ml-auto text-tinta">{f.n}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Donut ──────────────────────────────────────────────────────────────

function ArcosDonut({ fatias, cores, total }: { fatias: Fatia[]; cores: string[]; total: number }) {
  const alvo = useAlvoDica();
  const R = 46;
  const C = 2 * Math.PI * R;
  const VAO = fatias.filter(f => f.n).length > 1 ? 2.2 : 0; // fresta de 2px entre fatias
  // Onde cada fatia começa no anel (soma das anteriores).
  const inicios = fatias.map((_, i) => fatias.slice(0, i).reduce((a, f) => a + (f.n / total) * C, 0));
  return (
    <svg viewBox="0 0 120 120" className="donut-entra size-full -rotate-90 overflow-visible" aria-hidden="true">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--sutil)" strokeWidth="16" />
      {fatias.map((f, i) => {
        if (!f.n) return null;
        const comprimento = (f.n / total) * C;
        const inicio = inicios[i];
        const meio = ((inicio + comprimento / 2) / C) * 2 * Math.PI; // ângulo do meio da fatia (0 = topo)
        const arco = (
          <circle
            key={f.chave || 'sem'}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={cores[i]}
            strokeWidth="16"
            strokeDasharray={`${Math.max(comprimento - VAO, 0.5)} ${C}`}
            strokeDashoffset={-inicio}
            className="cursor-default transition-[opacity,stroke-width] duration-150 data-[ativa]:[stroke-width:19]"
            {...alvo(f.chave || 'sem', <DicaFatia f={f} total={total} />, el => {
              // O balão aponta para o meio da fatia, na borda de fora do anel.
              const svg = (el as SVGElement).ownerSVGElement!.getBoundingClientRect();
              const escala = svg.width / 120;
              return { x: svg.left + (60 + Math.sin(meio) * 54) * escala, y: svg.top + (60 - Math.cos(meio) * 54) * escala };
            })}
          />
        );
        return arco;
      })}
    </svg>
  );
}

/**
 * Donut com o número que importa no meio (ex.: "62% manuais") e legenda ao lado.
 * Para partes de um todo com poucas opções (até 4 + Não informado).
 */
export function Donut({
  fatias,
  rotulo,
  centro,
  legendaCentro,
  rampa,
}: {
  fatias: Fatia[];
  rotulo: string;
  centro: ReactNode;
  legendaCentro: string;
  rampa?: string[];
}) {
  const total = fatias.reduce((a, f) => a + f.n, 0);
  const cores = coresOrdinais(fatias, rampa);
  const resumo = fatias
    .filter(f => f.n)
    .map(f => `${f.n} ${f.rotulo.toLowerCase()}`)
    .join(', ');
  return (
    <div className="flex items-center gap-4">
      <AreaDica className="size-[112px] shrink-0">
        <div role="img" aria-label={`${rotulo}: ${resumo || 'nenhum processo'}`} className="marcas relative size-full">
          <ArcosDonut fatias={fatias} cores={cores} total={total} />
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="numeros text-[20px] leading-none">{centro}</span>
          <span className="mt-1 text-[11px] text-tinta-2">{legendaCentro}</span>
        </div>
      </AreaDica>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[12px] font-medium text-tinta-2">{rotulo}</p>
        <Legenda fatias={fatias} cores={cores} />
      </div>
    </div>
  );
}

// ─── Radar ──────────────────────────────────────────────────────────────

function PontosRadar({ eixos, total, pontos }: { eixos: RadarEixo[]; total: number; pontos: { x: number; y: number }[] }) {
  const alvo = useAlvoDica();
  return (
    <>
      {eixos.map((e, i) => (
        <g key={e.chave} className="cursor-default" {...alvo(e.chave, <DicaSinal e={e} total={total} />)}>
          {/* Alvo maior que a marca. */}
          <circle cx={pontos[i].x} cy={pontos[i].y} r="13" fill="transparent" />
          <circle cx={pontos[i].x} cy={pontos[i].y} r="4.5" fill="var(--verde-tinta)" stroke="var(--superficie)" strokeWidth="2" />
        </g>
      ))}
    </>
  );
}

type RadarEixo = { chave: string; rotulo: string; dica: string; n: number };

function DicaSinal({ e, total }: { e: RadarEixo; total: number }) {
  return (
    <>
      <strong>{e.rotulo}</strong>
      {processos(e.n)} de {numero(total)} ({total ? percentual(e.n / total) : '-'})<span className="apoio">{e.dica}</span>
    </>
  );
}

/**
 * Radar dos sinais de automação: cada eixo vai de 0 a 100% dos processos.
 * Quanto mais aberta a forma, mais a sessão pede automação. Rótulos com o
 * percentual escrito ao lado de cada eixo.
 */
export function Radar({ eixos, total }: { eixos: RadarEixo[]; total: number }) {
  const C = 120;
  const R = 78;
  const angulo = (i: number) => (i / eixos.length) * 2 * Math.PI - Math.PI / 2;
  const ponto = (i: number, f: number) => ({ x: C + Math.cos(angulo(i)) * R * f, y: C + Math.sin(angulo(i)) * R * f });
  const fracoes = eixos.map(e => (total ? e.n / total : 0));
  const pontos = fracoes.map((f, i) => ponto(i, Math.max(f, 0.02)));
  const anel = (f: number) =>
    eixos
      .map((_, i) => ponto(i, f))
      .map(p => `${p.x},${p.y}`)
      .join(' ');
  const resumo = eixos.map((e, i) => `${e.rotulo} ${percentual(fracoes[i])}`).join(', ');
  return (
    <AreaDica className="mx-auto w-full max-w-[360px]">
      <div className="relative aspect-[4/3] w-full">
        <svg
          viewBox="-40 0 320 240"
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={`Sinais de automação: ${resumo}`}
        >
          {[0.25, 0.5, 0.75, 1].map(f => (
            <polygon
              key={f}
              points={anel(f)}
              fill={f === 1 ? 'var(--sutil)' : 'none'}
              fillOpacity={0.5}
              stroke="var(--borda)"
              strokeWidth="1"
            />
          ))}
          {eixos.map((e, i) => {
            const p = ponto(i, 1);
            return <line key={e.chave} x1={C} y1={C} x2={p.x} y2={p.y} stroke="var(--borda)" strokeWidth="1" />;
          })}
          <polygon
            points={pontos.map(p => `${p.x},${p.y}`).join(' ')}
            fill="var(--verde)"
            fillOpacity="0.45"
            stroke="var(--verde-tinta)"
            strokeWidth="2"
            strokeLinejoin="round"
            className="radar-entra"
          />
          <PontosRadar eixos={eixos} total={total} pontos={pontos} />
          {eixos.map((e, i) => {
            const p = ponto(i, 1.2);
            const cos = Math.cos(angulo(i));
            const ancora = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
            return (
              <text key={e.chave} x={p.x} y={p.y} textAnchor={ancora} dominantBaseline="middle" className="fill-tinta-2 text-[10.5px]">
                {e.rotulo}
                <tspan className="numeros fill-tinta" dx="4">
                  {percentual(fracoes[i])}
                </tspan>
              </text>
            );
          })}
        </svg>
      </div>
    </AreaDica>
  );
}

// ─── Colunas ────────────────────────────────────────────────────────────

function Coluna({ f, total, maior, cor }: { f: Fatia; total: number; maior: number; cor: string }) {
  const alvo = useAlvoDica();
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center" {...alvo(f.chave || 'sem', <DicaFatia f={f} total={total} />)}>
      <span className="numeros mb-1 text-[13px] text-tinta">{numero(f.n)}</span>
      <span className="flex h-[96px] w-full items-end justify-center">
        <span
          className="block w-full max-w-[38px] origin-bottom rounded-t-[6px] transition-[filter] duration-150 [animation:sobe_0.7s_var(--curva)_both]"
          style={{ height: `${Math.max((f.n / maior) * 100, 3)}%`, background: cor }}
        />
      </span>
      <span className={cn('mt-2 w-full truncate text-center text-[12px]', f.chave ? 'text-tinta-2' : 'text-tinta-3')}>{f.rotulo}</span>
    </li>
  );
}

/** Colunas verticais (ordem natural da categoria, ex.: Diário -> Sob demanda), valor em cima. */
export function Colunas({ fatias, total, vazio }: { fatias: Fatia[]; total: number; vazio: string }) {
  if (!fatias.length) return <p className="text-[13px] leading-relaxed text-tinta-2">{vazio}</p>;
  const maior = Math.max(...fatias.map(f => f.n));
  return (
    <AreaDica>
      <ul className="marcas flex items-stretch gap-2 border-b border-borda pb-0">
        {fatias.map(f => (
          <Coluna key={f.chave || 'sem'} f={f} total={total} maior={maior} cor={f.chave ? 'var(--verde-tinta)' : 'var(--borda-forte)'} />
        ))}
      </ul>
    </AreaDica>
  );
}

// ─── Pirulito ───────────────────────────────────────────────────────────

function LinhaPirulito({ f, total, maior }: { f: Fatia; total: number; maior: number }) {
  const alvo = useAlvoDica();
  const largura = `${Math.max((f.n / maior) * 100, 4)}%`;
  return (
    <li
      className="grid cursor-default grid-cols-[minmax(0,7.5rem)_1fr_2rem] items-center gap-3"
      {...alvo(f.chave, <DicaFatia f={f} total={total} />)}
    >
      <span className="truncate text-[13px] text-tinta-2">{f.rotulo}</span>
      <span className="relative h-3">
        <span
          className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-pilula bg-[var(--serie-7)] [animation:cresce_0.7s_var(--curva)_both]"
          style={{ width: largura, transformOrigin: 'left' }}
        />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-pilula border-2 border-superficie bg-[var(--serie-7)] shadow-[0_0_0_1px_var(--serie-7)]"
          style={{ left: largura }}
        />
      </span>
      <span className="numeros text-right text-[13px] text-tinta">{numero(f.n)}</span>
    </li>
  );
}

/** Pirulito (linha fina + ponto): ranking leve, bom para muitos itens com rótulo longo. */
export function Pirulito({ fatias, total, maximo = 7, vazio }: { fatias: Fatia[]; total: number; maximo?: number; vazio: string }) {
  if (!fatias.length) return <p className="text-[13px] leading-relaxed text-tinta-2">{vazio}</p>;
  const linhas = fatias.slice(0, maximo);
  const maior = Math.max(...linhas.map(l => l.n));
  return (
    <AreaDica>
      <ul className="marcas space-y-2.5">
        {linhas.map(l => (
          <LinhaPirulito key={l.chave} f={l} total={total} maior={maior} />
        ))}
      </ul>
      {fatias.length > maximo && (
        <p className="mt-3 text-[12px] text-tinta-3">e mais {fatias.length - maximo} citados uma ou poucas vezes</p>
      )}
    </AreaDica>
  );
}

// ─── Waffle ─────────────────────────────────────────────────────────────

function Quadrinho({ f, total, cor, style }: { f: Fatia; total: number; cor: string; style?: CSSProperties }) {
  const alvo = useAlvoDica();
  return (
    <span
      className="aspect-square cursor-default rounded-[3px] [animation:surge_0.4s_var(--curva)_both]"
      style={{ background: cor, ...style }}
      {...alvo(f.chave || 'sem', <DicaFatia f={f} total={total} />)}
    />
  );
}

/**
 * Waffle: um quadrinho por processo (acima de 100, cada um vale 1%), na cor da
 * fatia. Mostra de relance quanto do todo é de cada tipo.
 */
export function Waffle({ fatias, rotulo, cores: paleta }: { fatias: Fatia[]; rotulo: string; cores?: string[] }) {
  const total = fatias.reduce((a, f) => a + f.n, 0);
  const cores = coresOrdinais(fatias, paleta);
  const porCelula = total > 100 ? total / 100 : 1;
  const celulas = fatias.flatMap((f, i) => Array.from({ length: Math.round(f.n / porCelula) }, () => ({ f, cor: cores[i] })));
  const resumo = fatias
    .filter(f => f.n)
    .map(f => `${f.n} ${f.rotulo.toLowerCase()}`)
    .join(', ');
  return (
    <div>
      <AreaDica>
        <div
          role="img"
          aria-label={`${rotulo}: ${resumo || 'nenhum processo'}`}
          className="marcas grid grid-cols-[repeat(10,minmax(0,1fr))] gap-[3px]"
        >
          {celulas.map((c, i) => (
            <Quadrinho key={i} f={c.f} total={total} cor={c.cor} style={{ animationDelay: `${Math.min(i * 8, 400)}ms` }} />
          ))}
        </div>
      </AreaDica>
      <div className="mt-3">
        <Legenda fatias={fatias} cores={cores} colunas={2} />
      </div>
    </div>
  );
}
