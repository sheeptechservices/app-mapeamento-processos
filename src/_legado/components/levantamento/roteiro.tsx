'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconAdicionar, IconCheck, IconCheckCirculo, IconEstrela, IconExcluir, IconSeta } from '@/components/icons';
import { CampoAreaTexto } from '@/components/ui/campos';
import type { RoteiroBloco, RoteiroPergunta } from '@/lib/dominio';
import { comIndicador, useRascunho } from '@/lib/local/gravacao';
import { atualizar, criarPergunta, excluir } from '@/lib/local/repo';
import { cn } from '@/lib/cn';
import { rotas } from '@/lib/rotas';

function EditorPergunta({ pergunta }: { pergunta: RoteiroPergunta }) {
  const { rascunho, mudar } = useRascunho('roteiro_perguntas', pergunta);
  if (!rascunho) return null;
  return (
    <div className="space-y-3 px-3 pt-1 pb-3 pl-[60px]">
      <CampoAreaTexto
        rotulo="Anotação"
        linhas={2}
        valor={rascunho.anotacao}
        aoMudar={v => mudar('anotacao', v || null)}
        placeholder="O que o cliente respondeu"
      />
      <CampoAreaTexto rotulo="Texto da pergunta" linhas={1} valor={rascunho.texto} aoMudar={v => mudar('texto', v)} />
      <button
        type="button"
        onClick={() => comIndicador(() => excluir('roteiro_perguntas', pergunta.id))}
        className="foco inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-vermelho transition-colors hover:bg-vermelho-suave"
      >
        <IconExcluir size={16} /> Remover pergunta
      </button>
    </div>
  );
}

function LinhaPergunta({ pergunta }: { pergunta: RoteiroPergunta }) {
  const [aberta, setAberta] = useState(false);
  const [jaAberta, setJaAberta] = useState(false);
  const alternar = () => {
    setJaAberta(true);
    setAberta(a => !a);
  };

  return (
    <li className="border-t border-gray3 first:border-t-0">
      <div className="flex items-start gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={pergunta.feita}
          aria-label={pergunta.feita ? 'Marcar como não feita' : 'Marcar como feita'}
          onClick={() => comIndicador(() => atualizar('roteiro_perguntas', pergunta.id, { feita: !pergunta.feita }))}
          className="foco grid size-[52px] shrink-0 place-items-center"
        >
          <span
            className={cn(
              'grid size-6 place-items-center rounded-sm border-2 transition-[background-color,border-color,transform] duration-150 active:scale-90',
              pergunta.feita ? 'border-tinta bg-tinta text-bg' : 'border-gray2',
            )}
          >
            {pergunta.feita && <IconCheck size={16} strokeWidth={3} className="surge" />}
          </span>
        </button>
        <button type="button" onClick={alternar} aria-expanded={aberta} className="foco min-w-0 flex-1 rounded-sm py-3.5 text-left">
          <span className={cn('block text-[15px] leading-snug transition-colors', pergunta.feita && 'text-gray')}>
            {pergunta.texto}
          </span>
          {pergunta.anotacao && !aberta && (
            <span className="troca mt-1 line-clamp-2 block text-[13px] leading-snug text-gray">{pergunta.anotacao}</span>
          )}
        </button>
        <button
          type="button"
          aria-pressed={pergunta.essencial}
          aria-label={pergunta.essencial ? 'Tirar de essencial' : 'Marcar como essencial'}
          onClick={() => comIndicador(() => atualizar('roteiro_perguntas', pergunta.id, { essencial: !pergunta.essencial }))}
          className={cn(
            'foco grid size-[52px] shrink-0 place-items-center transition-[color,transform] active:scale-90',
            pergunta.essencial ? 'text-limao-tinta' : 'text-gray3 hover:text-gray2',
          )}
        >
          <IconEstrela size={20} strokeWidth={pergunta.essencial ? 2.4 : 1.8} />
        </button>
      </div>
      <div className={cn('revelar', aberta && 'aberto')}>
        <div>{jaAberta && <EditorPergunta pergunta={pergunta} />}</div>
      </div>
    </li>
  );
}

