'use client';

import { useState, type ReactNode } from 'react';
import { IconAdicionar, IconBusca, IconExcluir } from '@/components/icons';
import { estiloBotao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/confirmar';
import { Grupo, LinhaTexto, LinhaTextoLongo } from '@/components/ui/linhas';
import { Painel, RodapePainel, usePainelOpcional } from '@/components/ui/painel';
import type { TermoGlossario } from '@/lib/dominio';
import { useGlossario } from '@/lib/local/consultas';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar, criarTermo, excluir } from '@/lib/local/repo';
import { semAcento } from '@/lib/filtros';
import { cn } from '@/lib/cn';

/*
 * Glossário do cliente: o vocabulário da empresa (siglas, nomes de sistema,
 * jeitos de chamar as coisas) e o que cada termo quer dizer. É do cliente, não
 * da sessão: vale em todas as sessões de mapeamento e no relatório.
 *
 * `useGlossarioCliente` devolve o grupo e as sub-telas (novo termo, editar
 * termo) para o painel que o mostra: o cadastro do cliente e o PainelGlossario,
 * aberto pelo quadro da sessão.
 */

type SubTela = { titulo: string; conteudo: ReactNode };

/** A partir de quantos termos aparece a busca. */
const BUSCA_A_PARTIR = 8;

export function useGlossarioCliente(
  clienteId: string | null,
  podeEditar: boolean,
): { grupo: ReactNode; subtelas: Record<string, SubTela>; total: number } {
  const termos = useGlossario(clienteId) ?? [];
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const termo = termos.find(t => t.id === selecionado) ?? null;

  const grupo = clienteId ? (
    <ListaTermos termos={termos} podeEditar={podeEditar} aoAbrir={setSelecionado} />
  ) : (
    <Grupo titulo="Glossário">
      <p className="px-4 py-3.5 text-[13px] leading-relaxed text-tinta-2">Salve o cliente para montar o glossário.</p>
    </Grupo>
  );

  const subtelas: Record<string, SubTela> = {
    termo: {
      titulo: 'Termo',
      conteudo: termo ? (
        <EditarTermo termo={termo} podeEditar={podeEditar} />
      ) : (
        <p className="px-1 pt-4 text-sm text-tinta-2">Termo excluído.</p>
      ),
    },
    'termo-novo': {
      titulo: 'Novo termo',
      conteudo: clienteId ? <NovoTermo clienteId={clienteId} existentes={termos} /> : null,
    },
  };
  return { grupo, subtelas, total: termos.length };
}

