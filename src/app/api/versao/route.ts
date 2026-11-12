import { connection } from 'next/server';

/**
 * Versão do app que está no ar (uma por deploy, de NEXT_PUBLIC_VERSAO no build).
 * O app aberto compara com a versão dele para avisar que há atualização.
 * Sempre da hora: nada de cache no servidor nem no navegador.
 */
export async function GET() {
  await connection();
  return Response.json({ versao: process.env.NEXT_PUBLIC_VERSAO ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
