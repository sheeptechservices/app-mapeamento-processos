'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import type { Registro } from '@/lib/dominio';
import { banco } from './banco';
import { autorAtual } from './repo';

// Leituras reativas: a tela se atualiza sozinha a cada escrita no banco local.
// `undefined` enquanto carrega; registro excluído some daqui.

const vivos = <T extends Registro>(l: T[]) => l.filter(r => !r.excluido);

export function useConfiguracoes() {
  return useLiveQuery(async () => (await banco().configuracoes.get(autorAtual().organizacao_id)) ?? null);
}

export function useClientes() {
  return useLiveQuery(async () => vivos(await banco().clientes.toArray()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
}

/** `null` quando não existe (ou foi excluído). */
export function useCliente(id: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const c = await banco().clientes.get(id);
    return c && !c.excluido ? c : null;
  }, [id]);
}

export function useSessoes(clienteId?: string | null) {
  return useLiveQuery(async () => {
    const lista = clienteId ? await banco().sessoes.where('cliente_id').equals(clienteId).toArray() : await banco().sessoes.toArray();
    return vivos(lista).sort((a, b) => b.data.localeCompare(a.data) || b.criado_em - a.criado_em);
  }, [clienteId]);
}

export function useSessao(id: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const s = await banco().sessoes.get(id);
    return s && !s.excluido ? s : null;
  }, [id]);
}

export function useAreas(sessaoId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!sessaoId) return [];
    const lista = vivos(await banco().areas.where('sessao_id').equals(sessaoId).toArray());
    return lista.sort((a, b) => a.ordem - b.ordem || a.criado_em - b.criado_em);
  }, [sessaoId]);
}

/** Processos de uma sessão, ou de todas (carteira) quando `sessaoId` é omitido. */
export function useProcessos(sessaoId?: string | null) {
  return useLiveQuery(async () => {
    const lista = sessaoId ? await banco().processos.where('sessao_id').equals(sessaoId).toArray() : await banco().processos.toArray();
    return vivos(lista).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [sessaoId]);
}

/** Todas as áreas (para nomear setor nos processos da carteira). */
export function useTodasAreas() {
  return useLiveQuery(async () => vivos(await banco().areas.toArray()));
}

export function useRoteiro(sessaoId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!sessaoId) return [];
    const [blocos, perguntas] = await Promise.all([
      banco().roteiro_blocos.where('sessao_id').equals(sessaoId).toArray(),
      banco().roteiro_perguntas.where('sessao_id').equals(sessaoId).toArray(),
    ]);
    return vivos(blocos)
      .sort((a, b) => a.ordem - b.ordem)
      .map(bloco => ({
        bloco,
        perguntas: vivos(perguntas)
          .filter(p => p.bloco_id === bloco.id)
          .sort((a, b) => a.ordem - b.ordem || a.criado_em - b.criado_em),
      }));
  }, [sessaoId]);
}

export function useCapturas(sessaoId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!sessaoId) return [];
    return vivos(await banco().capturas.where('sessao_id').equals(sessaoId).toArray()).sort((a, b) => b.criado_em - a.criado_em);
  }, [sessaoId]);
}

/** Anexos (fotos e links) de um processo, na ordem em que entraram. */
export function useAnexos(processoId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!processoId) return [];
    return vivos(await banco().anexos.where('processo_id').equals(processoId).toArray()).sort(
      (a, b) => a.ordem - b.ordem || a.criado_em - b.criado_em,
    );
  }, [processoId]);
}

/** Conteúdo de um anexo do tipo arquivo, montado das partes (null enquanto alguma parte não chegou). */
export async function lerConteudoAnexo(anexo: { id: string; partes: number | null }): Promise<string[] | null> {
  const partes = (await banco().anexos_partes.where('anexo_id').equals(anexo.id).toArray())
    .filter(p => !p.excluido && p.dados)
    .sort((a, b) => a.ordem - b.ordem);
  if (!anexo.partes || partes.length < anexo.partes) return null;
  return partes.map(p => p.dados as string);
}

/** Quantas partes do arquivo já estão no aparelho (para mostrar que ainda está chegando). */
export function usePartesNoAparelho(anexoId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!anexoId) return 0;
    return (await banco().anexos_partes.where('anexo_id').equals(anexoId).toArray()).filter(p => !p.excluido && p.dados).length;
  }, [anexoId]);
}
