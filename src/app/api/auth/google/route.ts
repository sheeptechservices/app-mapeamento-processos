import { verificarIdTokenGoogle } from '@/lib/servidor/google';
import { gravarCookieSessao } from '@/lib/servidor/sessao';
import { upsertUsuario } from '@/lib/servidor/usuarios';

export async function POST(req: Request) {
  const { credential } = (await req.json().catch(() => ({}))) as { credential?: string };
  try {
    const conta = await verificarIdTokenGoogle(credential ?? '');
    const usuario = await upsertUsuario(conta);
    await gravarCookieSessao(usuario);
    return Response.json({ usuario });
  } catch (e) {
    // O motivo fica no log do servidor; quem tentou entrar só sabe que não deu.
    console.warn('[auth/google] recusado:', (e as Error).message);
    return Response.json({ erro: 'Não foi possível entrar com esta conta.' }, { status: 401 });
  }
}
