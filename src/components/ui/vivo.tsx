'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState, type ComponentProps } from 'react';

const curva = [0.2, 0.8, 0.2, 1] as const;

/**
 * Item de lista que nasce crescendo e sai encolhendo, empurrando o resto com
 * suavidade (a altura anima de verdade, então quem está embaixo acompanha sem
 * pular). Use dentro de `AnimatePresence initial={false}`: o que já estava na
 * tela ao abrir a página não anima, só o que entra e sai depois. O espaço entre
 * itens deve ser padding do próprio item, para encolher junto.
 */
export function ItemVivo({ children, ...resto }: ComponentProps<typeof motion.li>) {
  const reduzido = useReducedMotion();
  return (
    <motion.li
      initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
      transition={
        reduzido
          ? { duration: 0 }
          : { height: { duration: 0.34, ease: curva }, opacity: { duration: 0.24, ease: 'easeOut' } }
      }
      {...resto}
    >
      {children}
    </motion.li>
  );
}

/**
 * Brilho verde que acende e apaga quando `quando` muda depois de montado
 * (processo editado aqui ou chegado pela sincronização). Fica atrás do texto:
 * o pai precisa de `relative isolate`.
 */
export function Pulso({ quando }: { quando: number }) {
  const [visto, setVisto] = useState(quando);
  const [vezes, setVezes] = useState(0);
  if (visto !== quando) {
    setVisto(quando);
    setVezes(v => v + 1);
  }
  if (!vezes) return null;
  return <span key={vezes} aria-hidden="true" className="pulso-mudou" />;
}
