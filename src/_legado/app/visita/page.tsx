'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconAdicionar, IconEditar, IconPessoas } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import { EditarArea } from '@/components/levantamento/editar-area';
import { NovoProcesso } from '@/components/levantamento/novo-processo';
import { ProcessoLinha } from '@/components/levantamento/processo-linha';
import { Botao } from '@/components/ui/botao';
import { CampoTexto } from '@/components/ui/campos';
import { Folha } from '@/components/ui/folha';
import { SUGESTOES_AREAS, type Area } from '@/lib/dominio';
import { reais, reaisCompacto } from '@/lib/formato';
import { rotas } from '@/lib/rotas';
import { criarArea } from '@/lib/local/repo';
import { comIndicador } from '@/lib/local/gravacao';

export default function AreasEProcessos() {
  const { levantamento, areas, processos, roiDe, roi, roteiro } = useLev();
  const roteiroPerguntas = roteiro.flatMap(r => r.perguntas);
  const roteiroTotal = roteiroPerguntas.length;
  const roteiroFeitas = roteiroPerguntas.filter(p => p.feita).length;
  const [editando, setEditando] = useState<Area | null>(null);
  const [novaArea, setNovaArea] = useState(false);
  const [nomeArea, setNomeArea] = useState('');
  const [novoProc, setNovoProc] = useState<{ area: string | null } | null>(null);

  const livres = SUGESTOES_AREAS.filter(s => !areas.some(a => a.nome.toLowerCase() === s.toLowerCase()));
  const semArea = processos.filter(p => !p.area_id || !areas.some(a => a.id === p.area_id));
  const adicionar = (nome: string) => comIndicador(() => criarArea(levantamento.id, { nome }));

  return (
    <div className="surge space-y-6">
      <div>
        <p className="rotulo">Mapa</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Áreas e processos</h1>
        <p className="mt-1 text-sm text-gray">
          {areas.length} {areas.length === 1 ? 'área' : 'áreas'} - {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
        </p>
      </div>

      {/* Celular: resumo da visita (no desktop o placar fica na coluna da direita). */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Link href={rotas.lev(levantamento.id, 'roteiro')} className="foco cartao cartao-clicavel rounded-md p-3">
          <p className="rotulo !text-[10px]">Roteiro</p>
          <p className="numeros mt-0.5 text-lg font-extrabold">
            {roteiroFeitas}/{roteiroTotal}
          </p>
          <div className="progresso mt-1.5">
            <span style={{ width: `${roteiroTotal ? (roteiroFeitas / roteiroTotal) * 100 : 0}%` }} />
          </div>
        </Link>
        <Link href={rotas.lev(levantamento.id, 'placar')} className="foco cartao cartao-clicavel rounded-md bg-limao p-3 text-on-limao">
          <p className="text-[10px] font-bold tracking-wide uppercase opacity-70">Ganho/ano</p>
          <p className="numeros mt-0.5 text-lg font-extrabold">{roi.ganho_ano > 0 ? reaisCompacto(roi.ganho_ano) : '-'}</p>
          <p className="mt-1 text-[11px] opacity-75">
            {roi.completos}/{roi.processos} processos com números
          </p>
        </Link>
      </div>

      <section aria-label="Adicionar área">
        <p className="mb-2 text-[13px] font-semibold text-gray">Adicionar área com um toque</p>
        <div key={livres.join()} className="lista-anima flex flex-wrap gap-2">
          {livres.slice(0, areas.length ? 8 : 15).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="foco inline-flex min-h-[var(--toque)] items-center gap-1.5 rounded-pill border border-dashed border-gray2 px-4 text-sm font-semibold transition-[background-color,border-color,transform] duration-100 hover:border-tinta hover:bg-gray4 active:scale-95"
            >
              <IconAdicionar size={16} /> {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setNomeArea('');
              setNovaArea(true);
            }}
            className="foco inline-flex min-h-[var(--toque)] items-center gap-1.5 rounded-pill bg-tinta px-4 text-sm font-semibold text-bg transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-95"
          >
            <IconAdicionar size={16} /> Outra
          </button>
        </div>
      </section>

      <div key={areas.map(a => a.id).join()} className="lista-anima space-y-4">
        {areas.map(area => {
          const lista = processos.filter(p => p.area_id === area.id);
          const ganho = lista.reduce((s, p) => s + (roiDe(p).ganho_mes ?? 0), 0);
          return (
            <section key={area.id} className="cartao overflow-hidden">
              <div className="flex items-start gap-2 px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setEditando(area)}
                  className="foco group min-w-0 flex-1 rounded-sm text-left"
                >
                  <h2 className="flex items-center gap-2 text-[17px] font-bold">
                    <span className="truncate">{area.nome || 'Sem nome'}</span>
                    <IconEditar size={14} className="shrink-0 text-gray2 transition-colors group-hover:text-tinta" />
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray">
                    {area.responsavel && <span>{area.responsavel}</span>}
                    {area.pessoas != null && (
                      <span className="inline-flex items-center gap-1">
                        <IconPessoas size={12} /> {area.pessoas} {area.pessoas === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    )}
                    {!area.responsavel && area.pessoas == null && <span>Toque para informar responsável e equipe</span>}
                  </p>
                </button>
                {ganho > 0 && (
                  <div className="text-right">
                    <p className="numeros text-sm font-extrabold">{reais(ganho)}</p>
                    <p className="text-[11px] text-gray">ganho/mês</p>
                  </div>
                )}
              </div>
              {area.entrega && <p className="px-4 pb-2 text-sm leading-relaxed text-gray">{area.entrega}</p>}
              <div className="px-1 pb-1">
                {lista.map(p => (
                  <ProcessoLinha key={p.id} processo={p} />
                ))}
                <button
                  type="button"
                  onClick={() => setNovoProc({ area: area.id })}
                  className="foco flex min-h-[var(--toque)] w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray transition-colors hover:bg-gray4 hover:text-tinta"
                >
                  <IconAdicionar size={18} /> Processo em {area.nome || 'esta área'}
                </button>
              </div>
            </section>
          );
        })}

        {semArea.length > 0 && (
          <section className="cartao overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-[17px] font-bold">Sem área</h2>
              <p className="text-xs text-gray">Abra o processo e escolha a área dele.</p>
            </div>
            <div className="px-1 pb-1">
              {semArea.map(p => (
                <ProcessoLinha key={p.id} processo={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {!areas.length && !processos.length && (
        <div className="rounded-lg border border-dashed border-gray3 p-6 text-center">
          <p className="font-semibold">Comece pelas áreas da empresa</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray">
            Toque nas sugestões acima. Depois registre os processos de cada área pelo botão amarelo.
          </p>
        </div>
      )}

      <EditarArea area={editando ? (areas.find(a => a.id === editando.id) ?? null) : null} aoFechar={() => setEditando(null)} />
      <NovoProcesso aberto={!!novoProc} aoFechar={() => setNovoProc(null)} areaInicial={novoProc?.area} />
      <Folha
        aberta={novaArea}
        aoFechar={() => setNovaArea(false)}
        titulo="Nova área"
        rodape={
          <Botao
            variante="primario"
            tamanho="lg"
            className="w-full"
            disabled={!nomeArea.trim()}
            onClick={async () => {
              await adicionar(nomeArea.trim());
              setNovaArea(false);
            }}
          >
            Adicionar área
          </Botao>
        }
      >
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (!nomeArea.trim()) return;
            await adicionar(nomeArea.trim());
            setNovaArea(false);
          }}
        >
          <CampoTexto rotulo="Nome da área" valor={nomeArea} aoMudar={setNomeArea} placeholder="Ex.: Expedição" autoFocus />
        </form>
      </Folha>
    </div>
  );
}
