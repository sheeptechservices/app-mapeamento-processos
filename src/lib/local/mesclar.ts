// "Last write wins" por campo: de cada campo fica a versão com o carimbo mais
// novo. Dois consultores mexendo em campos diferentes do mesmo processo não se
// atropelam; mexendo no mesmo campo, vence a última escrita e o campo é
// devolvido em `disputados` para a tela marcar o conflito.
import type { Registro } from '@/lib/dominio';

const CONTROLE = new Set(['id', '_ts', '_pendente', 'atualizado_em']);

export interface ResultadoMescla<T> {
  registro: T;
  /** Campos que os dois lados alteraram com valores diferentes. */
  disputados: string[];
}

function igual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Mescla a versão local com a remota. Empate de carimbo fica com a remota, que
 * é a que o servidor já distribuiu para os outros aparelhos.
 * `desde` é o carimbo da última sincronização: só conta como disputa o campo
 * que os dois lados mudaram depois dele.
 */
export function mesclarPorCampo<T extends Registro>(local: T, remoto: T, desde = 0): ResultadoMescla<T> {
  const campos = new Set([...Object.keys(local), ...Object.keys(remoto)].filter(c => !CONTROLE.has(c)));
  const saida: Record<string, unknown> = { ...(remoto as unknown as Record<string, unknown>) };
  const ts: Record<string, number> = {};
  const disputados: string[] = [];

  for (const campo of campos) {
    const tl = local._ts?.[campo] ?? 0;
    const tr = remoto._ts?.[campo] ?? 0;
    const vl = (local as Record<string, unknown>)[campo];
    const vr = (remoto as Record<string, unknown>)[campo];
    const ganhaLocal = tl > tr;
    saida[campo] = ganhaLocal ? vl : vr;
    ts[campo] = Math.max(tl, tr);
    if (tl > desde && tr > desde && !igual(vl, vr)) disputados.push(campo);
  }

  const registro = {
    ...saida,
    id: remoto.id,
    _ts: ts,
    atualizado_em: Math.max(local.atualizado_em, remoto.atualizado_em),
    // Algum campo local ainda venceu: há o que mandar ao servidor.
    _pendente: [...campos].some(c => (local._ts?.[c] ?? 0) > (remoto._ts?.[c] ?? 0)) ? 1 : 0,
  } as T;

  return { registro, disputados };
}
