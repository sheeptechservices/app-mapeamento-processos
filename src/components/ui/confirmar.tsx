'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertDialog } from 'radix-ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { conferirSenha } from '@/lib/senha-exclusao';

/**
 * Confirmação de exclusão: diálogo centralizado, botão de excluir em vermelho.
 * Nunca window.confirm. Com `pedirSenha` (cliente e sessão, que apagam em
 * cascata), só exclui com a senha de exclusão (`lib/senha-exclusao.ts`).
 */
export function Confirmar({
  aberto,
  aoFechar,
  titulo,
  texto,
  rotuloConfirmar = 'Excluir',
  aoConfirmar,
  pedirSenha,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  texto: ReactNode;
  rotuloConfirmar?: string;
  aoConfirmar: () => void;
  pedirSenha?: boolean;
}) {
  const reduzido = useReducedMotion();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [conferindo, setConferindo] = useState(false);

  // Cada vez que abre, começa sem senha e sem erro.
  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    setSenha('');
    setErro(null);
    setConferindo(false);
  }

  const confirmarComSenha = async (e: FormEvent) => {
    e.preventDefault();
    if (!senha || conferindo) return;
    if (!globalThis.crypto?.subtle) {
      setErro('Abra o sistema pelo endereço seguro (https) para excluir.');
      return;
    }
    setConferindo(true);
    const certa = await conferirSenha(senha);
    setConferindo(false);
    if (!certa) {
      setErro('Senha incorreta.');
      setTentativa(t => t + 1);
      setSenha('');
      return;
    }
    aoFechar();
    aoConfirmar();
  };
  return (
    <AlertDialog.Root open={aberto} onOpenChange={a => !a && aoFechar()}>
      <AnimatePresence>
        {aberto && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-[var(--veu)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduzido ? 0 : 0.16 }}
              />
            </AlertDialog.Overlay>
            <AlertDialog.Content asChild forceMount>
              <motion.div
                initial={reduzido ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                className="fixed top-1/2 left-1/2 z-[60] w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[22px] bg-superficie p-6 shadow-painel"
              >
                <AlertDialog.Title className="text-lg font-semibold tracking-tight">{titulo}</AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-tinta-2">{texto}</AlertDialog.Description>
                {pedirSenha ? (
                  <form onSubmit={confirmarComSenha} className="mt-5">
                    <label className="block">
                      <span className="text-[13px] font-semibold text-tinta-2">Senha de exclusão</span>
                      <input
                        key={tentativa}
                        type="password"
                        autoFocus
                        autoComplete="off"
                        value={senha}
                        onChange={e => {
                          setSenha(e.target.value);
                          setErro(null);
                        }}
                        aria-invalid={!!erro}
                        aria-describedby={erro ? 'erro-senha-exclusao' : undefined}
                        className={cn('campo mt-1.5', erro && '!border-risco', tentativa > 0 && 'treme-campo')}
                      />
                    </label>
                    {erro && (
                      <p id="erro-senha-exclusao" role="alert" className="entra mt-2 text-[13px] font-medium text-risco">
                        {erro}
                      </p>
                    )}
                    <div className="mt-6 flex gap-2">
                      <AlertDialog.Cancel
                        type="button"
                        className="foco min-h-11 flex-1 rounded-pilula border border-borda-forte text-[14px] font-semibold transition-colors hover:bg-sutil"
                      >
                        Cancelar
                      </AlertDialog.Cancel>
                      <button
                        type="submit"
                        disabled={!senha || conferindo}
                        className="foco inline-flex min-h-11 flex-1 items-center justify-center rounded-pilula bg-risco text-[14px] font-semibold text-white transition-[filter,translate,scale,opacity] hover:-translate-y-px hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                      >
                        {conferindo ? <span className="spinner sm" /> : rotuloConfirmar}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 flex gap-2">
                    <AlertDialog.Cancel className="foco min-h-11 flex-1 rounded-pilula border border-borda-forte text-[14px] font-semibold transition-colors hover:bg-sutil">
                      Cancelar
                    </AlertDialog.Cancel>
                    <AlertDialog.Action
                      onClick={aoConfirmar}
                      className="foco min-h-11 flex-1 rounded-pilula bg-risco text-[14px] font-semibold text-white transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
                    >
                      {rotuloConfirmar}
                    </AlertDialog.Action>
                  </div>
                )}
              </motion.div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
