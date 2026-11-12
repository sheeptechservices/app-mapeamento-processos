import type { Client } from '@libsql/client';

// Tabelas novas criadas pelo próprio servidor, na primeira sincronização de cada
// instância: comandos idempotentes (IF NOT EXISTS), iguais aos de db/schema.sql.
// Assim um deploy com tabela nova não depende de rodar `npm run db:migrar` antes
// (o glossário entrou num dia em que o Turso não respondia desta máquina).
// Coluna nova em tabela existente continua pelo `db:migrar`.
const COMANDOS = [
  `CREATE TABLE IF NOT EXISTS glossario (
    id              TEXT PRIMARY KEY,
    organizacao_id  TEXT NOT NULL,
    criado_por      TEXT NOT NULL,
    cliente_id      TEXT NOT NULL REFERENCES clientes(id),
    termo           TEXT NOT NULL DEFAULT '',
    definicao       TEXT,
    criado_em       INTEGER NOT NULL,
    atualizado_em   INTEGER NOT NULL,
    excluido        INTEGER NOT NULL DEFAULT 0,
    campos_ts       TEXT NOT NULL DEFAULT '{}',
    campos_sync     TEXT NOT NULL DEFAULT '{}',
    sincronizado_em INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_glossario_cliente ON glossario (cliente_id)',
  'CREATE INDEX IF NOT EXISTS idx_glossario_sync ON glossario (organizacao_id, sincronizado_em)',
];

let pronto: Promise<void> | null = null;

/** Garante as tabelas novas uma vez por instância; se falhar, tenta de novo na próxima chamada. */
export function garantirTabelas(db: Pick<Client, 'batch'>): Promise<void> {
  pronto ??= db
    .batch(COMANDOS, 'write')
    .then(() => undefined)
    .catch(e => {
      pronto = null;
      throw e;
    });
  return pronto;
}
