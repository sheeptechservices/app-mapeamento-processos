import { sessaoAtual } from '@/lib/servidor/sessao';
import { papelAtual } from '@/lib/servidor/usuarios';

export async function GET() {
  const s = await sessaoAtual();
  if (!s) return Response.json({ erro: 'sem sessão' }, { status: 401 });
  // O papel vem do banco: o admin pode ter mudado depois do login.
  const papel = await papelAtual(s.uid);
  if (!papel) return Response.json({ erro: 'sem acesso' }, { status: 401 });
  return Response.json({ usuario: { uid: s.uid, email: s.email, nome: s.nome, foto: s.foto, org: s.org, papel } });
}
