import 'server-only';
// Verificação do ID token do "Entrar com o Google", no mesmo desenho do Portal
// Sheep (api/_google-auth.ts): node:crypto confere a assinatura RS256 com o
// JWKS do Google, sem dependência nova. Nada do token vale antes disso.
import { createPublicKey, createVerify } from 'node:crypto';

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const EMISSORES = ['https://accounts.google.com', 'accounts.google.com'];
const FOLGA_SEG = 60;

interface ChaveJwk extends JsonWebKey {
  kid?: string;
}

let cacheChaves: { chaves: ChaveJwk[]; expira: number } | null = null;

async function chavesGoogle(): Promise<ChaveJwk[]> {
  if (cacheChaves && cacheChaves.expira > Date.now()) return cacheChaves.chaves;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS do Google respondeu ${res.status}`);
  const { keys } = (await res.json()) as { keys: ChaveJwk[] };
  if (!Array.isArray(keys) || !keys.length) throw new Error('JWKS do Google veio vazio');
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1];
  const seg = Math.min(Math.max(Number(maxAge) || 3600, 600), 86400);
  cacheChaves = { chaves: keys, expira: Date.now() + seg * 1000 };
  return keys;
}

function base64url(parte: string): Buffer {
  return Buffer.from(parte.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export interface ContaGoogle {
  email: string;
  nome: string;
  foto: string | null;
}

export function configGoogle() {
  return {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    dominio: (process.env.GOOGLE_ALLOWED_DOMAIN ?? 'sheeptechnology.com').toLowerCase(),
    avulsos: (process.env.ADMIN_GOOGLE_EMAILS ?? '')
      .split(',')
      .map(x => x.trim().toLowerCase())
      .filter(Boolean),
  };
}

/**
 * Devolve a conta quando o token é legítimo e o e-mail pertence ao Workspace da
 * casa (claim `hd`, e não só o sufixo do e-mail) ou está na lista avulsa.
 * Lança em qualquer outro caso; quem chama responde 401 sem detalhar.
 */
export async function verificarIdTokenGoogle(idToken: string): Promise<ContaGoogle> {
  const cfg = configGoogle();
  if (!cfg.clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado');

  const partes = String(idToken ?? '').split('.');
  if (partes.length !== 3) throw new Error('token malformado');
  const [cab64, corpo64, ass64] = partes;

  const cab = JSON.parse(base64url(cab64).toString('utf8')) as { alg?: string; kid?: string };
  if (cab.alg !== 'RS256') throw new Error(`alg inesperado: ${cab.alg}`);
  const jwk = (await chavesGoogle()).find(k => k.kid === cab.kid);
  if (!jwk) throw new Error('kid fora do JWKS');

  const ok = createVerify('RSA-SHA256')
    .update(`${cab64}.${corpo64}`)
    .verify(createPublicKey({ key: jwk as import('node:crypto').JsonWebKey, format: 'jwk' }), base64url(ass64));
  if (!ok) throw new Error('assinatura inválida');

  const corpo = JSON.parse(base64url(corpo64).toString('utf8')) as Record<string, unknown>;
  const agora = Math.floor(Date.now() / 1000);
  if (!EMISSORES.includes(String(corpo.iss))) throw new Error('emissor inesperado');
  if (corpo.aud !== cfg.clientId) throw new Error('audiência inesperada');
  if (typeof corpo.exp !== 'number' || corpo.exp < agora - FOLGA_SEG) throw new Error('token expirado');
  if (corpo.email_verified !== true) throw new Error('e-mail não verificado');

  const email = String(corpo.email ?? '').toLowerCase();
  const hd = String(corpo.hd ?? '').toLowerCase();
  const doDominio = !!cfg.dominio && hd === cfg.dominio && email.endsWith(`@${cfg.dominio}`);
  if (!email || (!doDominio && !cfg.avulsos.includes(email))) throw new Error('e-mail sem acesso');

  const foto = typeof corpo.picture === 'string' && corpo.picture.startsWith('https://') ? corpo.picture : null;
  return { email, nome: String(corpo.name ?? email), foto };
}
