import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { conferirSenha, SENHA_EXCLUSAO } from './senha-exclusao';

// Hash de teste gerado aqui mesmo: a senha real nunca fica no repositório.
const sal = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const alvo = {
  sal,
  hash: pbkdf2Sync('Terra-Boa#2026', Buffer.from(sal, 'hex'), 1000, 32, 'sha256').toString('hex'),
  iteracoes: 1000,
};

describe('conferirSenha', () => {
  it('aceita a senha certa', async () => {
    expect(await conferirSenha('Terra-Boa#2026', alvo)).toBe(true);
  });

  it('recusa senha errada, vazia ou com espaço a mais', async () => {
    expect(await conferirSenha('terra-boa#2026', alvo)).toBe(false);
    expect(await conferirSenha('', alvo)).toBe(false);
    expect(await conferirSenha('Terra-Boa#2026 ', alvo)).toBe(false);
  });

  it('a senha de exclusão do sistema está guardada só como hash', () => {
    expect(SENHA_EXCLUSAO.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(SENHA_EXCLUSAO.sal).toMatch(/^[0-9a-f]{32}$/);
  });
});