function ListaTermos({ termos, podeEditar, aoAbrir }: { termos: TermoGlossario[]; podeEditar: boolean; aoAbrir: (id: string) => void }) {
  const painel = usePainelOpcional();
  const [busca, setBusca] = useState('');
  const t = semAcento(busca.trim());
  const visiveis = t ? termos.filter(x => semAcento(`${x.termo} ${x.definicao ?? ''}`).includes(t)) : termos;

  return (
    <section className="mt-4 first:mt-2">
      <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-tinta-2">
        Glossário {termos.length > 0 && <span className="numeros text-tinta-3">({termos.length})</span>}
      </h3>
      {termos.length >= BUSCA_A_PARTIR && (
        <label className="relative mb-2 block">
          <IconBusca size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-tinta-3" />
          <input
            className="campo !rounded-pilula !pl-10"
            placeholder="Buscar termo"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            aria-label="Buscar no glossário"
          />
        </label>
      )}
      <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-superficie">
        {termos.length === 0 && (
          <p className="px-4 py-3.5 text-[13px] text-tinta-3">Nenhum termo ainda. Anote as siglas e os nomes que o cliente usa.</p>
        )}
        {termos.length > 0 && visiveis.length === 0 && <p className="px-4 py-3.5 text-[13px] text-tinta-3">Nenhum termo com essa busca.</p>}
        <div key={t} className="cascata divide-y divide-borda">
          {visiveis.map(x => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                aoAbrir(x.id);
                painel?.abrir('termo');
              }}
              className="foco block w-full px-4 py-3 text-left transition-colors hover:bg-sutil"
            >
              <span className="block truncate text-[15px] font-semibold">{x.termo || 'Sem nome'}</span>
              <span className={cn('mt-0.5 line-clamp-2 block text-[13px] leading-snug', x.definicao ? 'text-tinta-2' : 'text-tinta-3')}>
                {x.definicao || 'Sem definição'}
              </span>
            </button>
          ))}
        </div>
        {podeEditar && (
          <div className="p-3">
            <button type="button" onClick={() => painel?.abrir('termo-novo')} className={cn(estiloBotao({ tamanho: 'sm' }), 'w-full')}>
              <IconAdicionar size={16} /> Novo termo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Sub-tela de um termo: nome e definição (salvam sozinhos) e excluir. */
function EditarTermo({ termo, podeEditar }: { termo: TermoGlossario; podeEditar: boolean }) {
  const painel = usePainelOpcional();
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div className="entra">
      <fieldset disabled={!podeEditar} className="contents">
        <Grupo>
          <LinhaTexto
            rotulo="Termo"
            valor={termo.termo}
            aoMudar={v => atualizar('glossario', termo.id, { termo: v })}
            placeholder="Obrigatório"
          />
          <LinhaTextoLongo
            rotulo="Definição"
            valor={termo.definicao}
            aoMudar={v => atualizar('glossario', termo.id, { definicao: v || null })}
            placeholder="O que o termo quer dizer para o cliente"
            linhas={4}
          />
        </Grupo>
      </fieldset>
      {podeEditar && (
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          className="foco mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pilula bg-risco px-4 text-[14px] font-semibold text-white transition-[filter,translate,scale] hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
        >
          <IconExcluir size={16} /> Excluir termo
        </button>
      )}
      <Confirmar
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Excluir "${termo.termo || 'termo'}"?`}
        texto="Sai do glossário do cliente em todos os aparelhos."
        rotuloConfirmar="Excluir termo"
        aoConfirmar={async () => {
          painel?.voltar();
          await comIndicador(() => excluir('glossario', termo.id));
        }}
      />
    </div>
  );
}

/** Sub-tela de termo novo: nome e definição, e o botão Adicionar. */
function NovoTermo({ clienteId, existentes }: { clienteId: string; existentes: TermoGlossario[] }) {
  const painel = usePainelOpcional();
  const [termo, setTermo] = useState('');
  const [definicao, setDefinicao] = useState('');
  const repetido = !!termo.trim() && existentes.some(x => semAcento(x.termo.trim()) === semAcento(termo.trim()));
  const adicionar = async () => {
    if (!termo.trim() || repetido) return;
    await comIndicador(() => criarTermo(clienteId, termo, definicao));
    setTermo('');
    setDefinicao('');
    painel?.voltar();
  };
  return (
    <form
      className="entra"
      onSubmit={e => {
        e.preventDefault();
        void adicionar();
      }}
    >
      <Grupo>
        <LinhaTexto rotulo="Termo" valor={termo} aoMudar={setTermo} placeholder="Ex.: canhoto, romaneio, NF de saída" autoFocus />
        <LinhaTextoLongo
          rotulo="Definição"
          valor={definicao}
          aoMudar={setDefinicao}
          placeholder="O que o termo quer dizer para o cliente"
          linhas={4}
        />
      </Grupo>
      {repetido && (
        <p role="alert" className="entra mt-2 px-1 text-[13px] font-medium text-risco">
          Esse termo já está no glossário.
        </p>
      )}
      <button
        type="submit"
        disabled={!termo.trim() || repetido}
        className={cn(estiloBotao({ variante: 'primario' }), 'mt-4 w-full disabled:opacity-40')}
      >
        <IconAdicionar size={17} /> Adicionar termo
      </button>
    </form>
  );
}

/** Glossário num painel próprio (aberto pelo quadro da sessão). */
export function PainelGlossario({
  aberto,
  aoFechar,
  clienteId,
  nomeCliente,
  podeEditar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  clienteId: string;
  nomeCliente?: string;
  podeEditar: boolean;
}) {
  const { grupo, subtelas } = useGlossarioCliente(clienteId, podeEditar);
  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Glossário"
      descricao={nomeCliente ? `Glossário de ${nomeCliente}` : undefined}
      subtelas={subtelas}
      rodape={<RodapePainel primario={{ rotulo: 'Pronto', acao: aoFechar }} />}
    >
      {nomeCliente && <p className="px-1 pt-1 text-[13px] text-tinta-2">Termos de {nomeCliente}, válidos em todas as sessões.</p>}
      {grupo}
    </Painel>
  );
}
