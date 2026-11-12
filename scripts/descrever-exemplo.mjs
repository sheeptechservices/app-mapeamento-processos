// Preenche a Descrição dos processos do cliente fictício que estão sem ela,
// no formato da sincronização (carimbo do campo e cursor), para os aparelhos puxarem.
//   node --env-file=.env.local scripts/descrever-exemplo.mjs
import { createClient } from '@libsql/client';
import { descricaoDe } from './exemplo-descricoes.mjs';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const NOME = 'Exemplo - Atacadista Vale do Ivaí';

const cliente = (await db.execute({ sql: 'SELECT id FROM clientes WHERE nome = ? AND excluido = 0', args: [NOME] })).rows[0];
if (!cliente) {
  console.log('Cliente fictício não encontrado.');
  process.exit(0);
}
const procs = (
  await db.execute({
    sql: "SELECT id, titulo, campos_ts, campos_sync FROM processos WHERE cliente_id = ? AND excluido = 0 AND (descricao IS NULL OR descricao = '')",
    args: [cliente.id],
  })
).rows;

const agora = Date.now();
const lote = [];
let semModelo = 0;
procs.forEach((p, i) => {
  const d = descricaoDe(String(p.titulo));
  if (!d) {
    semModelo++;
    return;
  }
  const t = agora + i;
  const ts = { ...JSON.parse(String(p.campos_ts || '{}')), descricao: t };
  const sync = { ...JSON.parse(String(p.campos_sync || '{}')), descricao: t };
  lote.push({
    sql: 'UPDATE processos SET descricao = ?, campos_ts = ?, campos_sync = ?, atualizado_em = ?, sincronizado_em = ? WHERE id = ?',
    args: [d, JSON.stringify(ts), JSON.stringify(sync), t, t, p.id],
  });
});
for (let i = 0; i < lote.length; i += 60) await db.batch(lote.slice(i, i + 60), 'write');
console.log(`Descrição preenchida em ${lote.length} processos${semModelo ? ` (${semModelo} sem modelo)` : ''}.`);
