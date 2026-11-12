'use client';

import { AnimatePresence } from 'motion/react';
import type { PointerEvent } from 'react';
import { IconAdicionar, IconEditar, IconExcluir, IconPasta, IconPastaAberta, IconSeta } from '@/components/icons';
import { Acao, CabecalhoTabela, LinhaProcesso, MenuAcoes, revelaAcoes } from '@/components/processos/lista-processos';
import { Avatar } from '@/components/ui/avatar';
import { NumeroAnimado } from '@/components/ui/numero-animado';
import { Selo } from '@/components/ui/selo';
import { ItemVivo, Pulso } from '@/components/ui/vivo';
import { rotuloDe, STATUS_SESSAO, type Processo, type Sessao } from '@/lib/dominio';
import { dataCurta, reais, reaisCompacto } from '@/lib/formato';
import type { Carteira } from '@/lib/local/carteira';
import type { PastaCliente } from '@/lib/mapa';
import { consolidar } from '@/lib/roi';
import { cn } from '@/lib/cn';

export interface AcoesMapa {
  editarCliente: (clienteId: string) => void;
  excluirCliente: (clienteId: string) => void;
  abrirProcesso: (p: Processo) => void;
  excluirProcesso: (p: Processo) => void;
  novoProcesso: (s: Sessao) => void;
  novaSessao: (clienteId: string) => void;
  editarSessao: (s: Sessao) => void;
  /** Abre a página da sessão (lista, indicadores, filtros próprios). */
  abrirSessao: (s: Sessao) => void;
}

