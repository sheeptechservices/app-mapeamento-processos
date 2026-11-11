// Sincronização no servidor. Recebe o cliente do banco por parâmetro (sem
// `server-only` aqui) para os testes rodarem contra um libsql em memória; a rota
// /api/sync é quem liga isto no Turso de verdade.
//
// Regras:
// - Isolamento: todo registro gravado leva a organização da sessão, e registro
//   de outra organização é recusado. O Turso não tem RLS; a regra mora aqui.
// - Mescla: "last write wins" por campo, pelo carimbo do aparelho (`_ts`).
// - Conflito: o campo que este aparelho alterou e que outro aparelho gravou no
//   servidor depois do cursor deste aparelho. Vence o mais novo, e o campo é
//   devolvido em `conflitos` para a tela marcar.
import type { Client, InValue, Row } from '@libsql/client';
import {
  CAMPOS_CONTROLE_MESCLADOS,
  COLUNAS,
  SOBREPOSICAO_MS,
  TABELAS,
  type ConflitoSync,
  type RegistroWire,
  type RespostaSync,
  type TabelaSyncNome,
  pedidoSync,
} from '@/lib/sync-protocolo';

export interface SessaoSync {
  org: string;
  uid: string;
  /** Usuário só de leitura não grava nada: tudo o que mandar volta recusado. */
  papel?: 'admin' | 'consultor' | 'leitura';
}

let ultimoCarimbo = 0;
/** Carimbo do servidor, estritamente crescente dentro do processo. */
function carimbo() {
  ultimoCarimbo = Math.max(Date.now(), ultimoCarimbo + 1);
  return ultimoCarimbo;
}

function paraBanco(tipo: string, v: unknown) {
  if (v === undefined || v === null) return null;
  if (tipo === 'json') return JSON.stringify(v);
  if (tipo === 'bool') return v ? 1 : 0;
  if (tipo === 'numero') return typeof v === 'number' && Number.isFinite(v) ? v : null;
  return String(v);
}

function doBanco(tipo: string, v: unknown) {
  if (v === null || v === undefined) return tipo === 'bool' ? false : null;
  if (tipo === 'json') {
    try {
      return JSON.parse(String(v));
    } catch {
      return [];
    }
  }
  if (tipo === 'bool') return Number(v) === 1;
  if (tipo === 'numero') return Number(v);
  return String(v);
}

