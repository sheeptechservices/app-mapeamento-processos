// Senha para excluir cliente ou sessão de mapeamento (exclusões em cascata, que
// levam processos junto). O código guarda só o hash (PBKDF2-SHA256 com sal),
// nunca a senha. A conferência é no aparelho, para funcionar offline: é uma
// trava contra exclusão por engano ou por quem não deve, não uma criptografia.
//
// Para trocar a senha, gere sal e hash novos (mesmos parâmetros) e substitua aqui:
//   SENHA='nova' node -e "const c=require('node:crypto');const s=c.randomBytes(16);
//   console.log(s.toString('hex'), c.pbkdf2Sync(process.env.SENHA,s,210000,32,'sha256').toString('hex'))"

export interface HashSenha {
  sal: string;
  hash: string;
  iteracoes: number;
}

export const SENHA_EXCLUSAO: HashSenha = {
  sal: '9e21754b71d373dfa19f07abb7d8d096',
  hash: 'cdb0ca064e7a581ab5dee6c65b21f8d936252ccc8560f1e5cea4614a54eb4f5d',
  iteracoes: 210_000,
};

const deHex = (h: string) => new Uint8Array(h.match(/../g)!.map(b => parseInt(b, 16)));
const paraHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

/** Confere a senha digitada contra o hash (WebCrypto: navegador e Node). */
export async function conferirSenha(senha: string, alvo: HashSenha = SENHA_EXCLUSAO): Promise<boolean> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(alvo.sal), iterations: alvo.iteracoes },
    chave,
    256,
  );
  // Comparação em tempo constante.
  const a = paraHex(bits);
  let dif = a.length ^ alvo.hash.length;
  for (let i = 0; i < Math.min(a.length, alvo.hash.length); i++) dif |= a.charCodeAt(i) ^ alvo.hash.charCodeAt(i);
  return dif === 0;
}
