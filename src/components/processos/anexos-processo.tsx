'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react';
import {
  IconAdicionar,
  IconAnexo,
  IconArquivo,
  IconBaixar,
  IconCamera,
  IconExcluir,
  IconExterno,
  IconImagem,
  IconLink,
  IconPlanilha,
} from '@/components/icons';
import { estiloBotao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/confirmar';
import { Grupo, LinhaTexto, LinhaTextoLongo } from '@/components/ui/linhas';
import { usePainelOpcional } from '@/components/ui/painel';
import { abreNoNavegador, ACEITOS, ErroArquivo, familiaDe, lerEmPartes, montar, tamanhoLegivel } from '@/lib/arquivo';
import type { Anexo } from '@/lib/dominio';
import { dominioDe, ErroFoto, fotoDoCanvas, normalizarLink, reduzirFoto } from '@/lib/foto';
import { lerConteudoAnexo, useAnexos, usePartesNoAparelho } from '@/lib/local/consultas';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar, criarAnexo, excluirAnexo } from '@/lib/local/repo';
import { cn } from '@/lib/cn';

/*
 * Anexos do processo: fotos (galeria ou câmera), arquivos (PDF, planilha,
 * documento) e links, cada um com uma descrição breve, para ilustrar como o
 * processo é feito. Ficam ligados ao processo, offline primeiro e sincronizados
 * como o resto (arquivo grande vai em partes).
 *
 * Câmera: no celular e no tablet abre a câmera do aparelho; no computador abre
 * a webcam dentro do app. Nos dois casos a foto tirada já entra como anexo e a
 * tela de descrição abre em seguida.
 *
 * `useAnexosProcesso` devolve o grupo do formulário e as sub-telas (editar um
 * anexo, novo link, câmera), que o PainelProcesso junta às dele.
 */

type SubTela = { titulo: string; conteudo: ReactNode };

const TOQUE = '(pointer: coarse)';
function assinarToque(aviso: () => void) {
  const m = matchMedia(TOQUE);
  m.addEventListener('change', aviso);
  return () => m.removeEventListener('change', aviso);
}
const eToque = () => matchMedia(TOQUE).matches;
const nada = () => () => {};
const temWebcam = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const TITULO: Record<Anexo['tipo'], string> = { foto: 'Foto', link: 'Link', arquivo: 'Arquivo' };

