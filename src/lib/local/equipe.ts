'use client';

// Quem é quem na equipe Sheep (para os avatares de responsáveis). Vem de
// /api/equipe e fica guardado no aparelho para aparecer também offline.
import { useEffect, useSyncExternalStore } from 'react';

export interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  foto: string | null;
  papel: 'admin' | 'consultor' | 'leitura';
  ativo: boolean;
}

const CHAVE = 'sl_equipe';
let atual: MembroEquipe[] | null = null;
const ouvintes = new Set<() => void>();

function ler(): MembroEquipe[] {
  if (atual) return atual;
  try {
    atual = JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as MembroEquipe[];
  } catch {
    atual = [];
  }
  return atual;
}

function guardar(lista: MembroEquipe[]) {
  atual = lista;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: vale nesta sessão */
  }
  ouvintes.forEach(o => o());
}

let buscando: Promise<void> | null = null;
export function recarregarEquipe() {
  buscando ??= fetch('/api/equipe')
    .then(r => (r.ok ? (r.json() as Promise<{ equipe: MembroEquipe[] }>) : null))
    .then(d => {
      if (d) guardar(d.equipe);
    })
    .catch(() => {})
    .finally(() => {
      buscando = null;
    });
  return buscando;
}

const VAZIA: MembroEquipe[] = [];

export function useEquipe() {
  const lista = useSyncExternalStore(
    o => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    ler,
    () => VAZIA,
  );
  useEffect(() => {
    void recarregarEquipe();
  }, []);
  return lista;
}
