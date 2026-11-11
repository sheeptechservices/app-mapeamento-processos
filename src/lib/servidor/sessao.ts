import 'server-only';
// Sessão em cookie httpOnly assinado com HMAC. O cookie carrega só o que a
// rota precisa para autorizar (usuário, organização, papel); toda consulta ao
// Turso filtra pela `organizacao_id` daqui - é ela que substitui o RLS.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export type Papel = 'admin' | 'consultor' | 'leitura';

export const COOKIE_SESSAO = 'sl_sessao';
const DURACAO_SEG = 60 * 60 * 24 * 30;

export interface Sessao {
  uid: string;
  email: string;
  nome: string;
  foto: string | null;
  org: string;
  papel: Papel;
  exp: number;
}

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== 'production') return 'desenvolvimento-local-nao-usar-em-producao';
  throw new Error('SESSION_SECRET ausente ou curto (mínimo 32 caracteres)');
}

function assinar(corpo: string) {
  return createHmac('sha256', segredo()).update(corpo).digest('base64url');
}

export function selarSessao(dados: Omit<Sessao, 'exp'>): string {
  const corpo = Buffer.from(JSON.stringify({ ...dados, exp: Math.floor(Date.now() / 1000) + DURACAO_SEG })).toString(
    'base64url',
  );
  return `${corpo}.${assinar(corpo)}`;
}

export function abrirSessao(valor: string | undefined): Sessao | null {
  if (!valor) return null;
  const [corpo, ass] = valor.split('.');
  if (!corpo || !ass) return null;
  const esperado = Buffer.from(assinar(corpo));
  const recebido = Buffer.from(ass);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const s = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as Sessao;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return abrirSessao(jar.get(COOKIE_SESSAO)?.value);
}

export async function gravarCookieSessao(dados: Omit<Sessao, 'exp'>) {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, selarSessao(dados), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_SEG,
  });
}

export async function apagarCookieSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

/**
 * Modo local: sem Client ID do Google, e só em desenvolvimento ou num build de
 * produção rodando na máquina com PERMITIR_MODO_LOCAL=1 (teste do PWA offline).
 * Nunca configure essa variável na Vercel.
 */
export function modoLocalPermitido() {
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return false;
  return process.env.NODE_ENV !== 'production' || process.env.PERMITIR_MODO_LOCAL === '1';
}
