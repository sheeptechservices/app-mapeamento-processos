'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { definirAutor } from '@/lib/local/repo';
import { apagarBancoLocal } from '@/lib/local/banco';
import { pedirPreCache } from '@/components/registrar-sw';
import { estadoSync, iniciarSincronizacao, sincronizar } from '@/lib/local/sync';

export interface Usuario {
  uid: string;
  email: string;
  nome: string;
  foto: string | null;
  org: string;
  papel: 'admin' | 'consultor' | 'leitura';
}

const CHAVE = 'sl_usuario';
const Contexto = createContext<{ usuario: Usuario | null; sair: () => void }>({ usuario: null, sair: () => {} });

// O usuário fica guardado no aparelho para o app abrir sem rede no meio da
// visita. Esta é a loja dele: lida uma vez do localStorage, atualizada pela
// conferência com o servidor.
let atual: Usuario | null | undefined;
const ouvintes = new Set<() => void>();

function lerGuardado(): Usuario | null {
  if (atual !== undefined) return atual;
  try {
    const t = localStorage.getItem(CHAVE);
    atual = t ? (JSON.parse(t) as Usuario) : null;
  } catch {
    atual = null;
  }
  if (atual) definirAutor({ organizacao_id: atual.org, usuario_id: atual.uid });
  return atual;
}

function guardar(u: Usuario | null) {
  atual = u;
  try {
    if (u) localStorage.setItem(CHAVE, JSON.stringify(u));
    else localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  if (u) definirAutor({ organizacao_id: u.org, usuario_id: u.uid });
  ouvintes.forEach(o => o());
}

function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const usuario = useSyncExternalStore(assinar, lerGuardado, () => null);

  // A sincronização com o servidor anda enquanto houver alguém na sessão.
  useEffect(() => iniciarSincronizacao(), []);

  // Com rede, a sessão é conferida no servidor; sem rede, segue a guardada.
  useEffect(() => {
    fetch('/api/eu')
      .then(async r => {
        if (r.status === 401) {
          guardar(null);
          router.replace(`/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`);
          return;
        }
        if (r.ok) {
          guardar(((await r.json()) as { usuario: Usuario }).usuario);
          // Com sessão válida as páginas param de redirecionar: hora de guardar a cópia offline.
          pedirPreCache();
        }
      })
      .catch(() => {});
  }, [router]);

  const sair = useCallback(async () => {
    // Dado de cliente não fica no aparelho depois da saída (LGPD). Só apaga se
    // tudo chegou ao servidor; com algo pendente (sem rede), o banco local fica
    // para não perder o que foi registrado.
    await sincronizar();
    if (estadoSync().pendentes === 0) await apagarBancoLocal();
    guardar(null);
    await fetch('/api/auth/sair', { method: 'POST' }).catch(() => null);
    router.replace('/entrar');
  }, [router]);

  return <Contexto.Provider value={{ usuario, sair }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  return useContext(Contexto);
}