export function useAnexosProcesso(processoId: string | null, podeEditar: boolean): { grupo: ReactNode; subtelas: Record<string, SubTela> } {
  const anexos = useAnexos(processoId) ?? [];
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const anexo = anexos.find(a => a.id === selecionado) ?? null;

  const grupo = processoId ? (
    <AreaAnexos processoId={processoId} anexos={anexos} podeEditar={podeEditar} aoAbrir={setSelecionado} />
  ) : (
    <Grupo titulo="Anexos">
      <p className="px-4 py-3.5 text-[13px] leading-relaxed text-tinta-2">Salve o processo para anexar fotos, arquivos e links.</p>
    </Grupo>
  );

  const subtelas: Record<string, SubTela> = {
    anexo: {
      titulo: anexo ? TITULO[anexo.tipo] : 'Anexo',
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
    'anexo-camera': {
      titulo: 'Tirar foto',
      conteudo: processoId ? <CameraNoApp processoId={processoId} aoTirar={setSelecionado} /> : null,
    },
  };
  return { grupo, subtelas };
}

/** Ícone do anexo da lista (link, planilha ou documento). */
function IconeAnexo({ anexo }: { anexo: Anexo }) {
  if (anexo.tipo === 'link') return <IconLink size={17} />;
  return familiaDe(anexo.nome) === 'planilha' ? <IconPlanilha size={17} /> : <IconArquivo size={17} />;
}

/** Abre (PDF, imagem, texto) ou baixa (planilha, documento) o arquivo montado das partes. */
async function abrirArquivo(anexo: Anexo, baixar = false): Promise<boolean> {
  const partes = await lerConteudoAnexo(anexo);
  if (!partes) return false;
  const url = URL.createObjectURL(montar(partes, anexo.mime));
  const a = document.createElement('a');
  a.href = url;
  if (baixar || !abreNoNavegador(anexo.mime, anexo.nome)) a.download = anexo.nome || 'anexo';
  else {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
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
  const webcam = useSyncExternalStore(nada, temWebcam, () => false);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const fotos = anexos.filter(a => a.tipo === 'foto');
  const outros = anexos.filter(a => a.tipo !== 'foto');

  const abrir = (id: string) => {
    aoAbrir(id);
    painel?.abrir('anexo');
  };

  // Foto vira imagem reduzida; o resto entra como arquivo (em partes).
  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const escolhidos = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!escolhidos.length) return;
    setErro(null);
    setEnviando(n => n + escolhidos.length);
    let ultimo: string | null = null;
    for (const f of escolhidos) {
      try {
        if (f.type.startsWith('image/')) {
          const imagem = await reduzirFoto(f);
          ultimo = (await comIndicador(() => criarAnexo(processoId, { tipo: 'foto', imagem }))).id;
        } else {
          const partes = await lerEmPartes(f);
          ultimo = (
            await comIndicador(() =>
              criarAnexo(processoId, { tipo: 'arquivo', nome: f.name, mime: f.type || null, tamanho: f.size }, partes),
            )
          ).id;
        }
      } catch (err) {
        setErro(err instanceof ErroFoto || err instanceof ErroArquivo ? err.message : `Não foi possível anexar "${f.name}".`);
      } finally {
        setEnviando(n => n - 1);
      }
    }
    // Um anexo só: já abre para escrever a descrição.
    if (escolhidos.length === 1 && ultimo) abrir(ultimo);
  };

  return (
    <Grupo
      titulo="Anexos"
      rodape={podeEditar ? 'Fotos, arquivos e links que mostram como o processo é feito. Toque para pôr uma descrição.' : undefined}
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
        </ul>
      )}

      {outros.map(a => (
        <div key={a.id} className="relative flex min-h-[56px] items-center gap-3 px-4 py-2 transition-colors hover:bg-sutil">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sutil text-tinta-2">
            <IconeAnexo anexo={a} />
          </span>
          <span className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => abrir(a.id)}
              className="foco block max-w-full truncate text-left text-[15px] font-medium after:absolute after:inset-0 after:content-['']"
            >
              {a.descricao || (a.tipo === 'link' ? dominioDe(a.url) : a.nome) || TITULO[a.tipo]}
            </button>
            <span className="block truncate text-[12px] text-tinta-3">
              {a.tipo === 'link' ? dominioDe(a.url) : [a.nome, tamanhoLegivel(a.tamanho)].filter(Boolean).join(' - ')}
            </span>
          </span>
          {a.tipo === 'link' && a.url && (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir o link"
              aria-label={`Abrir ${dominioDe(a.url)}`}
              className="foco aperta relative z-10 grid size-9 shrink-0 place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-borda hover:text-tinta"
            >
              <IconExterno size={16} />
            </a>
          )}
          {a.tipo === 'arquivo' && (
            <button
              type="button"
              onClick={async () => {
                if (!(await abrirArquivo(a))) setErro(`"${a.nome}" ainda está chegando neste aparelho. Tente de novo em instantes.`);
              }}
              title={abreNoNavegador(a.mime, a.nome) ? 'Abrir o arquivo' : 'Baixar o arquivo'}
              aria-label={`${abreNoNavegador(a.mime, a.nome) ? 'Abrir' : 'Baixar'} ${a.nome ?? 'arquivo'}`}
              className="foco aperta relative z-10 grid size-9 shrink-0 place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-borda hover:text-tinta"
            >
              {abreNoNavegador(a.mime, a.nome) ? <IconExterno size={16} /> : <IconBaixar size={16} />}
            </button>
          )}
        </div>
      ))}

      {enviando > 0 && (
        <div className="entra flex items-center gap-3 px-4 py-3.5 text-[13px] text-tinta-2">
          <span className="spinner sm" /> {enviando === 1 ? 'Preparando o anexo' : `Preparando ${enviando} anexos`}
        </div>
      )}

      {anexos.length === 0 && enviando === 0 && <p className="px-4 py-3.5 text-[13px] text-tinta-3">Nenhum anexo ainda.</p>}

      {erro && (
        <p role="alert" className="entra px-4 py-2.5 text-[13px] font-medium text-risco">
          {erro}
        </p>
      )}

      {podeEditar && (
        <div className="@container p-3">
          <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={escolher} />
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
          <input ref={arquivo} type="file" accept={ACEITOS} multiple hidden onChange={escolher} />
          <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
            <button type="button" onClick={() => galeria.current?.click()} className={estiloBotao({ tamanho: 'sm' })}>
              <IconImagem size={16} /> Foto
            </button>
            {(toque || webcam) && (
              <button
                type="button"
                // Celular e tablet: câmera do aparelho. Computador: webcam dentro do app.
                onClick={() => (toque ? camera.current?.click() : painel?.abrir('anexo-camera'))}
                className={estiloBotao({ tamanho: 'sm' })}
              >
                <IconCamera size={16} /> Câmera
              </button>
            )}
            <button type="button" onClick={() => arquivo.current?.click()} className={estiloBotao({ tamanho: 'sm' })}>
              <IconAnexo size={16} /> Arquivo
            </button>
            <button type="button" onClick={() => painel?.abrir('anexo-link')} className={estiloBotao({ tamanho: 'sm' })}>
              <IconLink size={16} /> Link
            </button>
          </div>
        </div>
      )}
    </Grupo>
  );
}

