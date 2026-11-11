import 'server-only';
import { createClient, type Client } from '@libsql/client';

let cliente: Client | null = null;

/** Cliente do Turso. Em desenvolvimento, sem variável, usa o arquivo local.db. */
export function turso(): Client {
  if (!cliente) {
    const url = process.env.TURSO_DATABASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'file:local.db');
    if (!url) throw new Error('TURSO_DATABASE_URL não configurado');
    cliente = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return cliente;
}
