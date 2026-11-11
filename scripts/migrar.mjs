// Aplica db/schema.sql no Turso. Sem TURSO_DATABASE_URL usa um arquivo local
// (file:local.db), então dá para rodar em desenvolvimento sem credencial.
//   npm run db:migrar
//
// Idempotente: CREATE TABLE/INDEX IF NOT EXISTS. Coluna nova em tabela que já
// existe entra por ALTER, comparando o schema com o PRAGMA table_info.
import { createClient } from '@libsql/client';
import { readFile } from 'node:fs/promises';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const [tabelas, indices = ''] = sql.split(/\n(?=-- Cursor da sincronização)/);
await db.executeMultiple(tabelas);

// Colunas declaradas no schema que faltam no banco (tabela criada por versão anterior).
for (const bloco of tabelas.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
  const [, tabela, corpo] = bloco;
  const { rows } = await db.execute(`PRAGMA table_info(${tabela})`);
  const existentes = new Set(rows.map(r => String(r.name)));
  for (const linha of corpo.split('\n')) {
    const def = linha.replace(/--.*$/, '').trim().replace(/,$/, '');
    const nome = def.split(/\s+/)[0];
    if (!nome || existentes.has(nome) || /PRIMARY KEY|NOT NULL REFERENCES/.test(def)) continue;
    // SQLite só aceita ADD COLUMN NOT NULL com DEFAULT.
    if (/NOT NULL/.test(def) && !/DEFAULT/.test(def)) continue;
    await db.execute(`ALTER TABLE ${tabela} ADD COLUMN ${def}`);
  }
}
await db.executeMultiple(indices);

await db.execute({
  sql: `INSERT OR IGNORE INTO organizacoes (id, nome, criado_em) VALUES ('sheep', 'Sheep Technology', ?)`,
  args: [Date.now()],
});

const { rows } = await db.execute(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`);
console.log(`Schema aplicado em ${url.startsWith('file:') ? url : 'Turso remoto'}: ${rows.map(r => r.name).join(', ')}`);
