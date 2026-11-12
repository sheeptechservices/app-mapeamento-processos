'use client';

import { AnimatePresence } from 'motion/react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { IconAgrupar, IconCheck, IconSetaBaixo } from '@/components/icons';
import { LinhaProcesso, type AcoesProcesso } from '@/components/processos/lista-processos';
import { AGRUPAMENTOS, type Agrupamento, type GrupoProcessos } from '@/lib/agrupar';
import type { Carteira } from '@/lib/local/carteira';
import { numero, reais } from '@/lib/formato';
import { consolidar } from '@/lib/roi';
import { cn } from '@/lib/cn';

/**
 * Botão "Agrupar" ao lado de Filtros: menu com Sem agrupar, Setor, Prioridade
 * e Frequência. Agrupado, mostra o critério no lugar da palavra; em espaço
 * curto vira só o ícone (o critério segue no `title`).
 */
export function BotaoAgrupar({ valor, aoMudar }: { valor: Agrupamento; aoMudar: (v: Agrupamento) => void }) {
  const ativo = valor !== 'nenhum';
  const rotulo = ativo ? `Por ${AGRUPAMENTOS.find(a => a.valor === valor)?.rotulo.toLowerCase()}` : 'Agrupar';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        title={ativo ? `Agrupado ${rotulo.toLowerCase()}` : 'Agrupar processos'}
        className={cn(
          'foco aperta inline-flex min-h-[var(--toque)] shrink-0 items-center gap-2 rounded-pilula border px-4 text-[14px] font-semibold transition-colors data-[state=open]:bg-sutil',
          ativo ? 'border-tinta bg-superficie' : 'border-borda bg-superficie hover:bg-sutil',
        )}
      >
        <IconAgrupar size={18} />
        <span key={valor} className="troca @max-lg:sr-only">
          {rotulo}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="pop-surge z-[60] min-w-52 rounded-2xl border border-borda bg-superficie p-1.5 shadow-painel"
        >
          <DropdownMenu.Label className="px-3 pt-1.5 pb-1 text-[12px] font-medium text-tinta-2">Agrupar por</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={valor} onValueChange={v => aoMudar(v as Agrupamento)}>
            {AGRUPAMENTOS.map(a => (
              <DropdownMenu.RadioItem
                key={a.valor}
                value={a.valor}
                className="flex min-h-[var(--toque)] cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-sutil"
              >
                {a.rotulo}
                <DropdownMenu.ItemIndicator className="ml-auto text-tinta">
                  <IconCheck size={16} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Lista de processos dividida em grupos. Cada grupo tem um cabeçalho com nome,
 * quantidade e ganho por mês somado; tocar no cabeçalho recolhe ou abre o grupo.
 */
export function GruposProcessos({
  grupos,
  carteira,
  podeEditar,
  acoes,
}: {
  grupos: GrupoProcessos[];
  carteira: Carteira;
  podeEditar: boolean;
  acoes: AcoesProcesso;
}) {
  const [fechados, setFechados] = useState<Set<string>>(() => new Set());
  const alternar = (chave: string) =>
    setFechados(atual => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  return (
    <div className="cascata">
      {grupos.map(g => {
        const aberto = !fechados.has(g.chave);
        const ganho = consolidar(g.processos, carteira.ctxDe).ganho_mes;
        const n = g.processos.length;
        return (
          <section key={g.chave} className="border-t border-borda first:border-t-0">
            <h3>
              <button
                type="button"
                aria-expanded={aberto}
                onClick={() => alternar(g.chave)}
                className="foco flex min-h-[var(--toque)] w-full items-center gap-2.5 bg-sutil/50 px-4 py-2 text-left transition-colors hover:bg-sutil"
              >
                <IconSetaBaixo
                  size={16}
                  className={cn('shrink-0 text-tinta-2 transition-transform duration-200 ease-v6', !aberto && '-rotate-90')}
                />
                <span className="min-w-0 truncate text-[14px] font-semibold">{g.rotulo}</span>
                <span className="numeros shrink-0 text-[13px] text-tinta-3">{numero(n)}</span>
                <span className="numeros ml-auto shrink-0 text-[13px] text-tinta-2">
                  {ganho > 0 ? (
                    <>
                      {reais(ganho)}
                      <span className="text-tinta-3"> por mês</span>
                    </>
                  ) : (
                    '-'
                  )}
                </span>
              </button>
            </h3>
            <div className={cn('revelar', aberto && 'aberto')}>
              <div inert={!aberto}>
                <ul className="border-t border-borda">
                  <AnimatePresence initial={false}>
                    {g.processos.map(p => (
                      <LinhaProcesso key={p.id} p={p} carteira={carteira} podeEditar={podeEditar} acoes={acoes} />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
