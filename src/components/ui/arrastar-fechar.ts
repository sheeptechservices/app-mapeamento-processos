'use client';

import { animate, useMotionValue, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/** Quanto arrastar (px) ou quão rápido (px/ms) para a folha fechar ao soltar. */
const DISTANCIA_FECHA = 110;
const VELOCIDADE_FECHA = 0.55;

/** O toque começou dentro de uma área rolada para baixo? Então o gesto é de rolar, não de fechar. */
function rolouParaBaixo(alvo: Element | null, raiz: HTMLElement) {
  for (let el = alvo as HTMLElement | null; el && el !== raiz; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el.scrollTop > 0;
  }
  return false;
}

/**
 * Folha de baixo (celular) que fecha ao arrastar para baixo, como as do sistema.
 * Vale em qualquer ponto da folha: se o conteúdo estiver no topo, puxar para
 * baixo arrasta a folha; se estiver rolado, o gesto rola o conteúdo. Soltou
 * longe ou rápido, fecha (a saída animada continua de onde o dedo parou);
 * senão volta com mola. Devolve `prender` (a ref da folha) e o `y` para o `style` dela.
 */
export function useArrastarParaFechar<T extends HTMLElement>(
  ativo: boolean,
  aoFechar: () => void,
): { prender: (el: T | null) => void; y: MotionValue<number> } {
  // Ref de callback: o Radix monta o conteúdo do portal um instante depois da
  // abertura, e o gesto só pode ser ligado quando a folha existe de fato.
  const [folha, setFolha] = useState<T | null>(null);
  const y = useMotionValue(0);
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  useEffect(() => {
    if (!ativo || !folha) return;
    let toque: { x: number; y: number; ultimoY: number; ultimoT: number; vel: number } | null = null;
    let arrastando = false;

    const comeco = (e: TouchEvent) => {
      const alvo = e.target as Element;
      if (e.touches.length !== 1 || rolouParaBaixo(alvo, folha) || alvo.closest('[data-sem-arrastar]')) {
        toque = null;
        return;
      }
      const t = e.touches[0];
      toque = { x: t.clientX, y: t.clientY, ultimoY: t.clientY, ultimoT: performance.now(), vel: 0 };
      arrastando = false;
    };

    const movimento = (e: TouchEvent) => {
      if (!toque) return;
      const t = e.touches[0];
      const dy = t.clientY - toque.y;
      const dx = t.clientX - toque.x;
      if (!arrastando) {
        // Decide pelo primeiro movimento claro: para baixo arrasta a folha; para
        // cima ou para o lado é rolagem ou outro gesto, e a folha não interfere.
        if (dy > 8 && dy > Math.abs(dx)) arrastando = true;
        else if (dy < -4 || Math.abs(dx) > 8) {
          toque = null;
          return;
        } else return;
      }
      if (e.cancelable) e.preventDefault();
      const agora = performance.now();
      toque.vel = (t.clientY - toque.ultimoY) / Math.max(agora - toque.ultimoT, 1);
      toque.ultimoY = t.clientY;
      toque.ultimoT = agora;
      y.set(Math.max(0, dy - 8));
    };

    const fim = () => {
      if (!toque || !arrastando) {
        toque = null;
        return;
      }
      const distancia = y.get();
      const rapido = toque.vel > VELOCIDADE_FECHA && distancia > 30;
      toque = null;
      arrastando = false;
      if (distancia > DISTANCIA_FECHA || rapido) fechar.current();
      else animate(y, 0, { type: 'spring', stiffness: 420, damping: 38 });
    };

    folha.addEventListener('touchstart', comeco, { passive: true });
    folha.addEventListener('touchmove', movimento, { passive: false });
    folha.addEventListener('touchend', fim);
    folha.addEventListener('touchcancel', fim);
    return () => {
      folha.removeEventListener('touchstart', comeco);
      folha.removeEventListener('touchmove', movimento);
      folha.removeEventListener('touchend', fim);
      folha.removeEventListener('touchcancel', fim);
    };
  }, [ativo, folha, y]);

  return { prender: setFolha, y };
}
