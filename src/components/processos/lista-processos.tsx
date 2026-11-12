'use client';

import { DropdownMenu, Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { IconExcluir, IconMais } from '@/components/icons';
import { SeloRisco, SeloStatus } from '@/components/selos';
import { NumeroAnimado } from '@/components/ui/numero-animado';
import { ItemVivo, Pulso } from '@/components/ui/vivo';
import type { Processo } from '@/lib/dominio';
import { CAMPOS_COMPLETUDE, completude } from '@/lib/completude';
import type { Carteira } from '@/lib/local/carteira';
import { cn } from '@/lib/cn';

// Peças da lista de processos, usadas no mapa (resultado de busca) e na página
// da sessão.

export interface AcoesProcesso {
  abrirProcesso: (p: Processo) => void;
  excluirProcesso: (p: Processo) => void;
}

/** Botão de ícone das pastas: sempre visível no celular, no hover do desktop. */
export function Acao({
  rotulo,
  onClick,
  children,
  perigo,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'foco aperta relative z-10 grid size-9 place-items-center rounded-pilula text-tinta-2',
        perigo ? 'hover:bg-risco hover:text-white' : 'hover:bg-sutil hover:text-tinta',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Mesmas ações num menu "...": usado quando a pasta fica estreita, para o nome
 * do cliente não ser cortado por três ícones.
 */
export function MenuAcoes({
  rotulo,
  itens,
  className,
}: {
  rotulo: string;
  itens: { rotulo: string; icone: ReactNode; aoEscolher: () => void; perigo?: boolean }[];
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={rotulo}
        title={rotulo}
        className={cn(
          'foco aperta relative z-10 size-9 shrink-0 place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta data-[state=open]:bg-sutil data-[state=open]:text-tinta',
          className,
        )}
      >
        <IconMais size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="pop-surge z-[60] min-w-48 rounded-2xl border border-borda bg-superficie p-1.5 shadow-painel"
        >
          {itens.map(i => (
            <DropdownMenu.Item
              key={i.rotulo}
              onSelect={i.aoEscolher}
              className={cn(
                'flex min-h-[var(--toque)] cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-medium outline-none',
                i.perigo ? 'text-risco data-[highlighted]:bg-risco data-[highlighted]:text-white' : 'data-[highlighted]:bg-sutil',
              )}
            >
              {i.icone} {i.rotulo}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const revelaAcoes =
  'flex shrink-0 items-center gap-0.5 transition-opacity desktop:opacity-0 desktop:group-hover/linha:opacity-100 desktop:group-focus-within/linha:opacity-100';

export function LinhaProcesso({
  p,
  carteira,
  podeEditar,
  acoes,
}: {
  p: Processo;
  carteira: Carteira;
  podeEditar: boolean;
  acoes: AcoesProcesso;
}) {
  // Quanto do cadastro já foi levantado (ver lib/completude.ts).
  const c = completude(p);
  const cheio = c.fracao >= 1;
  // Nome e, embaixo, o começo da descrição. Em espaço curto (celular) o código some.
  const descricao = p.descricao?.replace(/\s+/g, ' ').trim();
  return (
    <ItemVivo className="border-t border-borda first:border-t-0">
      <div className="group/linha relative isolate flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:origin-center before:scale-y-0 before:rounded-r-full before:bg-verde before:transition-transform before:duration-200 before:ease-v6 hover:bg-sutil/70 hover:before:scale-y-100 focus-within:before:scale-y-100">
        <Pulso quando={p.atualizado_em} />
        <span className="numeros w-[62px] shrink-0 text-[12px] !font-medium text-tinta-3 @max-xl:hidden">{p.codigo}</span>
        <div className="min-w-0 flex-1">
          {/* Título cobre a linha (link esticado): clique e teclado abrem o processo. */}
          <button
            type="button"
            onClick={() => acoes.abrirProcesso(p)}
            className="foco block max-w-full truncate text-left text-[15px] font-medium after:absolute after:inset-0 after:content-['']"
          >
            {p.titulo || 'Sem título'}
          </button>
          {/* Embaixo do nome, sempre a Descrição (cortada; inteira ao passar o mouse). */}
          <p title={descricao || undefined} className={cn('mt-0.5 truncate text-[12px]', descricao ? 'text-tinta-2' : 'text-tinta-3')}>
            {descricao || 'Sem descrição'}
          </p>
        </div>
        <span className="hidden w-[112px] shrink-0 tablet:block @max-xl:!hidden">
          {p.em_risco ? <SeloRisco /> : <SeloStatus status={p.status} cfg={carteira.config} />}
        </span>
        <DicaCompletude faltando={c.faltando} total={CAMPOS_COMPLETUDE.length}>
          <button
            type="button"
            onClick={() => acoes.abrirProcesso(p)}
            aria-label={cheio ? 'Cadastro completo' : `Cadastro ${Math.round(c.fracao * 100)}% preenchido. Falta: ${c.faltando.join(', ')}`}
            className="foco relative z-10 w-[86px] shrink-0 cursor-default rounded-lg py-1 text-right"
          >
            <span className={cn('numeros block text-[14px]', cheio && 'text-verde-tinta')}>
              <NumeroAnimado valor={c.fracao} formatar={v => `${Math.round(v * 100)}%`} />
            </span>
            <span className={cn('barra mt-1.5 ml-auto block w-[64px]', cheio && 'verde')}>
              <span style={{ width: `${Math.max(c.fracao * 100, 4)}%` }} />
            </span>
          </button>
        </DicaCompletude>
        {podeEditar && (
          // Sem lápis: tocar na linha já abre o processo para editar.
          <span className={cn(revelaAcoes, 'w-[38px] justify-end @max-md:!hidden')}>
            <Acao rotulo={`Excluir ${p.codigo}`} onClick={() => acoes.excluirProcesso(p)} perigo>
              <IconExcluir size={16} />
            </Acao>
          </span>
        )}
      </div>
    </ItemVivo>
  );
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Dica da coluna Completude: o que falta preencher no cadastro, em lista. Balão
 * escuro da casa (mesmo visual da dica dos gráficos), por portal para não ser
 * cortado pela tabela.
 */
function DicaCompletude({ faltando, total, children }: { faltando: string[]; total: number; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={120} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="pop-surge z-[60] max-w-[300px] rounded-xl bg-tinta px-3.5 py-3 text-[12px] leading-snug text-sobre-tinta shadow-card-hover"
          >
            {faltando.length === 0 ? (
              <p className="font-semibold">Cadastro completo</p>
            ) : (
              <>
                <p className="font-semibold">
                  Falta{faltando.length === 1 ? '' : 'm'} {faltando.length} de {total} campos
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {faltando.map(f => (
                    <li key={f} className="flex items-start gap-1.5 opacity-85">
                      <span aria-hidden="true" className="mt-[6px] size-1 shrink-0 rounded-pilula bg-current" />
                      {maiuscula(f)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Tooltip.Arrow width={10} height={5} className="fill-tinta" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** Cabeçalho da tabela (tablet e desktop); no celular as linhas viram lista. */
export function CabecalhoTabela({ podeEditar }: { podeEditar: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center gap-3 border-b border-borda bg-sutil/60 px-4 py-2 text-[11px] font-semibold tracking-wide text-tinta-3 uppercase tablet:flex @max-md:!hidden"
    >
      <span className="w-[62px] shrink-0 @max-xl:hidden">ID</span>
      <span className="flex-1">Processo</span>
      <span className="w-[112px] shrink-0 @max-xl:hidden">Status</span>
      <span className="w-[86px] shrink-0 text-right">Completude</span>
      {podeEditar && <span className="w-[38px] shrink-0" />}
    </div>
  );
}