function lerJson(v: unknown): Record<string, number> {
  try {
    return JSON.parse(String(v ?? '{}')) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Linha do banco no formato do aparelho. */
function linhaParaWire(tabela: TabelaSyncNome, row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: String(row.id),
    organizacao_id: String(row.organizacao_id),
    criado_por: String(row.criado_por ?? ''),
    criado_em: Number(row.criado_em),
    atualizado_em: Number(row.atualizado_em),
    excluido: Number(row.excluido) === 1 ? 1 : 0,
    _ts: lerJson(row.campos_ts),
  };
  for (const [col, tipo] of Object.entries(COLUNAS[tabela])) out[col] = doBanco(tipo, row[col]);
  return out;
}

function igual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function gravarRegistro(
  tx: Pick<Client, 'execute'>,
  tabela: TabelaSyncNome,
  r: RegistroWire,
  sessao: SessaoSync,
  desde: number,
  agora: number,
): Promise<{ conflito?: string[]; recusado?: boolean }> {
  const colunas = COLUNAS[tabela];
  const dados = r as unknown as Record<string, unknown>;
  // Configurações: uma linha por organização, e o id é o da organização.
  if (tabela === 'configuracoes' && r.id !== sessao.org) return { recusado: true };
  const { rows } = await tx.execute({ sql: `SELECT * FROM ${tabela} WHERE id = ?`, args: [r.id] });
  const atual = rows[0];

  if (!atual) {
    const camposDado = Object.keys(colunas);
    const sync = Object.fromEntries(Object.keys(r._ts).map(c => [c, agora]));
    const cols = [
      'id',
      'organizacao_id',
      'criado_por',
      'criado_em',
      'atualizado_em',
      'excluido',
      'campos_ts',
      'campos_sync',
      'sincronizado_em',
      ...camposDado,
    ];
    const args = [
      r.id,
      sessao.org,
      r.criado_por || sessao.uid,
      r.criado_em,
      r.atualizado_em,
      r.excluido,
      JSON.stringify(r._ts),
      JSON.stringify(sync),
      agora,
      ...camposDado.map(c => paraBanco(colunas[c], dados[c])),
    ];
    await tx.execute({
      sql: `INSERT INTO ${tabela} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      args: args as InValue[],
    });
    return {};
  }

  if (String(atual.organizacao_id) !== sessao.org) return { recusado: true };

  const tsServ = lerJson(atual.campos_ts);
  const syncServ = lerJson(atual.campos_sync);
  const novosTs = { ...tsServ };
  const novosSync = { ...syncServ };
  const sets: Record<string, unknown> = {};
  const disputados: string[] = [];
  const atualWire = linhaParaWire(tabela, atual);

  for (const campo of [...Object.keys(colunas), ...CAMPOS_CONTROLE_MESCLADOS]) {
    const tCli = r._ts[campo] ?? 0;
    const tSrv = tsServ[campo] ?? 0;
    const valorCli = dados[campo];
    const valorSrv = atualWire[campo];
    const outroGravouDepois = (syncServ[campo] ?? 0) > desde;
    if (r._alterados.includes(campo) && outroGravouDepois && !igual(valorCli, valorSrv)) disputados.push(campo);
    if (tCli > tSrv) {
      sets[campo] = campo === 'excluido' ? (valorCli ? 1 : 0) : paraBanco(colunas[campo], valorCli);
      novosTs[campo] = tCli;
      novosSync[campo] = agora;
    }
  }

  const camposSet = Object.keys(sets);
  if (camposSet.length) {
    await tx.execute({
      sql: `UPDATE ${tabela} SET ${camposSet.map(c => `${c} = ?`).join(', ')},
              campos_ts = ?, campos_sync = ?, atualizado_em = MAX(atualizado_em, ?), sincronizado_em = ?
            WHERE id = ?`,
      args: [
        ...camposSet.map(c => sets[c]),
        JSON.stringify(novosTs),
        JSON.stringify(novosSync),
        r.atualizado_em,
        agora,
        r.id,
      ] as InValue[],
    });
  }
  return disputados.length ? { conflito: disputados } : {};
}

/** Processa um pedido de sincronização: grava o que veio e devolve o que mudou. */
export async function processarSync(db: Client, sessao: SessaoSync, corpo: unknown): Promise<RespostaSync> {
  const pedido = pedidoSync.parse(corpo);
  const conflitos: ConflitoSync[] = [];
  const recusados: RespostaSync['recusados'] = [];

  const tx = await db.transaction('write');
  try {
    const agora = carimbo();
    for (const tabela of TABELAS) {
      for (const r of pedido.mudancas[tabela] ?? []) {
        if (sessao.papel === 'leitura') {
          recusados.push({ tabela, id: r.id });
          continue;
        }
        const res = await gravarRegistro(tx, tabela, r, sessao, pedido.desde, agora);
        if (res.recusado) recusados.push({ tabela, id: r.id });
        if (res.conflito) conflitos.push({ tabela, id: r.id, campos: res.conflito });
      }
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }

  const desde = Math.max(0, pedido.desde - SOBREPOSICAO_MS);
  const registros = {} as RespostaSync['registros'];
  let cursor = pedido.desde;
  for (const tabela of TABELAS) {
    const { rows } = await db.execute({
      sql: `SELECT * FROM ${tabela} WHERE organizacao_id = ? AND sincronizado_em > ? ORDER BY sincronizado_em`,
      args: [sessao.org, desde],
    });
    registros[tabela] = rows.map(row => linhaParaWire(tabela, row));
    for (const row of rows) cursor = Math.max(cursor, Number(row.sincronizado_em));
  }

  return { cursor, registros, conflitos, recusados };
}
