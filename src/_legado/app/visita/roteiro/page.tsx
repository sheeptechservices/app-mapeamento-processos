'use client';

import { useState } from 'react';
import { IconEstrela, IconRoteiro } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import { BlocoRoteiro } from '@/components/levantamento/roteiro';
import { Botao } from '@/components/ui/botao';
import { comIndicador } from '@/lib/local/gravacao';
import { criarRoteiroPadrao } from '@/lib/local/repo';
import { cn } from '@/lib/cn';

export default function Roteiro() {
  const { levantamento, roteiro } = useLev();
  const [soEssenciais, setSoEssenciais] = useState(false);
  const perguntas = roteiro.flatMap(r => r.perguntas);
  const feitas = perguntas.filter(p => p.feita).length;
  const essenciais = perguntas.filter(p => p.essencial);
  const essenciaisFeitas = essenciais.filter(p => p.feita).length;
  // Abre o primeiro bloco que ainda tem pergunta por fazer.
  const primeiroAberto = roteiro.find(r => r.perguntas.some(p => !p.feita))?.bloco.id;

  if (!roteiro.length) {
    return (
      <div className="surge space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Roteiro</h1>
        <div className="rounded-lg border border-dashed border-gray3 p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-pill bg-gray4">
            <IconRoteiro />
          </span>
          <p className="mt-3 font-semibold">Este levantamento ainda não tem roteiro</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray">
            O modelo padrão Sheep tem 7 blocos, da abertura à validação, com as perguntas essenciais marcadas.
          </p>
          <Botao variante="primario" className="mt-4" onClick={() => comIndicador(() => criarRoteiroPadrao(levantamento.id))}>
            Usar roteiro padrão Sheep
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="surge space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="rotulo">Visita</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Roteiro</h1>
        </div>
        <button
          type="button"
          aria-pressed={soEssenciais}
          onClick={() => setSoEssenciais(s => !s)}
          className={cn(
            'foco inline-flex min-h-[var(--toque)] items-center gap-1.5 rounded-pill border px-4 text-sm font-semibold transition-colors',
            soEssenciais ? 'border-tinta bg-tinta text-bg' : 'border-gray3 hover:bg-gray4',
          )}
        >
          <IconEstrela size={16} /> Só essenciais
        </button>
      </div>

      <div className="cartao p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            <span className="numeros">{feitas}</span> de <span className="numeros">{perguntas.length}</span> perguntas
          </span>
          <span className="text-gray">
            Essenciais: <span className="numeros font-semibold text-tinta">{essenciaisFeitas}/{essenciais.length}</span>
          </span>
        </div>
        <div className="progresso mt-2.5">
          <span style={{ width: `${perguntas.length ? (feitas / perguntas.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div key={String(soEssenciais)} className="lista-anima space-y-3">
        {roteiro.map(({ bloco, perguntas: ps }) => (
          <BlocoRoteiro
            key={bloco.id}
            bloco={bloco}
            perguntas={ps}
            soEssenciais={soEssenciais}
            abertoInicial={bloco.id === primeiroAberto}
          />
        ))}
      </div>
    </div>
  );
}
