'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconAlerta } from '@/components/icons';

interface GoogleId {
  initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function Entrar({ clientId, modoLocal, aberto }: { clientId: string; modoLocal: boolean; aberto?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const alvo = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const destino = params.get('voltar')?.startsWith('/') ? params.get('voltar')! : '/';

  useEffect(() => {
    if (!clientId || !alvo.current) return;
    const desenhar = () => {
      const g = window.google?.accounts.id;
      if (!g || !alvo.current) return;
      g.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setEntrando(true);
          setErro(null);
          const r = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          }).catch(() => null);
          if (r?.ok) return router.replace(destino);
          setEntrando(false);
          setErro(r ? 'Esta conta não tem acesso. Use o e-mail da Sheep.' : 'Sem conexão. Tente de novo quando a rede voltar.');
        },
      });
      g.renderButton(alvo.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 320, locale: 'pt-BR' });
    };
    if (window.google) return desenhar();
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = desenhar;
    s.onerror = () => setErro('Não foi possível carregar o login do Google.');
    document.head.appendChild(s);
  }, [clientId, destino, router]);

  // Acesso aberto: entra sozinho, sem tela de login.
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    fetch('/api/auth/local', { method: 'POST' })
      .then(r => {
        if (!vivo) return;
        if (r.ok) router.replace(destino);
        else setErro('Não foi possível abrir o app. Recarregue a página.');
      })
      .catch(() => vivo && setErro('Sem conexão. Tente de novo quando a rede voltar.'));
    return () => {
      vivo = false;
    };
  }, [aberto, destino, router]);

  const entrarLocal = async () => {
    setEntrando(true);
    const r = await fetch('/api/auth/local', { method: 'POST' }).catch(() => null);
    if (r?.ok) return router.replace(destino);
    setEntrando(false);
    setErro('Não foi possível entrar no modo local.');
  };

  return (
    <div className="space-y-4">
      {aberto && !erro ? (
        <div className="flex min-h-[52px] justify-center">
          <span className="spinner" />
        </div>
      ) : aberto ? null : clientId ? (
        <div className="flex min-h-[44px] justify-center">
          {entrando ? <span className="spinner" /> : <div ref={alvo} />}
        </div>
      ) : modoLocal ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={entrarLocal}
            disabled={entrando}
            className="foco inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-pilula bg-white text-[15px] font-semibold text-[#0e0e0f] transition-[transform,opacity] hover:-translate-y-px disabled:opacity-60"
          >
            {entrando && <span className="spinner sm" />}
            Entrar em modo local
          </button>
          <p className="text-xs leading-relaxed text-white/50">
            Modo de desenvolvimento: o login com Google entra quando o NEXT_PUBLIC_GOOGLE_CLIENT_ID for configurado.
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/60">Login não configurado neste ambiente.</p>
      )}
      {erro && (
        <p role="alert" className="entra flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 text-left text-sm text-white">
          <IconAlerta size={18} className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
