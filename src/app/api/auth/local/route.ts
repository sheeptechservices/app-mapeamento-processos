import { gravarCookieSessao, modoLocalPermitido } from '@/lib/servidor/sessao';
import { upsertUsuario } from '@/lib/servidor/usuarios';

// Entrada sem Google, só em desenvolvimento e enquanto o Client ID não foi
// configurado. Em produção esta rota responde 404.
export async function POST() {
  if (!modoLocalPermitido()) return new Response(null, { status: 404 });
  const usuario = await upsertUsuario({ email: 'consultor.local@sheep.dev', nome: 'Consultor local', foto: null });
  await gravarCookieSessao({ ...usuario, papel: 'admin' });
  return Response.json({ usuario });
}
