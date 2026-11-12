// Uma vez só: a primeira versão da tabela anexos tinha CHECK (tipo IN ('foto', 'link')),
// que o SQLite não deixa alterar. Recria a tabela sem a trava, copiando o que já existe.
//   node --env-file=.env.local scripts/recriar-anexos.mjs
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const atual = (await db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'anexos'")).rows[0];
if (!atual || !String(atual.sql).includes('CHECK (tipo')) {
  console.log('Nada a fazer: a tabela anexos já está sem a trava de tipo.');
  process.exit(0);
}
const antes = Number((await db.execute('SELECT COUNT(*) AS n FROM anexos')).rows[0].n);
const colunas =
  'id, organizacao_id, criado_por, processo_id, sessao_id, cliente_id, tipo, url, imagem, descricao, ordem, criado_em, atualizado_em, excluido, campos_ts, campos_sync, sincronizado_em';
await db.batch(
  [
    `CREATE TABLE anexos_novo (
      id              TEXT PRIMARY KEY,
      organizacao_id  TEXT NOT NULL,
      criado_por      TEXT NOT NULL,
      processo_id     TEXT NOT NULL REFERENCES processos(id),
      sessao_id       TEXT NOT NULL,
      cliente_id      TEXT NOT NULL,
      tipo            TEXT NOT NULL DEFAULT 'foto',
      url             TEXT,
      imagem          TEXT,
      descricao       TEXT,
      ordem           INTEGER NOT NULL DEFAULT 0,
      nome            TEXT,
      mime            TEXT,
      tamanho         INTEGER,
      partes          INTEGER,
      criado_em       INTEGER NOT NULL,
      atualizado_em   INTEGER NOT NULL,
      excluido        INTEGER NOT NULL DEFAULT 0,
      campos_ts       TEXT NOT NULL DEFAULT '{}',
      campos_sync     TEXT NOT NULL DEFAULT '{}',
      sincronizado_em INTEGER NOT NULL DEFAULT 0
    )`,
    `INSERT INTO anexos_novo (${colunas}) SELECT ${colunas} FROM anexos`,
    'DROP TABLE anexos',
    'ALTER TABLE anexos_novo RENAME TO anexos',
    'CREATE INDEX IF NOT EXISTS idx_anexos_processo ON anexos (processo_id)',
    'CREATE INDEX IF NOT EXISTS idx_anexos_sync ON anexos (organizacao_id, sincronizado_em)',
  ],
  'write',
);
const depois = Number((await db.execute('SELECT COUNT(*) AS n FROM anexos')).rows[0].n);
console.log(`Tabela anexos recriada sem a trava de tipo: ${antes} registros antes, ${depois} depois.`);
