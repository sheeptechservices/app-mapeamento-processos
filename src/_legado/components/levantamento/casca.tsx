'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  IconAdicionar,
  IconAreas,
  IconCheckCirculo,
  IconEditar,
  IconIA,
  IconPlacar,
  IconRoteiro,
  IconVoltar,
} from '@/components/icons';
import { IndicadorGravacao } from '@/components/indicador-gravacao';
import { TrocarTema } from '@/components/tema';
import { cn } from '@/lib/cn';
import { rotas, type Aba } from '@/lib/rotas';
import { useLev } from './contexto';
import { Cronometro } from './cronometro';
import { ListaLateral } from './lista-lateral';
import { NovoProcesso } from './novo-processo';
import { PlacarResumo } from './placar-resumo';

const ABAS = [
  { aba: 'roteiro', rotulo: 'Roteiro', Icone: IconRoteiro },
  { aba: '', rotulo: 'Áreas e processos', curto: 'Áreas', Icone: IconAreas },
  { aba: 'ia', rotulo: 'IA', Icone: IconIA },
  { aba: 'placar', rotulo: 'Placar', Icone: IconPlacar },
] as const;

export function CascaLevantamento({ children }: { children: ReactNode }) {
  const { levantamento } = useLev();
  const pathname = usePathname();
  const id = levantamento.id;
  const trecho = pathname.replace(/^\/visita\/?/, '');
  const noProcesso = trecho === 'processo';
  const abaAtiva: Aba | null = noProcesso ? '' : ABAS.some(a => a.aba === trecho) ? (trecho as Aba) : null;
  const [novo, setNovo] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:overflow-hidden">
      {/* Coluna esquerda (desktop): navegação e lista de processos */}
      <aside className="hidden border-r border-gray3 bg-superficie lg:flex lg:flex-col lg:overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-3">
          <Link
            href={rotas.lista}
            aria-label="Todos os levantamentos"
            className="foco grid size-[var(--toque)] place-items-center rounded-md transition-colors hover:bg-gray4"
          >
            <IconVoltar />
          </Link>
          <span className="rounded-sm bg-limao px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-on-limao">SHEEP</span>
          <div className="ml-auto">
            <TrocarTema />
          </div>
        </div>
        <nav className="px-3 pb-3">
          {ABAS.map(a => (
            <Link
              key={a.rotulo}
              href={rotas.lev(id, a.aba)}
              className={cn(
                'foco flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm font-semibold transition-colors',
                abaAtiva === a.aba ? 'bg-gray4 text-tinta' : 'text-gray hover:bg-gray4 hover:text-tinta',
              )}
            >
              <a.Icone size={18} /> {a.rotulo}
            </Link>
          ))}
          <Link
            href={rotas.lev(id, 'validar')}
            className={cn(
              'foco flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm font-semibold transition-colors',
              trecho === 'validar' ? 'bg-gray4 text-tinta' : 'text-gray hover:bg-gray4 hover:text-tinta',
            )}
          >
            <IconCheckCirculo size={18} /> Validar com o cliente
          </Link>
        </nav>
        <ListaLateral aoNovo={() => setNovo(true)} />
      </aside>

      {/* Centro */}
      <div className="flex min-h-dvh flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-gray3 bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-1 px-2 py-1.5 sm:px-4">
            <Link
              href={noProcesso ? rotas.lev(id) : rotas.lista}
              aria-label="Voltar"
              className="foco grid size-[var(--toque)] shrink-0 place-items-center rounded-md transition-colors hover:bg-gray4 lg:hidden"
            >
              <IconVoltar />
            </Link>
            <Link href={rotas.lev(id, 'dados')} className="foco group min-w-0 flex-1 rounded-md px-2 py-1 transition-colors hover:bg-gray4">
              <p className="rotulo !text-[10px] leading-none">{levantamento.segmento ?? 'Levantamento'}</p>
              <p className="flex items-center gap-1.5 truncate font-bold leading-tight">
                <span className="truncate">{levantamento.cliente_nome}</span>
                <IconEditar size={14} className="shrink-0 text-gray2 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </Link>
            <Cronometro levantamento={levantamento} />
            <IndicadorGravacao />
            <div className="lg:hidden">
              <TrocarTema />
            </div>
          </div>
        </header>

        <main className={cn('mx-auto w-full max-w-3xl flex-1 px-4 pt-4 sm:px-6', noProcesso ? 'pb-28' : 'pb-36 lg:pb-12')}>
          {children}
        </main>
      </div>

      {/* Coluna direita (desktop): placar sempre à vista */}
      <aside className="hidden border-l border-gray3 bg-superficie lg:block lg:overflow-y-auto">
        <PlacarResumo />
      </aside>

      {/* Celular: botão de captura e navegação inferior */}
      {!noProcesso && (
        <>
          <button
            type="button"
            onClick={() => setNovo(true)}
            aria-label="Captura rápida: novo processo"
            className="foco fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-pill bg-limao text-on-limao shadow-[var(--shadow-yellow)] transition-transform hover:scale-105 active:scale-95 lg:hidden"
          >
            <IconAdicionar size={26} strokeWidth={2.2} />
          </button>
          <nav
            aria-label="Seções do levantamento"
            className="pb-seguro fixed inset-x-0 bottom-0 z-40 border-t border-gray3 bg-superficie/95 backdrop-blur lg:hidden"
          >
            <div className="mx-auto grid max-w-md grid-cols-4">
              {ABAS.map(a => {
                const ativa = abaAtiva === a.aba;
                return (
                  <Link
                    key={a.rotulo}
                    href={rotas.lev(id, a.aba)}
                    aria-current={ativa ? 'page' : undefined}
                    className={cn(
                      'foco relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                      ativa ? 'text-tinta' : 'text-gray',
                    )}
                  >
                    {ativa && (
                      <motion.span
                        layoutId="aba-ativa"
                        className="absolute top-0 h-[3px] w-10 rounded-b-pill bg-tinta"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    <a.Icone size={22} strokeWidth={ativa ? 2.1 : 1.8} />
                    {'curto' in a ? a.curto : a.rotulo}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}

      <NovoProcesso aberto={novo} aoFechar={() => setNovo(false)} />
    </div>
  );
}
