'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Número que corre até o valor novo quando ele muda (indicadores, ganhos).
 * Com `deZero`, sobe do zero na primeira aparição (indicadores do topo); sem,
 * nasce no valor e anima só as mudanças (linhas que aparecem e somem na busca
 * não ficam contando). Com movimento reduzido, troca direto.
 */
export function NumeroAnimado({
  valor,
  formatar,
  deZero = false,
  duracao = 0.8,
}: {
  valor: number;
  formatar: (n: number) => string;
  deZero?: boolean;
  duracao?: number;
}) {
  const reduzido = useReducedMotion();
  const [mostrado, setMostrado] = useState(deZero ? 0 : valor);
  const atual = useRef(deZero ? 0 : valor);

  useEffect(() => {
    if (reduzido || atual.current === valor) {
      atual.current = valor;
      return;
    }
    const controle = animate(atual.current, valor, {
      duration: duracao,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: v => {
        atual.current = v;
        setMostrado(v);
      },
    });
    return () => controle.stop();
  }, [valor, reduzido, duracao]);

  return (
    <span aria-label={formatar(valor)}>
      <span aria-hidden="true">{formatar(reduzido ? valor : mostrado)}</span>
    </span>
  );
}
