import { z } from 'zod';
import { sessaoAtual } from '@/lib/servidor/sessao';
import { atualizarMembro, ErroEquipe, listarEquipe, papelAtual } from '@/lib/servidor/usuarios';

export async function GET() {
  const s = await sessaoAtual();
  if (!s || !(await papelAtual(s.uid))) return Response.json({ erro: 'sem sessão' }, { status: 401 });
  return Response.json({ equipe: await listarEquipe(s.org) });
}

const pedido = z.object({
  id: z.string().min(1),
  papel: z.enum(['admin', 'consultor', 'leitura']).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const s = await sessaoAtual();
  if (!s) return Response.json({ erro: 'sem sessão' }, { status: 401 });
  // Papel lido do banco: só administrador ativo muda a equipe.
  if ((await papelAtual(s.uid)) !== 'admin') return Response.json({ erro: 'só administradores' }, { status: 403 });
  const corpo = pedido.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: 'pedido inválido' }, { status: 400 });
  try {
    const membro = await atualizarMembro(s.org, corpo.data.id, corpo.data);
    return Response.json({ membro });
  } catch (e) {
    if (e instanceof ErroEquipe) return Response.json({ erro: e.message }, { status: e.status });
    throw e;
  }
}
