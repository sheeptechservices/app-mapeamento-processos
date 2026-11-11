// Sincronização do aparelho com o servidor. A fila é o próprio banco local:
// todo registro com `_pendente = 1` vai no próximo envio. A resposta traz tudo o
// que mudou na organização desde o cursor, e cada registro é mesclado por campo
// com a versão local - o que o consultor digitou durante a ida e volta nunca é
// atropelado, só fica pendente para o envio seguinte.
import Dexie from 'dexie';
import type { Registro } from '@/lib/dominio';
import { TABELAS, type PedidoSync, type RespostaSync } from '@/lib/sync-protocolo';
import { banco, type BancoLocal } from './banco';
import { mesclarPorCampo } from './mesclar';
import { garantirConfiguracoes, quandoGravar } from './repo';

export type Transporte = (pedido: PedidoSync) => Promise<RespostaSync>;

export class SemSessao extends Error {}

/** Envio padrão: POST /api/sync com o cookie da sessão. */
export const viaFetch: Transporte = async pedido => {
  const r = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedido),
  });
  if (r.status === 401) throw new SemSessao();
  if (!r.ok) throw new Error(`sync respondeu ${r.status}`);
  return (await r.json()) as RespostaSync;
};

const LOTE = 400;

export interface ResultadoSync {
  enviados: number;
  recebidos: number;
  conflitos: number;
}

/** Uma rodada: envia o pendente (em lotes) e aplica o que veio. */
export async function rodadaSync(transporte: Transporte, db: BancoLocal = banco()): Promise<ResultadoSync> {
  const cursor = ((await db.meta.get('cursor'))?.valor as number | undefined) ?? 0;
  const ultimaLocal = ((await db.meta.get('ultima_local'))?.valor as number | undefined) ?? 0;
  const inicio = Date.now();

  const pendentes = await Promise.all(TABELAS.map(t => db.tabela(t).where('_pendente').equals(1).toArray()));
  const total = pendentes.reduce((s, l) => s + l.length, 0);

  // Lotes: cada pedido leva até LOTE registros, mantendo a ordem das tabelas
  // (levantamento antes de área, área antes de processo).
  const lotes: PedidoSync['mudancas'][] = [];
  let atual: PedidoSync['mudancas'] = {};
  let noLote = 0;
  TABELAS.forEach((t, i) => {
    for (const reg of pendentes[i]) {
      if (noLote >= LOTE) {
        lotes.push(atual);
        atual = {};
        noLote = 0;
      }
      const { _pendente, _conflitos, ...resto } = reg;
      void _pendente;
      void _conflitos;
      const alterados = Object.entries(reg._ts ?? {})
        .filter(([, ts]) => ts > ultimaLocal)
        .map(([c]) => c);
      (atual[t] ??= []).push({ ...resto, _alterados: alterados } as never);
      noLote++;
    }
  });
  lotes.push(atual);

  let recebidos = 0;
  let conflitos = 0;
  let cursorAtual = cursor;
  for (const mudancas of lotes) {
    const resp = await transporte({ desde: cursorAtual, mudancas });
    const r = await aplicarResposta(db, resp);
    recebidos += r.recebidos;
    conflitos += r.conflitos;
    cursorAtual = resp.cursor;
  }

  await db.meta.put({ chave: 'ultima_local', valor: inicio });
  return { enviados: total, recebidos, conflitos };
}

async function aplicarResposta(db: BancoLocal, resp: RespostaSync) {
  let recebidos = 0;
  const tabelas = [...TABELAS.map(t => db.tabela(t)), db.meta];
  await db.transaction('rw', tabelas, async () => {
    for (const t of TABELAS) {
      const tb = db.tabela(t);
      for (const remotoBruto of resp.registros[t] ?? []) {
        const remoto = { ...remotoBruto, _pendente: 0 } as unknown as Registro & Record<string, unknown>;
        const local = await tb.get(remoto.id);
        if (!local) {
          await tb.put(remoto);
        } else {
          // `desde` infinito: conflito quem decide é o servidor (vem em resp.conflitos).
          const { registro } = mesclarPorCampo(local, remoto, Number.POSITIVE_INFINITY);
          await tb.put({ ...registro, _conflitos: local._conflitos });
        }
        recebidos++;
      }
    }
    for (const c of resp.conflitos) {
      const tb = db.tabela(c.tabela);
      const reg = await tb.get(c.id);
      if (reg) await tb.put({ ...reg, _conflitos: [...new Set([...(reg._conflitos ?? []), ...c.campos])] });
    }
    // Recusado (outra organização) não volta para a fila.
    for (const r of resp.recusados) {
      const tb = db.tabela(r.tabela);
      const reg = await tb.get(r.id);
      if (reg) await tb.put({ ...reg, _pendente: 0 });
    }
    await db.meta.put({ chave: 'cursor', valor: resp.cursor });
  });
  return { recebidos, conflitos: resp.conflitos.length };
}

