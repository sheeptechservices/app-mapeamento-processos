'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { MODO_ESCURO_LIBERADO } from '@/lib/tema-config';

export type PreferenciaTema = 'claro' | 'escuro' | 'sistema';

// Preferência guardada no aparelho; o atributo data-theme do <html> é o que
// pinta (o script do layout aplica antes da primeira pintura).
const ouvintes = new Set<() => void>();

function lerPreferencia(): PreferenciaTema {
  try {
    const t = localStorage.getItem('tema');
    return t === 'claro' || t === 'escuro' ? t : 'sistema';
  } catch {
    return 'sistema';
  }
}

function aplicar(p: PreferenciaTema) {
  const escuro = MODO_ESCURO_LIBERADO && (p === 'escuro' || (p === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches));
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
}

export function definirTema(p: PreferenciaTema) {
  try {
    localStorage.setItem('tema', p);
  } catch {
    /* navegação privada: vale só nesta sessão */
  }
  aplicar(p);
  ouvintes.forEach(o => o());
}

function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

export function usePreferenciaTema() {
  return useSyncExternalStore(assinar, lerPreferencia, () => 'sistema' as PreferenciaTema);
}

/** Com "sistema", acompanha a troca de tema do aparelho em tempo real. */
export function SeguirTemaDoSistema() {
  const p = usePreferenciaTema();
  useEffect(() => {
    if (!MODO_ESCURO_LIBERADO || p !== 'sistema') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const mudou = () => aplicar('sistema');
    mq.addEventListener('change', mudou);
    return () => mq.removeEventListener('change', mudou);
  }, [p]);
  return null;
}
