'use client';

import { DropdownMenu } from 'radix-ui';
import { IconAjustes, IconSair } from '@/components/icons';
import { BotaoAtualizarVersao } from '@/components/aviso-versao';
import { IndicadorGravacao } from '@/components/indicador-gravacao';
import { useSessao } from '@/components/sessao';
import { Avatar } from '@/components/ui/avatar';
import { BotaoIcone, GrupoIcones } from '@/components/ui/botao';
import { LogoSheep } from '@/components/ui/logo';

const ROTULO_PAPEL = { admin: 'Administrador', consultor: 'Consultor', leitura: 'Leitura' } as const;

/** Avatar de quem entrou, com nome, papel, Ajustes e Sair. */
function MenuConta({ aoAbrirAjustes }: { aoAbrirAjustes: () => void }) {
  const { usuario, sair } = useSessao();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Conta" className="foco rounded-pilula transition-transform hover:scale-105">
        <Avatar nome={usuario?.nome} imagem={usuario?.foto} tamanho={40} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="entra z-[60] min-w-64 rounded-2xl border border-borda bg-superficie p-1.5 shadow-painel"
        >
          <div className="px-3 py-2">
            <p className="text-[13px] font-semibold">{usuario?.nome ?? 'Consultor'}</p>
            <p className="text-xs text-tinta-2">
              {usuario?.email}
              {usuario ? ` - ${ROTULO_PAPEL[usuario.papel]}` : ''}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-borda" />
          <DropdownMenu.Item
            onSelect={aoAbrirAjustes}
            className="flex min-h-[var(--toque)] cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-sutil"
          >
            <IconAjustes size={18} /> Ajustes
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={sair}
            className="flex min-h-[var(--toque)] cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-sutil"
          >
            <IconSair size={18} /> Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Topo da página única: logo da Sheep à esquerda; sincronização e Ajustes no
 * grupo de ícones em pílula, e o avatar da conta, à direita.
 */
export function Topo({ aoAbrirAjustes }: { aoAbrirAjustes: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-4 tablet:pt-6">
      <span className="tablet:hidden">
        <LogoSheep variante="carneiro" altura={28} />
      </span>
      <span className="hidden tablet:inline">
        <LogoSheep altura={36} />
      </span>
      <div className="ml-auto flex items-center gap-2">
        <BotaoAtualizarVersao />
        <GrupoIcones>
          <IndicadorGravacao compacto />
          <BotaoIcone rotulo="Ajustes" onClick={aoAbrirAjustes}>
            <IconAjustes size={19} />
          </BotaoIcone>
        </GrupoIcones>
        <MenuConta aoAbrirAjustes={aoAbrirAjustes} />
      </div>
    </div>
  );
}
