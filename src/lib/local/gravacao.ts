'use client';

// Estado de gravação que o topo mostra (Salvando / Salvo / Offline) e o rascunho
// com escrita adiada dos formulários.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Dados, Registro } from '@/lib/dominio';
import { banco, type TabelaSync } from './banco';
import { atualizar } from './repo';

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();
let gravando = 0;
let ultimaGravacao: number | null = null;

function avisar() {
  ouvintes.forEach(o => o());
}

export async function comIndicador<T>(fn: () => Promise<T>): Promise<T> {
  gravando++;
  avisar();
  try {
    return await fn();
  } finally {
    gravando--;
    ultimaGravacao = Date.now();
    avisar();
  }
}

function assinar(o: Ouvinte) {
  ouvintes.add(o);
  window.addEventListener('online', o);
  window.addEventListener('offline', o);
  return () => {
    ouvintes.delete(o);
    window.removeEventListener('online', o);
    window.removeEventListener('offline', o);
  };
}

export type EstadoGravacao = 'salvando' | 'salvo' | 'offline';

let cache: { estado: EstadoGravacao; ultima: number | null } = { estado: 'salvo', ultima: null };
function instantaneo() {
  const estado: EstadoGravacao = gravando > 0 ? 'salvando' : navigator.onLine ? 'salvo' : 'offline';
  if (estado !== cache.estado || ultimaGravacao !== cache.ultima) cache = { estado, ultima: ultimaGravacao };
  return cache;
}
const noServidor = { estado: 'salvo' as EstadoGravacao, ultima: null };

export function useEstadoGravacao() {
  return useSyncExternalStore(assinar, instantaneo, () => noServidor);
}

type Tabela = TabelaSync;

/**
 * Rascunho de um registro: a tela digita no estado local (sem esperar o banco)
 * e a escrita vai para o IndexedDB depois de uma pausa curta, só com os campos
 * que mudaram. Sair da tela, trocar de aba ou fechar o app grava na hora.
 */
export function useRascunho<T extends Registro>(tabela: Tabela, registro: T | null | undefined, atraso = 350) {
  const [rascunho, setRascunho] = useState<T | null>(registro ?? null);
  const pendente = useRef<Partial<Dados<T>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef<string | null>(registro?.id ?? null);
  // Escritas já mandadas ao IndexedDB mas que ainda não voltaram pela consulta.
  const emVoo = useRef<Record<string, unknown>>({});
  const [versaoVista, setVersaoVista] = useState(registro?.atualizado_em ?? 0);

  // Ajustes no próprio render (e não num efeito):
  // - primeiro carregamento ou troca de registro: adota a versão do banco;
  // - o registro mudou por fora (sincronização trouxe edição de outro aparelho):
  //   adota a versão nova, mas por cima ficam o que está em voo e o que ainda
  //   está sendo digitado, para o campo em uso nunca pular para trás.
  if (registro && (!rascunho || registro.id !== rascunho.id)) {
    setRascunho(registro);
    setVersaoVista(registro.atualizado_em);
  } else if (registro && rascunho && registro.atualizado_em !== versaoVista) {
    setVersaoVista(registro.atualizado_em);
    setRascunho(() => ({ ...registro, ...emVoo.current, ...pendente.current }) as T);
  }
  const idAtual = rascunho?.id ?? null;

  const gravar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = idRef.current;
    const mudancas = pendente.current as Record<string, unknown>;
    pendente.current = {};
    if (!id || !Object.keys(mudancas).length) return;
    Object.assign(emVoo.current, mudancas);
    void comIndicador(() => atualizar(tabela, id, mudancas as never)).finally(() => {
      for (const [campo, valor] of Object.entries(mudancas)) {
        if (emVoo.current[campo] === valor) delete emVoo.current[campo];
      }
    });
  }, [tabela]);

  const mudar = useCallback(
    <K extends keyof Dados<T>>(campo: K, valor: Dados<T>[K]) => {
      setRascunho(r => (r ? { ...r, [campo]: valor } : r));
      pendente.current = { ...pendente.current, [campo]: valor };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(gravar, atraso);
    },
    [gravar, atraso],
  );

  // Trocou de registro: o que estava pendente vai para o anterior antes da troca.
  useEffect(() => {
    if (idRef.current !== idAtual) {
      gravar();
      idRef.current = idAtual;
    }
  }, [idAtual, gravar]);

  useEffect(() => {
    const aoEsconder = () => document.visibilityState === 'hidden' && gravar();
    window.addEventListener('pagehide', gravar);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', gravar);
      document.removeEventListener('visibilitychange', aoEsconder);
      gravar();
    };
  }, [gravar]);

  return { rascunho, mudar, gravar };
}

// ─── Rascunho de cadastro novo ────────────────────────────────────────────
// O que se digita num cadastro novo (antes do Salvar) fica guardado no aparelho,
// na tabela local `meta` (não sincroniza: é rascunho deste aparelho). Fechar o
// painel, recarregar ou o app cair não perde nada; ao salvar, o rascunho some.

