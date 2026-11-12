'use client';

import { useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react';
import { IconAdicionar, IconCamera, IconExcluir, IconExterno, IconImagem, IconLink } from '@/components/icons';
import { estiloBotao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/confirmar';
import { Grupo, LinhaTexto, LinhaTextoLongo } from '@/components/ui/linhas';
import { usePainelOpcional } from '@/components/ui/painel';
import type { Anexo } from '@/lib/dominio';
import { dominioDe, ErroFoto, normalizarLink, reduzirFoto } from '@/lib/foto';
import { useAnexos } from '@/lib/local/consultas';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar, criarAnexo, excluir } from '@/lib/local/repo';
import { cn } from '@/lib/cn';

/*
 * Anexos do processo: fotos (galeria ou câmera) e links, cada um com uma
 * descrição breve, para ilustrar como o processo é feito. Ficam ligados ao
 * processo, offline primeiro e sincronizados como o resto.
 *
 * `useAnexosProcesso` devolve o grupo do formulário e as sub-telas (editar um
 * anexo, novo link), que o PainelProcesso junta às dele.
 */

type SubTela = { titulo: string; conteudo: ReactNode };

// Câmera só onde ela existe de verdade (tela de toque); no computador fica a galeria.
const TOQUE = '(pointer: coarse)';
function assinarToque(aviso: () => void) {
  const m = matchMedia(TOQUE);
  m.addEventListener('change', aviso);
  return () => m.removeEventListener('change', aviso);
}
const eToque = () => matchMedia(TOQUE).matches;

export function useAnexosProcesso(processoId: string | null, podeEditar: boolean): { grupo: ReactNode; subtelas: Record<string, SubTela> } {
  const anexos = useAnexos(processoId) ?? [];
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const anexo = anexos.find(a => a.id === selecionado) ?? null;

  const grupo = processoId ? (
    <AreaAnexos processoId={processoId} anexos={anexos} podeEditar={podeEditar} aoAbrir={setSelecionado} />
  ) : (
    <Grupo titulo="Anexos">
      <p className="px-4 py-3.5 text-[13px] leading-relaxed text-tinta-2">Salve o processo para anexar fotos e links.</p>
    </Grupo>
  );

  const subtelas: Record<string, SubTela> = {
    anexo: {
      titulo: anexo?.tipo === 'link' ? 'Link' : 'Foto',
      conteudo: anexo ? (
        <EditarAnexo anexo={anexo} podeEditar={podeEditar} />
      ) : (
        <p className="px-1 pt-4 text-sm text-tinta-2">Anexo excluído.</p>
      ),
    },
    'anexo-link': {
      titulo: 'Novo link',
      conteudo: processoId ? <NovoLink processoId={processoId} /> : null,
    },
  };
  return { grupo, subtelas };
}

function AreaAnexos({
  processoId,
  anexos,
  podeEditar,
  aoAbrir,
}: {
  processoId: string;
  anexos: Anexo[];
  podeEditar: boolean;
  aoAbrir: (id: string) => void;
}) {
  const painel = usePainelOpcional();
  const toque = useSyncExternalStore(assinarToque, eToque, () => false);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const fotos = anexos.filter(a => a.tipo === 'foto');
  const links = anexos.filter(a => a.tipo === 'link');

  const abrir = (id: string) => {
    aoAbrir(id);
    painel?.abrir('anexo');
  };

  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivos = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!arquivos.length) return;
    setErro(null);
    setEnviando(n => n + arquivos.length);
    let ultimo: string | null = null;
    for (const arquivo of arquivos) {
      try {
        const imagem = await reduzirFoto(arquivo);
        const novo = await comIndicador(() => criarAnexo(processoId, { tipo: 'foto', imagem }));
        ultimo = novo.id;
      } catch (err) {
        setErro(err instanceof ErroFoto ? err.message : 'Não foi possível anexar a foto.');
      } finally {
        setEnviando(n => n - 1);
      }
    }
    // Uma foto só: já abre para escrever a descrição.
    if (arquivos.length === 1 && ultimo) abrir(ultimo);
  };

  return (
    <Grupo
      titulo="Anexos"
      rodape={podeEditar ? 'Fotos e links que mostram como o processo é feito. Toque para pôr uma descrição.' : undefined}
    >
      {fotos.length > 0 && (
        <ul className="cascata grid grid-cols-3 gap-2 p-3">
          {fotos.map(f => (
            <li key={f.id} className="min-w-0">
              <button
                type="button"
                onClick={() => abrir(f.id)}
                title={f.descricao || 'Foto sem descrição'}
                className="foco aperta group/foto block w-full text-left"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-sutil">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimizador */}
                  <img
                    src={f.imagem ?? ''}
                    alt={f.descricao || 'Foto do processo'}
                    className="size-full object-cover transition-transform duration-300 ease-v6 group-hover/foto:scale-[1.04]"
                  />
                </span>
                <span className={cn('mt-1 block truncate text-[12px]', f.descricao ? 'text-tinta-2' : 'text-tinta-3')}>
                  {f.descricao || 'Sem descrição'}
                </span>
              </button>
            </li>
          ))}
          {Array.from({ length: enviando }, (_, i) => (
            <li key={`enviando-${i}`} className="grid aspect-square place-items-center rounded-xl bg-sutil">
              <span className="spinner" />
            </li>
          ))}
        </ul>
      )}
      {fotos.length === 0 && enviando > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 text-[13px] text-tinta-2">
          <span className="spinner sm" /> Preparando a foto
        </div>
      )}

      {links.map(l => (
        <div key={l.id} className="relative flex min-h-[52px] items-center gap-3 px-4 py-2 transition-colors hover:bg-sutil">
          <IconLink size={17} className="shrink-0 text-tinta-2" />
          <span className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => abrir(l.id)}
              className="foco block max-w-full truncate text-left text-[15px] font-medium after:absolute after:inset-0 after:content-['']"
            >
              {l.descricao || dominioDe(l.url) || 'Link'}
            </button>
            <span className="block truncate text-[12px] text-tinta-3">{dominioDe(l.url)}</span>
          </span>
          {l.url && (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir o link"
              aria-label={`Abrir ${dominioDe(l.url)}`}
              className="foco aperta relative z-10 grid size-9 shrink-0 place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-borda hover:text-tinta"
            >
              <IconExterno size={16} />
            </a>
          )}
        </div>
      ))}

      {anexos.length === 0 && enviando === 0 && <p className="px-4 py-3.5 text-[13px] text-tinta-3">Nenhum anexo ainda.</p>}

      {erro && (
        <p role="alert" className="entra px-4 py-2.5 text-[13px] font-medium text-risco">
          {erro}
        </p>
      )}

      {podeEditar && (
        <div className="flex flex-wrap gap-2 p-3">
          <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={escolher} />
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
          <button type="button" onClick={() => galeria.current?.click()} className={cn(estiloBotao({ tamanho: 'sm' }), 'flex-1')}>
            <IconImagem size={16} /> Foto
          </button>
          {toque && (
            <button type="button" onClick={() => camera.current?.click()} className={cn(estiloBotao({ tamanho: 'sm' }), 'flex-1')}>
              <IconCamera size={16} /> Câmera
            </button>
          )}
          <button type="button" onClick={() => painel?.abrir('anexo-link')} className={cn(estiloBotao({ tamanho: 'sm' }), 'flex-1')}>
            <IconLink size={16} /> Link
          </button>
        </div>
      )}
    </Grupo>
  );
}

