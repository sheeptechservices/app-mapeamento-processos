import { ZodError } from 'zod';
import { sessaoAtual } from '@/lib/servidor/sessao';
import { processarSync } from '@/lib/servidor/sync';
import { turso } from '@/lib/servidor/turso';
import { papelAtual } from '@/lib/servidor/usuarios';

export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return Response.json({ erro: 'sem sessão' }, { status: 401 });

  // Papel lido do banco a cada sincronização: tirar o acesso vale na hora, sem esperar novo login.
  const papel = await papelAtual(sessao.uid);
  if (!papel) return Response.json({ erro: 'sem acesso' }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  try {
    const resposta = await processarSync(turso(), { org: sessao.org, uid: sessao.uid, papel }, corpo);
    return Response.json(resposta);
  } catch (e) {
    if (e instanceof ZodError) return Response.json({ erro: 'pedido inválido' }, { status: 400 });
    // Sem conteúdo de cliente no log: só o tipo do erro.
    console.error('[sync] falhou:', (e as Error).name, (e as Error).message.slice(0, 200));
    return Response.json({ erro: 'falha ao sincronizar' }, { status: 500 });
  }
}
