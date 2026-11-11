'use client';

import { useState, type ReactNode } from 'react';
import { PainelAjustes } from '@/components/ajustes/painel-ajustes';
import { SeguirTemaDoSistema } from '@/components/tema';
import { Topo } from './topo';

/**
 * Casca da página única: só o topo (logo, busca, sincronização, Ajustes e
 * conta), sem menu lateral nem barra inferior. Nenhuma rolagem horizontal.
 */
export function Casca({ children }: { children: ReactNode }) {
  const [ajustes, setAjustes] = useState(false);
  return (
    <>
      <SeguirTemaDoSistema />
      <div className="min-h-dvh overflow-x-hidden">
        <div className="mx-auto w-full max-w-[var(--largura-app)] px-4 pb-16 tablet:px-6 desktop:px-10">
          <Topo aoAbrirAjustes={() => setAjustes(true)} />
          <main>{children}</main>
        </div>
      </div>
      <PainelAjustes aberto={ajustes} aoFechar={() => setAjustes(false)} />
    </>
  );
}

/**
 * Cabeçalho de página como na referência: linha pequena em cima, título grande
 * em peso 400 e, se houver, a contagem em sobrescrito ("Mapa de processos (8)").
 */
export function CabecalhoPagina({
  titulo,
  sobre,
  contagem,
  apoio,
  acao,
}: {
  titulo: ReactNode;
  sobre?: ReactNode;
  contagem?: number;
  apoio?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <header className="entra @container flex items-center justify-between gap-3 pt-5 pb-5 tablet:pt-8 tablet:pb-6">
      {/* Contêiner: a ação do cabeçalho vira só ícone quando o espaço aperta (classes @max-* nela). */}
      <div className="min-w-0">
        {sobre && <p className="mb-1.5 text-[13px] text-tinta-2">{sobre}</p>}
        <h1 className="titulo-pagina">
          {titulo}
          {contagem !== undefined && <sup className="numeros ml-1.5 align-super text-[15px] font-medium tracking-normal">({contagem})</sup>}
        </h1>
        {apoio && <p className="mt-2 text-[15px] text-tinta-2">{apoio}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}