/** Sub-tela de um anexo: foto grande (ou o link), descrição e excluir. Edição salva sozinha. */
function EditarAnexo({ anexo, podeEditar }: { anexo: Anexo; podeEditar: boolean }) {
  const painel = usePainelOpcional();
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div className="entra">
      {anexo.tipo === 'foto' && anexo.imagem && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-borda bg-sutil">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimizador */}
          <img src={anexo.imagem} alt={anexo.descricao || 'Foto do processo'} className="mx-auto max-h-[55vh] w-auto object-contain" />
        </div>
      )}
      <fieldset disabled={!podeEditar} className="contents">
        <Grupo>
          {anexo.tipo === 'link' && (
            <LinhaTexto
              rotulo="Endereço"
              valor={anexo.url}
              aoMudar={v => atualizar('anexos', anexo.id, { url: v.trim() || null })}
              placeholder="https://"
            />
          )}
          <LinhaTextoLongo
            rotulo="Descrição"
            valor={anexo.descricao}
            aoMudar={v => atualizar('anexos', anexo.id, { descricao: v || null })}
            placeholder={anexo.tipo === 'foto' ? 'O que a foto mostra (ex.: planilha de recebimento na doca)' : 'O que tem nesse link'}
          />
        </Grupo>
      </fieldset>
      <div className="mt-4 flex gap-2">
        {anexo.tipo === 'link' && anexo.url && (
          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className={cn(estiloBotao(), 'flex-1')}>
            <IconExterno size={16} /> Abrir link
          </a>
        )}
        {podeEditar && (
          <button
            type="button"
            onClick={() => setExcluindo(true)}
            className="foco inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pilula bg-risco px-4 text-[14px] font-semibold text-white transition-[filter,translate,scale] hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
          >
            <IconExcluir size={16} /> Excluir anexo
          </button>
        )}
      </div>
      <Confirmar
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={anexo.tipo === 'foto' ? 'Excluir esta foto?' : 'Excluir este link?'}
        texto="Sai do processo em todos os aparelhos."
        rotuloConfirmar="Excluir anexo"
        aoConfirmar={async () => {
          painel?.voltar();
          await comIndicador(() => excluir('anexos', anexo.id));
        }}
      />
    </div>
  );
}

/** Sub-tela de novo link: endereço e descrição, e o botão Adicionar. */
function NovoLink({ processoId }: { processoId: string }) {
  const painel = usePainelOpcional();
  const [url, setUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState(false);
  const adicionar = async () => {
    const link = normalizarLink(url);
    if (!link) {
      setErro(true);
      return;
    }
    await comIndicador(() => criarAnexo(processoId, { tipo: 'link', url: link, descricao: descricao.trim() || null }));
    setUrl('');
    setDescricao('');
    setErro(false);
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
      <Grupo rodape="Planilha, pasta no Drive, vídeo, página do sistema: qualquer link que ajude a entender o processo.">
        <LinhaTexto rotulo="Endereço" valor={url} aoMudar={v => (setUrl(v), setErro(false))} placeholder="drive.google.com/..." autoFocus />
        <LinhaTexto rotulo="Descrição" valor={descricao} aoMudar={setDescricao} placeholder="O que tem nesse link" />
      </Grupo>
      {erro && (
        <p role="alert" className="entra mt-2 px-1 text-[13px] font-medium text-risco">
          Esse endereço não parece um link. Confira e tente de novo.
        </p>
      )}
      <button type="submit" disabled={!url.trim()} className={cn(estiloBotao({ variante: 'primario' }), 'mt-4 w-full disabled:opacity-40')}>
        <IconAdicionar size={17} /> Adicionar link
      </button>
    </form>
  );
}
