'use client';

// Padrão de sobreposição da v6 (seção 7 do PRD): tudo que cobre uma tela -
// filtros, novo/editar processo, novo/editar cliente, captura com IA - usa este
// componente.
// - Desktop e tablet (>= 620px): painel lateral à direita, 440px, com margem e
//   cantos arredondados, fundo escurecido atrás.
// - Celular: bottom sheet com puxador.
// - Cabeçalho com título centralizado, fechar e voltar (em sub-tela).
// - Sub-telas deslizam para o lado. São declaradas pelo pai a cada render
//   (`subtelas`), então uma lista de escolha aberta mostra sempre o valor atual.
// - Rodapé fixo com dois botões em pílula.
import { tocouNoAvisoDeVersao } from '@/components/aviso-versao';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Dialog } from 'radix-ui';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { IconFechar, IconVoltar } from '@/components/icons';
import { useArrastarParaFechar } from '@/components/ui/arrastar-fechar';
import { cn } from '@/lib/cn';

export interface SubTela {
  titulo: string;
  conteudo: ReactNode;
  rodape?: ReactNode;
}

const ContextoPainel = createContext<{ abrir: (id: string) => void; voltar: () => void } | null>(null);

/** Fora de um painel devolve null (as linhas também servem direto na página). */
export function usePainelOpcional() {
  return useContext(ContextoPainel);
}

/** Dentro do painel: abrir uma sub-tela pelo id, ou voltar uma. */
export function usePainel() {
  const c = useContext(ContextoPainel);
  if (!c) throw new Error('usePainel fora de um Painel');
  return c;
}

function useLargo() {
  const [largo, setLargo] = useState(true);
  useEffect(() => {
    const mq = matchMedia('(min-width: 620px)');
    const aplicar = () => setLargo(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);
  return largo;
}

export function Painel({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape,
  subtelas = {},
  descricao,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  subtelas?: Record<string, SubTela>;
  /** Texto para leitor de tela (aria-describedby). */
  descricao?: string;
}) {
  const largo = useLargo();
  // Celular: a folha fecha ao arrastar para baixo.
  const { prender: prenderFolha, y: yFolha } = useArrastarParaFechar<HTMLDivElement>(aberto && !largo, aoFechar);
  const reduzido = useReducedMotion();
  const [pilha, setPilha] = useState<string[]>([]);
  const [direcao, setDirecao] = useState(1);

  // Fechou: a próxima abertura começa na tela principal.
  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    if (!aberto) setPilha([]);
  }

  const atual = pilha.length ? subtelas[pilha[pilha.length - 1]] : null;
  const abrir = (id: string) => {
    setDirecao(1);
    setPilha(p => [...p, id]);
  };
  const voltar = () => {
    setDirecao(-1);
    setPilha(p => p.slice(0, -1));
  };

  const entrada = largo
    ? { initial: { x: '105%' }, animate: { x: 0 }, exit: { x: '105%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };
  const mola = reduzido ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 38 };
  const deslize = reduzido ? 0 : 40;

  return (
    <Dialog.Root open={aberto} onOpenChange={a => !a && aoFechar()}>
      <AnimatePresence>
        {aberto && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--veu)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduzido ? 0 : 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={descricao ? undefined : undefined}
              // Tocar no aviso de versão nova não fecha o painel (quem está preenchendo segue).
              onInteractOutside={tocouNoAvisoDeVersao}
              onEscapeKeyDown={e => {
                // Esc numa sub-tela volta uma; na principal, fecha.
                if (pilha.length) {
                  e.preventDefault();
                  voltar();
                }
              }}
            >
              <motion.div
                ref={prenderFolha}
                style={{ y: yFolha }}
                {...entrada}
                transition={mola}
                className={cn(
                  'fixed z-50 flex flex-col overflow-hidden bg-fundo text-tinta shadow-painel',
                  largo
                    ? 'top-3 right-3 bottom-3 w-[min(440px,calc(100vw-24px))] rounded-[22px]'
                    : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px]',
                )}
              >
                {!largo && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pilula bg-borda-forte" aria-hidden="true" />}
                <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-3 py-2.5">
                  {pilha.length ? (
                    <button
                      type="button"
                      onClick={voltar}
                      aria-label="Voltar"
                      className="foco grid size-[var(--toque)] place-items-center rounded-pilula transition-colors hover:bg-sutil"
                    >
                      <IconVoltar />
                    </button>
                  ) : (
                    <span />
                  )}
                  <Dialog.Title asChild>
                    <h2 key={atual?.titulo ?? titulo} className="troca truncate text-center text-[15px] font-semibold">
                      {atual?.titulo ?? titulo}
                    </h2>
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Fechar"
                    className="foco grid size-[var(--toque)] place-items-center rounded-pilula transition-colors hover:bg-sutil"
                  >
                    <IconFechar />
                  </Dialog.Close>
                </header>
                {descricao && <Dialog.Description className="sr-only">{descricao}</Dialog.Description>}

                <ContextoPainel.Provider value={{ abrir, voltar }}>
                  {/* Coluna flex: no celular a folha só tem altura máxima, então "h-full" não
                      valeria e o conteúdo longo ficaria cortado sem rolar. */}
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <AnimatePresence initial={false} custom={direcao} mode="popLayout">
                      <motion.div
                        key={pilha.join('/') || 'principal'}
                        custom={direcao}
                        initial={{ opacity: 0, x: direcao * deslize }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direcao * deslize }}
                        transition={{ duration: reduzido ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-5"
                      >
                        {atual ? atual.conteudo : children}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {/* Sub-tela sem rodapé próprio mantém o da tela principal (Limpar / Mostrar N). */}
                  {(atual?.rodape ?? rodape) && (
                    <footer className="shrink-0 border-t border-borda bg-fundo px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
                      {atual?.rodape ?? rodape}
                    </footer>
                  )}
                </ContextoPainel.Provider>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Rodapé padrão: secundário em contorno e primário preto, os dois em pílula. */
export function RodapePainel({
  secundario,
  primario,
}: {
  secundario?: { rotulo: string; acao: () => void };
  primario: { rotulo: ReactNode; acao: () => void; desabilitado?: boolean };
}) {
  return (
    <div className="flex gap-2">
      {secundario && (
        <button
          type="button"
          onClick={secundario.acao}
          className="foco min-h-12 flex-1 rounded-pilula border border-borda-forte bg-superficie text-[14px] font-semibold transition-colors hover:bg-sutil"
        >
          {secundario.rotulo}
        </button>
      )}
      <button
        type="button"
        onClick={primario.acao}
        disabled={primario.desabilitado}
        className="foco inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-pilula bg-tinta text-[14px] font-semibold text-sobre-tinta transition-[transform,opacity] hover:-translate-y-px disabled:opacity-40"
      >
        {primario.rotulo}
      </button>
    </div>
  );
}
