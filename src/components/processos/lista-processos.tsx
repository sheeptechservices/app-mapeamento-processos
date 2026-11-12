'use client';

import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { IconExcluir, IconMais } from '@/components/icons';
import { SeloRisco, SeloStatus } from '@/components/selos';
import { NumeroAnimado } from '@/components/ui/numero-animado';
import { ItemVivo, Pulso } from '@/components/ui/vivo';
import type { Processo } from '@/lib/dominio';
import { horas, reais } from '@/lib/formato';
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
  const r = carteira.roiDe(p);
  const setor = p.area_id ? carteira.areaPorId.get(p.area_id)?.nome : null;
  // Espaço curto (celular): só o nome e, embaixo, o começo da descrição (sem o código).
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
          <p className="mt-0.5 truncate text-[12px] text-tinta-2 @max-xl:hidden">
            {setor ? `# ${setor}` : 'Sem setor'}
            {r.horas_mes != null ? ` - ${horas(r.horas_mes)}/mês` : ''}
            {!r.completo ? ` - falta ${r.faltando.length === 1 ? '1 número' : `${r.faltando.length} números`}` : ''}
          </p>
          <p className={cn('mt-0.5 truncate text-[12px] @xl:hidden', descricao ? 'text-tinta-2' : 'text-tinta-3')}>{descricao || 'Sem descrição'}</p>
        </div>
        <span className="hidden w-[112px] shrink-0 tablet:block @max-xl:!hidden">
          {p.em_risco ? <SeloRisco /> : <SeloStatus status={p.status} cfg={carteira.config} />}
        </span>
        <span className="w-[86px] shrink-0 text-right">
          <span className="numeros block text-[14px]">
            {r.ganho_mes != null && r.ganho_mes > 0 ? <NumeroAnimado valor={r.ganho_mes} formatar={reais} /> : '-'}
          </span>
          <span className="block text-[11px] text-tinta-3">por mês</span>
        </span>
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
      <span className="w-[86px] shrink-0 text-right">Ganho/mês</span>
      {podeEditar && <span className="w-[38px] shrink-0" />}
    </div>
  );
}
