'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useSyncExternalStore } from 'react';
import { IconAtualizar } from '@/components/icons';
import { estiloBotao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/confirmar';
import { cn } from '@/lib/cn';
import { haNovaVersao, VERSAO_ATUAL } from '@/lib/versao';

/**
 * Atualização do app sem atrapalhar quem está preenchendo: quando sai um deploy
 * novo, aparece um aviso no canto. "Depois" recolhe o aviso num botão do topo
 * (a pessoa termina o que está fazendo e atualiza quando quiser); "Atualizar"
 * pede confirmação, porque recarregar fecha o que estiver aberto.
 *
 * O aviso fica fora dos painéis (Radix Dialog). Para clicar nele com um painel
 * aberto sem fechar o painel, os diálogos ignoram toques em `[data-aviso-versao]`
 * (ver `tocouNoAvisoDeVersao`).
 */

const INTERVALO = 60_000;

type Estado = { noAr: string | null; adiadaPara: string | null; confirmando: boolean };
let estado: Estado = { noAr: null, adiadaPara: null, confirmando: false };
const ouvintes = new Set<() => void>();
function mudar(parte: Partial<Estado>) {
  estado = { ...estado, ...parte };
  ouvintes.forEach(o => o());
}
function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}
const ler = () => estado;
const lerNoServidor = () => estado;

function useVersao() {
  const e = useSyncExternalStore(assinar, ler, lerNoServidor);
  const nova = e.noAr != null;
  return { ...e, nova, recolhida: nova && e.adiadaPara === e.noAr };
}

/** Os diálogos chamam isto no onPointerDownOutside/onInteractOutside para não fecharem ao tocar no aviso. */
export function tocouNoAvisoDeVersao(e: { target: EventTarget | null; preventDefault: () => void }) {
  if (e.target instanceof Element && e.target.closest('[data-aviso-versao]')) e.preventDefault();
}

async function conferir() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const r = await fetch('/api/versao', { cache: 'no-store' });
    if (!r.ok) return;
    const { versao } = (await r.json()) as { versao?: unknown };
    if (haNovaVersao(VERSAO_ATUAL, versao) && versao !== estado.noAr) mudar({ noAr: versao });
  } catch {
    /* sem rede: confere de novo depois */
  }
}

function atualizarAgora() {
  // Recarregar busca a página nova (o service worker vai à rede primeiro). Os
  // rascunhos de cadastro são gravados no aparelho no pagehide (useFormulario).
  window.location.reload();
}

/** Confere a versão no ar a cada minuto e quando o app volta ao primeiro plano ou à rede. */
function useVigiarVersao() {
  useEffect(() => {
    void conferir();
    const id = window.setInterval(conferir, INTERVALO);
    const aoVoltar = () => document.visibilityState === 'visible' && void conferir();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    window.addEventListener('online', aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, []);
}

/** Aviso flutuante (canto de baixo) + a confirmação. Montado uma vez, na casca. */
export function AvisoVersao() {
  useVigiarVersao();
  const { nova, recolhida, confirmando, noAr } = useVersao();
  const reduzido = useReducedMotion();
  const visivel = nova && !recolhida;

  return (
    <>
      <AnimatePresence>
        {visivel && (
          <motion.div
            data-aviso-versao=""
            role="status"
            aria-live="polite"
            initial={reduzido ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduzido ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={reduzido ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
            className="pointer-events-auto fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[55] mx-auto max-w-[400px] rounded-[22px] border border-borda bg-superficie p-4 shadow-painel tablet:right-6 tablet:bottom-6 tablet:left-auto tablet:mx-0 tablet:w-[380px]"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-pilula bg-verde text-sobre-verde">
                <IconAtualizar size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Nova versão do app</p>
                <p className="mt-0.5 text-[13px] leading-snug text-tinta-2">
                  Termine o que está fazendo e atualize quando quiser. Nada muda até você atualizar.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => mudar({ adiadaPara: noAr })}
                className={cn(estiloBotao({ variante: 'secundario' }), 'flex-1')}
              >
                Depois
              </button>
              <button
                type="button"
                onClick={() => mudar({ confirmando: true })}
                className={cn(estiloBotao({ variante: 'primario' }), 'flex-1')}
              >
                <IconAtualizar size={17} /> Atualizar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Confirmar
        aberto={confirmando}
        aoFechar={() => mudar({ confirmando: false })}
        titulo="Atualizar agora?"
        texto="O app vai recarregar e fechar o que estiver aberto. O que você estiver preenchendo e ainda não salvou pode se perder. Se estiver no meio de um cadastro, salve antes."
        rotuloConfirmar="Atualizar agora"
        neutro
        aoConfirmar={atualizarAgora}
      />
    </>
  );
}

/** Botão do topo depois de "Depois": a atualização continua à mão, sem atrapalhar. */
export function BotaoAtualizarVersao() {
  const { recolhida } = useVersao();
  if (!recolhida) return null;
  return (
    <button
      type="button"
      data-aviso-versao=""
      title="Há uma versão nova do app"
      onClick={() => mudar({ confirmando: true })}
      className="foco aperta entra pointer-events-auto relative inline-flex h-10 shrink-0 items-center gap-2 rounded-pilula bg-tinta px-3.5 text-[13px] font-semibold text-sobre-tinta transition-transform hover:-translate-y-px"
    >
      <IconAtualizar size={16} />
      <span className="max-tablet:sr-only">Atualizar</span>
      <span aria-hidden="true" className="ponto-vivo absolute top-0 right-0.5" />
    </button>
  );
}