// ─── Agendamento e estado para a tela ─────────────────────────────────────

export type FaseSync = 'ocioso' | 'sincronizando' | 'erro' | 'sem_sessao';

export interface EstadoSync {
  fase: FaseSync;
  pendentes: number;
  ultima: number | null;
}

let estado: EstadoSync = { fase: 'ocioso', pendentes: 0, ultima: null };
const ouvintes = new Set<() => void>();

function definir(parcial: Partial<EstadoSync>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach(o => o());
}

export function assinarSync(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}
export const estadoSync = () => estado;

export async function contarPendentes(db: BancoLocal = banco()) {
  const n = await Promise.all(TABELAS.map(t => db.tabela(t).where('_pendente').equals(1).count()));
  return n.reduce((a, b) => a + b, 0);
}

/**
 * Conta as pendências fora de qualquer transação em curso. O aviso de escrita
 * pode chegar de dentro de uma transação que só abrange algumas tabelas (criar
 * sessão grava sessão e roteiro juntos); contar ali dentro faria o IndexedDB
 * recusar as outras tabelas ("object store not found").
 */
export function contarPendentesFora(db: BancoLocal = banco()) {
  return Dexie.ignoreTransaction(() => contarPendentes(db));
}

let emCurso: Promise<void> | null = null;
let deNovo = false;

/**
 * Sincroniza agora. Se já houver uma rodada em curso, pede mais uma na
 * sequência e devolve a promessa da que está andando (quem espera, espera tudo).
 */
export function sincronizar(transporte: Transporte = viaFetch): Promise<void> {
  if (emCurso) {
    deNovo = true;
    return emCurso;
  }
  emCurso = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      definir({ pendentes: await contarPendentes() });
      return;
    }
    definir({ fase: 'sincronizando' });
    try {
      do {
        deNovo = false;
        await rodadaSync(transporte);
      } while (deNovo);
      definir({ fase: 'ocioso', ultima: Date.now(), pendentes: await contarPendentes() });
    } catch (e) {
      definir({ fase: e instanceof SemSessao ? 'sem_sessao' : 'erro', pendentes: await contarPendentes() });
    }
  })().finally(() => {
    emCurso = null;
  });
  return emCurso;
}

/**
 * Liga a sincronização automática: ao abrir, ao voltar a conexão, 2 s depois de
 * cada escrita e a cada 30 s com o app visível. Devolve a função de desligar.
 */
export function iniciarSincronizacao() {
  let espera: ReturnType<typeof setTimeout> | null = null;
  const agendar = () => {
    contarPendentesFora()
      .then(pendentes => definir({ pendentes }))
      .catch(() => {
        /* contagem só informa a tela; a sincronização recalcula */
      });
    if (espera) clearTimeout(espera);
    espera = setTimeout(() => void sincronizar(), 2_000);
  };
  quandoGravar(agendar);
  // Pede armazenamento persistente: sem isso o navegador pode apagar o banco do
  // aparelho quando falta espaço, levando junto o que ainda não sincronizou.
  void navigator.storage?.persist?.().catch(() => false);
  const aoVoltar = () => void sincronizar();
  window.addEventListener('online', aoVoltar);
  const intervalo = setInterval(() => {
    if (document.visibilityState === 'visible') void sincronizar();
  }, 30_000);
  // Configurações da organização: só nascem no aparelho depois da primeira
  // sincronização, para nunca criar padrões por cima do que outro aparelho já
  // configurou no servidor.
  void sincronizar().then(() => {
    if (estado.ultima) void garantirConfiguracoes();
  });
  return () => {
    quandoGravar(null);
    window.removeEventListener('online', aoVoltar);
    clearInterval(intervalo);
    if (espera) clearTimeout(espera);
  };
}