/** Sub-tela de um anexo: foto grande, arquivo ou link; descrição e excluir. Edição salva sozinha. */
function EditarAnexo({ anexo, podeEditar }: { anexo: Anexo; podeEditar: boolean }) {
  const painel = usePainelOpcional();
  const [excluindo, setExcluindo] = useState(false);
  const noAparelho = usePartesNoAparelho(anexo.tipo === 'arquivo' ? anexo.id : null) ?? 0;
  const chegando = anexo.tipo === 'arquivo' && noAparelho < (anexo.partes ?? 0);
  const abre = abreNoNavegador(anexo.mime, anexo.nome);
  return (
    <div className="entra">
      {anexo.tipo === 'foto' && anexo.imagem && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-borda bg-sutil">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimizador */}
          <img src={anexo.imagem} alt={anexo.descricao || 'Foto do processo'} className="mx-auto max-h-[55vh] w-auto object-contain" />
        </div>
      )}
      {anexo.tipo === 'arquivo' && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sutil text-tinta-2">
            <IconeAnexo anexo={anexo} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{anexo.nome}</span>
            <span className="block text-[12px] text-tinta-3">
              {chegando ? `Chegando neste aparelho (${noAparelho} de ${anexo.partes})` : tamanhoLegivel(anexo.tamanho)}
            </span>
          </span>
          {chegando && <span className="spinner sm" />}
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
            placeholder={
              anexo.tipo === 'foto'
                ? 'O que a foto mostra (ex.: planilha de recebimento na doca)'
                : anexo.tipo === 'arquivo'
                  ? 'O que tem nesse arquivo'
                  : 'O que tem nesse link'
            }
          />
        </Grupo>
      </fieldset>
      <div className="mt-4 flex gap-2">
        {anexo.tipo === 'link' && anexo.url && (
          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className={cn(estiloBotao(), 'flex-1')}>
            <IconExterno size={16} /> Abrir link
          </a>
        )}
        {anexo.tipo === 'arquivo' && (
          <button
            type="button"
            disabled={chegando}
            onClick={() => void abrirArquivo(anexo)}
            className={cn(estiloBotao(), 'flex-1 disabled:opacity-40')}
          >
            {abre ? <IconExterno size={16} /> : <IconBaixar size={16} />} {abre ? 'Abrir' : 'Baixar'}
          </button>
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
        titulo={anexo.tipo === 'foto' ? 'Excluir esta foto?' : anexo.tipo === 'arquivo' ? 'Excluir este arquivo?' : 'Excluir este link?'}
        texto="Sai do processo em todos os aparelhos."
        rotuloConfirmar="Excluir anexo"
        aoConfirmar={async () => {
          painel?.voltar();
          await comIndicador(() => excluirAnexo(anexo.id));
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

/**
 * Câmera dentro do app (computador com webcam): mostra a imagem ao vivo e
 * "Tirar foto" grava o quadro como anexo; em seguida abre a descrição.
 */
function CameraNoApp({ processoId, aoTirar }: { processoId: string; aoTirar: (id: string) => void }) {
  const painel = usePainelOpcional();
  const video = useRef<HTMLVideoElement>(null);
  const [pronta, setPronta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tirando, setTirando] = useState(false);

  useEffect(() => {
    let fluxo: MediaStream | null = null;
    let ativo = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => {
        if (!ativo) return s.getTracks().forEach(t => t.stop());
        fluxo = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch((e: unknown) => {
        const nome = e instanceof DOMException ? e.name : '';
        setErro(
          nome === 'NotAllowedError'
            ? 'O navegador não deixou usar a câmera. Libere o acesso à câmera para este site e tente de novo.'
            : nome === 'NotFoundError'
              ? 'Nenhuma câmera encontrada neste aparelho.'
              : 'Não foi possível abrir a câmera.',
        );
      });
    return () => {
      ativo = false;
      fluxo?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const tirar = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setTirando(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d')?.drawImage(v, 0, 0);
      const imagem = fotoDoCanvas(canvas);
      const novo = await comIndicador(() => criarAnexo(processoId, { tipo: 'foto', imagem }));
      aoTirar(novo.id);
      painel?.voltar();
      painel?.abrir('anexo');
    } catch {
      setErro('Não foi possível guardar a foto.');
      setTirando(false);
    }
  };

  return (
    <div className="entra">
      <div className="relative mt-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-borda bg-tinta">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setPronta(true)}
          className={cn('size-full object-cover transition-opacity duration-300', pronta ? 'opacity-100' : 'opacity-0')}
        />
        {!pronta && !erro && <span className="spinner absolute" />}
      </div>
      {erro ? (
        <p role="alert" className="entra mt-3 px-1 text-[13px] font-medium text-risco">
          {erro}
        </p>
      ) : (
        <button
          type="button"
          disabled={!pronta || tirando}
          onClick={() => void tirar()}
          className={cn(estiloBotao({ variante: 'primario' }), 'mt-4 w-full disabled:opacity-40')}
        >
          {tirando ? <span className="spinner sm" /> : <IconCamera size={17} />} Tirar foto
        </button>
      )}
    </div>
  );
}
