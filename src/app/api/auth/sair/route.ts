import { apagarCookieSessao } from '@/lib/servidor/sessao';

export async function POST() {
  await apagarCookieSessao();
  return new Response(null, { status: 204 });
}