/** Luz que segue o ponteiro: grava a posição em variáveis CSS, sem re-render. */
function seguirPonteiro(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/** Seta que gira 90 graus ao abrir (nunca troca de ícone). */
function Seta({ aberta }: { aberta: boolean }) {
  return <IconSeta size={18} className={cn('shrink-0 text-tinta-3 transition-transform duration-200 ease-v6', aberta && 'rotate-90')} />;
}

/** Quantos processos encontrados aparecem direto no mapa antes do "ver todos". */
const MAX_ACHADOS = 5;

/**
 * Mapa de processo em pastas: cliente > sessões de mapeamento. Cada sessão é um
 * cartão com o resumo (processos, ganho, barra das etapas) que abre a página da
 * sessão, onde fica a lista completa. Com busca ou filtro, os processos
 * encontrados aparecem logo abaixo do cartão. Pastas de cliente abrem com
 * `.revelar`; com busca ou filtro, tudo que tem resultado já chega aberto.
 */
export function ArvoreMapa({
  mapa,
  abertas,
  alternar,
  filtrando,
  sessaoAtiva,
  carteira,
  podeEditar,
  acoes,
}: {
  mapa: PastaCliente[];
  abertas: Set<string>;
  alternar: (id: string) => void;
  filtrando: boolean;
  /** Sessão com o quadro aberto: a pasta dela fica aberta. */
  sessaoAtiva: string | null;
  carteira: Carteira;
  podeEditar: boolean;
  acoes: AcoesMapa;
}) {
  return (
    <ul className="cascata -mb-3">
      <AnimatePresence initial={false}>
        {mapa.map(({ cliente, sessoes, total }) => {
          const aberto = abertas.has(cliente.id);
          const roi = consolidar(
            carteira.processos.filter(p => p.cliente_id === cliente.id),
            carteira.ctxDe,
          );
          const nSessoes = carteira.sessoes.filter(s => s.cliente_id === cliente.id).length;
          return (
            <ItemVivo key={cliente.id} className="pb-3">
              <div className="card brilho @container overflow-hidden" onPointerMove={seguirPonteiro}>
                {/* Pasta do cliente */}
                <div className="group/linha relative isolate flex min-h-[68px] items-center gap-3 px-4 py-3">
                  <Pulso quando={cliente.atualizado_em} />
                  <button
                    type="button"
                    aria-expanded={aberto}
                    onClick={() => alternar(cliente.id)}
                    className="foco flex min-w-0 flex-1 items-center gap-3 text-left after:absolute after:inset-0 after:content-['']"
                  >
                    <Seta aberta={aberto} />
                    <span className="shrink-0 transition-[scale] duration-300 ease-(--mola) group-hover/linha:scale-[1.06]">
                      <Avatar nome={cliente.nome} imagem={cliente.logo} tamanho={38} quadrado />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold tracking-tight">{cliente.nome}</span>
                      <span className="block truncate text-[12px] text-tinta-2">
                        {nSessoes} {nSessoes === 1 ? 'sessão' : 'sessões'} - {total} {total === 1 ? 'processo' : 'processos'}
                      </span>
                    </span>
                  </button>
                  <span className="hidden shrink-0 text-right tablet:block">
                    <span className="numeros block text-[15px]">
                      {roi.ganho_ano > 0 ? <NumeroAnimado valor={roi.ganho_ano} formatar={reaisCompacto} /> : '-'}
                    </span>
                    <span className="block text-[11px] text-tinta-3">ganho por ano</span>
                  </span>
                  {podeEditar && (
                    <MenuAcoes
                      rotulo={`Ações de ${cliente.nome}`}
                      className="hidden @max-md:grid"
                      itens={[
                        { rotulo: 'Nova sessão', icone: <IconAdicionar size={18} />, aoEscolher: () => acoes.novaSessao(cliente.id) },
                        { rotulo: 'Editar cliente', icone: <IconEditar size={17} />, aoEscolher: () => acoes.editarCliente(cliente.id) },
                        {
                          rotulo: 'Excluir cliente',
                          icone: <IconExcluir size={17} />,
                          aoEscolher: () => acoes.excluirCliente(cliente.id),
                          perigo: true,
                        },
                      ]}
                    />
                  )}
                  {podeEditar && (
                    <span className={cn(revelaAcoes, '@max-md:!hidden')}>
                      <Acao rotulo={`Nova sessão para ${cliente.nome}`} onClick={() => acoes.novaSessao(cliente.id)}>
                        <IconAdicionar size={18} />
                      </Acao>
                      <Acao rotulo={`Editar ${cliente.nome}`} onClick={() => acoes.editarCliente(cliente.id)}>
                        <IconEditar size={16} />
                      </Acao>
                      <Acao rotulo={`Excluir ${cliente.nome}`} onClick={() => acoes.excluirCliente(cliente.id)} perigo>
                        <IconExcluir size={16} />
                      </Acao>
                    </span>
                  )}
                </div>

                <div className={cn('revelar', aberto && 'aberto')}>
                  <div>
                    <ul className="border-t border-borda bg-fundo/60 px-2 pt-2 tablet:px-3">
                      {sessoes.length === 0 && (
                        <li className="flex items-center justify-between gap-3 rounded-2xl px-3 pt-1 pb-3 text-sm text-tinta-2">
                          Nenhuma sessão de mapeamento ainda.
                          {podeEditar && (
                            <button
                              type="button"
                              onClick={() => acoes.novaSessao(cliente.id)}
                              title="Nova sessão"
                              className="foco inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-pilula bg-tinta px-3.5 text-[13px] font-semibold whitespace-nowrap text-sobre-tinta transition-transform hover:-translate-y-px active:scale-[0.97] @max-md:w-9 @max-md:px-0"
                            >
                              <IconAdicionar size={16} />
                              <span className="@max-md:sr-only">Nova sessão</span>
                            </button>
                          )}
                        </li>
                      )}
                      <AnimatePresence initial={false}>
                        {sessoes.map(({ sessao, processos }) => {
                          // `processos` vem filtrado pela busca; o resumo do cartão usa todos os da sessão.
                          const todos = carteira.processos.filter(p => p.sessao_id === sessao.id);
                          const ganho = todos.reduce((s, p) => s + (carteira.roiDe(p).ganho_mes ?? 0), 0);
                          const achados = filtrando ? processos : [];
                          const ativa = sessao.id === sessaoAtiva;
                          return (
                            <ItemVivo key={sessao.id} className="pb-2">
                              <div
                                className={cn(
                                  'overflow-hidden rounded-2xl border bg-superficie transition-[border-color,box-shadow] duration-200 hover:border-borda-forte hover:shadow-card',
                                  ativa ? 'border-tinta-3 shadow-card' : 'border-borda',
                                )}
                              >
                                {/* Cartão da sessão: abre a página dela */}
                                <div className="group/linha relative isolate flex min-h-[64px] items-center gap-3 px-3 py-3">
                                  <Pulso quando={sessao.atualizado_em} />
                                  <button
                                    type="button"
                                    onClick={() => acoes.abrirSessao(sessao)}
                                    className="foco flex min-w-0 flex-1 items-center gap-3 text-left after:absolute after:inset-0 after:content-['']"
                                  >
                                    {/* Pasta que abre: entreaberta no hover, aberta com o quadro da sessão. */}
                                    <span
                                      data-aberta={ativa || undefined}
                                      className={cn(
                                        'pasta-viva grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-200',
                                        ativa ? 'bg-tinta text-sobre-tinta' : 'bg-sutil text-tinta-2 group-hover/linha:text-tinta',
                                      )}
                                    >
                                      <IconPasta size={18} className="fechada" />
                                      <IconPastaAberta size={18} className="aberta" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[15px] font-medium">{sessao.titulo || 'Sessão de mapeamento'}</span>
                                      <span className="block truncate text-[12px] text-tinta-2">
                                        {dataCurta(sessao.data)} - {todos.length} {todos.length === 1 ? 'processo' : 'processos'}
                                        {ganho > 0 && (
                                          <>
                                            {' - '}
                                            <NumeroAnimado valor={ganho} formatar={reais} />
                                            /mês
                                          </>
                                        )}
                                      </span>
                                    </span>
                                  </button>
                                  <span className="hidden shrink-0 tablet:block">
                                    <Selo tom={sessao.status === 'validada' ? 'verde' : sessao.status === 'em_revisao' ? 'analise' : 'pendente'}>
                                      {rotuloDe(STATUS_SESSAO, sessao.status)}
                                    </Selo>
                                  </span>
                                  {podeEditar && (
                                    <span className={revelaAcoes}>
                                      <Acao rotulo="Novo processo nesta sessão" onClick={() => acoes.novoProcesso(sessao)}>
                                        <IconAdicionar size={18} />
                                      </Acao>
                                      <Acao rotulo="Editar sessão" onClick={() => acoes.editarSessao(sessao)}>
                                        <IconEditar size={16} />
                                      </Acao>
                                    </span>
                                  )}
                                  <IconSeta
                                    size={18}
                                    className={cn('shrink-0 transition-[rotate,color] duration-300 ease-(--mola)', ativa ? 'rotate-90 text-tinta' : 'text-tinta-3')}
                                  />
                                </div>

                                {/* Busca ou filtro: os processos encontrados nesta sessão. */}
                                {achados.length > 0 && (
                                  <div className="border-t border-borda">
                                    <CabecalhoTabela podeEditar={podeEditar} />
                                    <ul>
                                      <AnimatePresence initial={false}>
                                        {achados.slice(0, MAX_ACHADOS).map(p => (
                                          <LinhaProcesso key={p.id} p={p} carteira={carteira} podeEditar={podeEditar} acoes={acoes} />
                                        ))}
                                      </AnimatePresence>
                                    </ul>
                                    {achados.length > MAX_ACHADOS && (
                                      <button
                                        type="button"
                                        onClick={() => acoes.abrirSessao(sessao)}
                                        className="foco flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-borda text-[13px] font-semibold text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta"
                                      >
                                        Ver os {achados.length} encontrados na sessão <IconSeta size={15} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </ItemVivo>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>
                </div>
              </div>
            </ItemVivo>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
