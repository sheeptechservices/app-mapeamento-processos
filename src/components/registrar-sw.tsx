'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (só no build de produção: no `next dev` ele
 * atrapalharia o recarregamento a quente). `avisarLogin` pede um novo
 * pré-cache, porque antes do login as páginas redirecionam para /entrar.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register(`/sw.js?v=${process.env.NEXT_PUBLIC_VERSAO ?? 'local'}`, { scope: '/' })
      .catch(() => {
        /* navegador sem suporte ou modo privado: o app segue online */
      });
  }, []);
  return null;
}

export function pedirPreCache() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({ tipo: 'pre-cachear' }));
}