function AnotacoesBloco({ bloco }: { bloco: RoteiroBloco }) {
  const { rascunho, mudar } = useRascunho('roteiro_blocos', bloco);
  if (!rascunho) return null;
  return (
    <CampoAreaTexto
      rotulo="Anotações do bloco"
      linhas={2}
      valor={rascunho.anotacoes}
      aoMudar={v => mudar('anotacoes', v || null)}
      placeholder="O que vale lembrar deste trecho da conversa"
    />
  );
}

export function BlocoRoteiro({
  bloco,
  perguntas,
  soEssenciais,
  abertoInicial,
}: {
  bloco: RoteiroBloco;
  perguntas: RoteiroPergunta[];
  soEssenciais: boolean;
  abertoInicial: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [nova, setNova] = useState('');
  const visiveis = soEssenciais ? perguntas.filter(p => p.essencial) : perguntas;
  const feitas = perguntas.filter(p => p.feita).length;
  const completo = perguntas.length > 0 && feitas === perguntas.length;

  const adicionar = async () => {
    const t = nova.trim();
    if (!t) return;
    setNova('');
    await comIndicador(() => criarPergunta(bloco.levantamento_id, bloco.id, t));
  };

  if (soEssenciais && !visiveis.length) return null;

  return (
    <section className="cartao overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        className="foco flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray4"
      >
        <IconSeta size={18} className={cn('shrink-0 text-gray transition-transform duration-200', aberto && 'rotate-90')} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{bloco.titulo}</span>
          <span className="block text-xs text-gray">
            {bloco.minutos_previstos ? `${bloco.minutos_previstos} min previstos - ` : ''}
            {feitas} de {perguntas.length} feitas
          </span>
        </span>
        <span
          className={cn(
            'numeros grid size-9 shrink-0 place-items-center rounded-pill text-xs font-bold transition-colors',
            completo ? 'bg-tinta text-bg' : 'bg-gray4 text-gray',
          )}
        >
          {completo ? <IconCheck size={16} strokeWidth={2.6} /> : `${feitas}/${perguntas.length}`}
        </span>
      </button>

      <div className={cn('revelar', aberto && 'aberto')}>
        <div>
          <ul key={visiveis.map(p => p.id).join()} className="lista-anima border-t border-gray3 px-1">
            {visiveis.map(p => (
              <LinhaPergunta key={p.id} pergunta={p} />
            ))}
          </ul>
          <div className="space-y-4 border-t border-gray3 px-4 pt-3 pb-4">
            <form
              className="flex gap-2"
              onSubmit={e => {
                e.preventDefault();
                void adicionar();
              }}
            >
              <input
                className="campo"
                value={nova}
                onChange={e => setNova(e.target.value)}
                placeholder="Nova pergunta neste bloco"
                enterKeyHint="done"
                aria-label={`Nova pergunta em ${bloco.titulo}`}
              />
              <button
                type="submit"
                disabled={!nova.trim()}
                aria-label="Adicionar pergunta"
                className="foco grid size-[var(--toque)] shrink-0 place-items-center rounded-md bg-tinta text-bg transition-opacity disabled:opacity-30"
              >
                <IconAdicionar size={20} />
              </button>
            </form>
            {bloco.titulo === 'Validação e fechamento' && (
              <Link
                href={rotas.lev(bloco.levantamento_id, 'validar')}
                className="foco flex min-h-[var(--toque)] items-center justify-center gap-2 rounded-md bg-tinta text-sm font-bold text-bg transition-opacity hover:opacity-90"
              >
                <IconCheckCirculo size={18} /> Abrir a validação dos gargalos
              </Link>
            )}
            <AnotacoesBloco bloco={bloco} />
          </div>
        </div>
      </div>
    </section>
  );
}
