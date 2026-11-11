'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconAdicionar, IconEmpresa, IconPessoas, IconProcesso, IconSeta } from '@/components/icons';
import { IndicadorGravacao } from '@/components/indicador-gravacao';
import { MenuUsuario } from '@/components/menu-usuario';
import { TrocarTema } from '@/components/tema';
import { Botao, estiloBotao } from '@/components/ui/botao';
import { rotuloDe, STATUS_LEVANTAMENTO, type StatusLevantamento } from '@/lib/dominio';
import { dataCurta, reaisCompacto } from '@/lib/formato';
import { useLevantamentos, useProcessosPorLevantamento } from '@/lib/local/consultas';
import { criarLevantamentoExemplo } from '@/lib/local/exemplo';
import { consolidar } from '@/lib/roi';
import { cn } from '@/lib/cn';
import { rotas } from '@/lib/rotas';

const corStatus: Record<StatusLevantamento, string> = {
  planejado: 'bg-gray4 text-gray',
  em_campo: 'bg-limao text-on-limao',
  em_revisao: 'bg-ambar-suave text-ambar',
  concluido: 'bg-verde-suave text-verde',
};

export default function PaginaLevantamentos() {
  const router = useRouter();
  const levantamentos = useLevantamentos();
  const processos = useProcessosPorLevantamento();
  const [criandoExemplo, setCriandoExemplo] = useState(false);

  const abrirExemplo = async () => {
    setCriandoExemplo(true);
    const lev = await criarLevantamentoExemplo();
    router.push(rotas.lev(lev.id));
  };

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16 sm:px-6">
      <header className="flex items-center gap-2 py-3">
        <span className="rounded-sm bg-limao px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-on-limao">SHEEP</span>
        <span className="font-bold">Levantamento</span>
        <div className="ml-auto flex items-center gap-1">
          <IndicadorGravacao />
          <TrocarTema />
          <MenuUsuario />
        </div>
      </header>

      <div className="surge mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Visitas</p>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Levantamentos</h1>
        </div>
        <Link href="/levantamentos/novo" className={cn(estiloBotao({ variante: 'primario' }), 'max-sm:hidden')}>
          <IconAdicionar size={18} /> Novo levantamento
        </Link>
      </div>

      {levantamentos === undefined ? (
        <div className="spinner-linha">
          <span className="spinner" />
        </div>
      ) : levantamentos.length === 0 ? (
        <div className="surge cartao p-6 text-center sm:p-10">
          <span className="mx-auto grid size-12 place-items-center rounded-pill bg-gray4">
            <IconEmpresa />
          </span>
          <h2 className="mt-4 text-lg font-bold">Nenhum levantamento ainda</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-gray">
            Crie o primeiro antes da visita, ou abra o exemplo de um escritório de contabilidade para ver como fica.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/levantamentos/novo" className={estiloBotao({ variante: 'primario' })}>
              <IconAdicionar size={18} /> Novo levantamento
            </Link>
            <Botao onClick={abrirExemplo} disabled={criandoExemplo}>
              {criandoExemplo && <span className="spinner sm" />}
              Abrir exemplo
            </Botao>
          </div>
        </div>
      ) : (
        <ul key={levantamentos.map(l => l.id).join()} className="lista-anima grid gap-3 sm:grid-cols-2">
          {levantamentos.map(l => {
            const procs = processos?.get(l.id) ?? [];
            const roi = consolidar(procs, l);
            return (
              <li key={l.id}>
                <Link href={rotas.lev(l.id)} className="foco cartao cartao-clicavel block rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-bold', corStatus[l.status])}>
                          {rotuloDe(STATUS_LEVANTAMENTO, l.status)}
                        </span>
                        <span className="text-xs text-gray">{dataCurta(l.data)}</span>
                      </div>
                      <h2 className="mt-2 truncate text-[17px] font-bold">{l.cliente_nome || 'Sem nome'}</h2>
                      <p className="truncate text-sm text-gray">
                        {[l.segmento, l.cidade].filter(Boolean).join(' - ') || 'Segmento não informado'}
                      </p>
                    </div>
                    <IconSeta className="mt-1 text-gray2" />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-gray3 pt-3">
                    <div className="flex gap-4 text-xs text-gray">
                      <span className="inline-flex items-center gap-1">
                        <IconProcesso size={14} /> {procs.length} processos
                      </span>
                      {l.participantes.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <IconPessoas size={14} /> {l.participantes.length}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="rotulo !text-[10px]">Ganho/ano</p>
                      <p className="numeros text-[15px] font-extrabold">{roi.ganho_ano > 0 ? reaisCompacto(roi.ganho_ano) : '-'}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* No celular o botão principal fica no alcance do polegar. */}
      <Link
        href="/levantamentos/novo"
        aria-label="Novo levantamento"
        className="foco pb-seguro fixed right-4 bottom-5 grid size-14 place-items-center rounded-pill bg-limao text-on-limao shadow-[var(--shadow-yellow)] transition-transform active:scale-95 sm:hidden"
      >
        <IconAdicionar size={24} strokeWidth={2.2} />
      </Link>
    </div>
  );
}