interface Rascunho {
  dados: Record<string, unknown>;
  extras: Record<string, unknown>;
  em: number;
}

const chaveMeta = (chave: string) => `rascunho:${chave}`;

export async function lerRascunho(chave: string): Promise<Rascunho | null> {
  const r = await banco().meta.get(chaveMeta(chave));
  return (r?.valor as Rascunho | undefined) ?? null;
}
export async function guardarRascunho(chave: string, dados: Record<string, unknown>, extras: Record<string, unknown> = {}) {
  await banco().meta.put({ chave: chaveMeta(chave), valor: { dados, extras, em: Date.now() } satisfies Rascunho });
}
export async function apagarRascunho(chave: string) {
  await banco().meta.delete(chaveMeta(chave));
}

/**
 * Formulário que serve para criar e para editar. Editando (há registro), cada
 * alteração vai para o banco sozinha (useRascunho). Criando, os dados ficam na
 * tela e, com `chaveRascunho`, também num rascunho no aparelho até o Salvar
 * (`concluir()` apaga o rascunho; `descartar()` volta ao vazio).
 * `extras` guarda valores do cadastro que não são campos do registro (ex.: o
 * setor escolhido para um processo novo).
 */
export function useFormulario<T extends Registro>(
  tabela: Tabela,
  registro: T | null | undefined,
  vazio: () => Dados<T>,
  chaveRascunho?: string | null,
) {
  const edicao = useRascunho(tabela, registro ?? null);
  const [novo, setNovo] = useState<Dados<T>>(vazio);
  const [extras, setExtras] = useState<Record<string, unknown>>({});
  const [recuperado, setRecuperado] = useState(false);
  const editando = !!registro;
  const chave = editando ? null : (chaveRascunho ?? null);

  // Espelhos para gravar o rascunho fora do render.
  const novoRef = useRef(novo);
  const extrasRef = useRef(extras);
  const digitou = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chaveRef = useRef(chave);

  const gravarRascunho = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const k = chaveRef.current;
    if (k && digitou.current) void guardarRascunho(k, novoRef.current as Record<string, unknown>, extrasRef.current);
  }, []);
  // Fechou o painel (a chave sai): grava na hora o rascunho da chave que saiu.
  useEffect(() => {
    if (chaveRef.current && chaveRef.current !== chave) gravarRascunho();
    chaveRef.current = chave;
  }, [chave, gravarRascunho]);
  const agendarRascunho = () => {
    if (!chaveRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(gravarRascunho, 300);
  };

  // Abriu um cadastro novo com chave: recupera o rascunho, se houver (e se a
  // pessoa ainda não começou a digitar nesta abertura).
  useEffect(() => {
    if (!chave) return;
    let vivo = true;
    void lerRascunho(chave).then(r => {
      if (!vivo || !r || digitou.current) return;
      const dadosR = { ...vazio(), ...r.dados } as Dados<T>;
      novoRef.current = dadosR;
      extrasRef.current = r.extras ?? {};
      setNovo(dadosR);
      setExtras(r.extras ?? {});
      setRecuperado(true);
    });
    return () => {
      vivo = false;
    };
    // `vazio` muda a cada render; a chave é o que define o cadastro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // Sair da página ou esconder o app grava o rascunho na hora.
  useEffect(() => {
    const aoEsconder = () => document.visibilityState === 'hidden' && gravarRascunho();
    window.addEventListener('pagehide', gravarRascunho);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', gravarRascunho);
      document.removeEventListener('visibilitychange', aoEsconder);
      gravarRascunho();
    };
  }, [gravarRascunho]);

  const dados = (editando ? edicao.rascunho : novo) as Dados<T> | null;
  const mudar = <K extends keyof Dados<T>>(campo: K, valor: Dados<T>[K]) => {
    if (editando) return edicao.mudar(campo, valor);
    const n = { ...novoRef.current, [campo]: valor };
    novoRef.current = n;
    digitou.current = true;
    setNovo(n);
    agendarRascunho();
  };
  const mudarExtra = (campo: string, valor: unknown) => {
    const n = { ...extrasRef.current, [campo]: valor };
    extrasRef.current = n;
    digitou.current = true;
    setExtras(n);
    agendarRascunho();
  };
  const limpar = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = vazio();
    novoRef.current = v;
    extrasRef.current = {};
    digitou.current = false;
    setNovo(v);
    setExtras({});
    setRecuperado(false);
  };
  return {
    dados,
    mudar,
    editando,
    extras,
    mudarExtra,
    /** Rascunho de uma abertura anterior foi recuperado. */
    recuperado,
    /** Volta ao cadastro vazio, sem apagar o rascunho guardado (ele volta na próxima abertura). */
    reiniciar: limpar,
    /** Apaga o rascunho e volta ao vazio. */
    descartar: () => {
      const k = chaveRef.current;
      limpar();
      if (k) void apagarRascunho(k);
    },
    /** Cadastro salvo: o rascunho não serve mais. */
    concluir: () => {
      const k = chaveRef.current;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      digitou.current = false;
      if (k) void apagarRascunho(k);
    },
  };
}
