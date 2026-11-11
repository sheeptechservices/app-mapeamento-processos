import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Papel } from './sessao';
import { turso } from './turso';

const ORG_PADRAO = 'sheep';

/** Cria o usuário no primeiro acesso e atualiza nome/foto nos seguintes. */
export async function upsertUsuario(conta: { email: string; nome: string; foto: string | null }) {
  const db = turso();
  const agora = Date.now();
  await db.execute({
    sql: `INSERT OR IGNORE INTO organizacoes (id, nome, criado_em) VALUES (?, 'Sheep Technology', ?)`,
    args: [ORG_PADRAO, agora],
  });
  // O primeiro usuário da organização e os e-mails de ADMIN_GOOGLE_EMAILS nascem admin;
  // os demais nascem consultor e o admin ajusta o papel em Ajustes > Equipe.
  const { rows: contagem } = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM usuarios WHERE organizacao_id = ?',
    args: [ORG_PADRAO],
  });
  const admins = (process.env.ADMIN_GOOGLE_EMAILS ?? '').toLowerCase().split(',').map(e => e.trim());
  const papelInicial = Number(contagem[0]?.n ?? 0) === 0 || admins.includes(conta.email) ? 'admin' : 'consultor';
  await db.execute({
    sql: `INSERT INTO usuarios (id, organizacao_id, email, nome, foto, papel, criado_em, ultimo_acesso)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET nome = excluded.nome,
            foto = COALESCE(excluded.foto, usuarios.foto), ultimo_acesso = excluded.ultimo_acesso`,
    args: [randomUUID(), ORG_PADRAO, conta.email, conta.nome, conta.foto, papelInicial, agora, agora],
  });
  const { rows } = await db.execute({
    sql: `SELECT id, organizacao_id, email, nome, foto, papel, ativo FROM usuarios WHERE email = ?`,
    args: [conta.email],
  });
  const u = rows[0];
  if (!u || !u.ativo) throw new Error('usuário inativo');
  return {
    uid: String(u.id),
    org: String(u.organizacao_id),
    email: String(u.email),
    nome: String(u.nome),
    foto: u.foto ? String(u.foto) : null,
    papel: lerPapel(u.papel),
  };
}

function lerPapel(v: unknown): Papel {
  return v === 'admin' || v === 'leitura' ? v : 'consultor';
}

/** Papel atual do usuário no banco (o do cookie pode estar velho). null = inativo ou inexistente. */
export async function papelAtual(uid: string): Promise<Papel | null> {
  const { rows } = await turso().execute({ sql: 'SELECT papel, ativo FROM usuarios WHERE id = ?', args: [uid] });
  const u = rows[0];
  return u && Number(u.ativo) === 1 ? lerPapel(u.papel) : null;
}

export interface Membro {
  id: string;
  nome: string;
  email: string;
  foto: string | null;
  papel: Papel;
  ativo: boolean;
  ultimo_acesso: number | null;
}

export async function listarEquipe(org: string): Promise<Membro[]> {
  const { rows } = await turso().execute({
    sql: `SELECT id, nome, email, foto, papel, ativo, ultimo_acesso FROM usuarios
          WHERE organizacao_id = ? ORDER BY ativo DESC, nome`,
    args: [org],
  });
  return rows.map(r => ({
    id: String(r.id),
    nome: String(r.nome),
    email: String(r.email),
    foto: r.foto ? String(r.foto) : null,
    papel: lerPapel(r.papel),
    ativo: Number(r.ativo) === 1,
    ultimo_acesso: r.ultimo_acesso == null ? null : Number(r.ultimo_acesso),
  }));
}

/**
 * Muda papel ou ativação de alguém da mesma organização. A organização nunca
 * fica sem administrador ativo.
 */
export async function atualizarMembro(org: string, id: string, mudanca: { papel?: Papel; ativo?: boolean }) {
  const equipe = await listarEquipe(org);
  const alvo = equipe.find(m => m.id === id);
  if (!alvo) throw new ErroEquipe('membro não encontrado', 404);
  const depois = { ...alvo, ...mudanca };
  const adminsDepois = equipe.map(m => (m.id === id ? depois : m)).filter(m => m.papel === 'admin' && m.ativo).length;
  if (adminsDepois === 0) throw new ErroEquipe('A organização precisa de pelo menos um administrador ativo.', 409);
  await turso().execute({
    sql: 'UPDATE usuarios SET papel = ?, ativo = ? WHERE id = ? AND organizacao_id = ?',
    args: [depois.papel, depois.ativo ? 1 : 0, id, org],
  });
  return depois;
}

export class ErroEquipe extends Error {
  constructor(
    mensagem: string,
    public status: number,
  ) {
    super(mensagem);
  }
}
