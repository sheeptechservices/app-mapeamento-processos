'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  IconAdicionar,
  IconAnterior,
  IconBusca,
  IconEditar,
  IconExpandir,
  IconFechar,
  IconFiltros,
  IconRecolher,
} from '@/components/icons';
import { tocouNoAvisoDeVersao } from '@/components/aviso-versao';
import { BotaoAgrupar, GruposProcessos } from '@/components/processos/agrupar-processos';
import { BarraEtapas, GanhoPorSetor } from '@/components/processos/graficos-sessao';
import { CabecalhoTabela, LinhaProcesso, type AcoesProcesso } from '@/components/processos/lista-processos';
import { ORIGENS_FILTRO, PainelFiltros } from '@/components/processos/painel-filtros';
import { useArrastarParaFechar } from '@/components/ui/arrastar-fechar';
import { Avatar } from '@/components/ui/avatar';
import { estiloBotao } from '@/components/ui/botao';
import { NumeroAnimado } from '@/components/ui/numero-animado';
import { Selo } from '@/components/ui/selo';
import { PRIORIDADES, rotuloDe, rotuloStatus, STATUS_SESSAO, type Processo, type Sessao } from '@/lib/dominio';
import { AGRUPAMENTOS, agruparProcessos, type Agrupamento } from '@/lib/agrupar';
import { contarFiltros, etiquetasAtivas, FILTROS_VAZIOS, filtrarProcessos, type FiltrosProcesso } from '@/lib/filtros';
import { horas, numero, percentual, reais, reaisCompacto } from '@/lib/formato';
import type { Carteira } from '@/lib/local/carteira';
import { agregarPor, consolidar } from '@/lib/roi';
import { contarEtapas } from '@/lib/sessao-resumo';
import { cn } from '@/lib/cn';

const CONSULTA_ESTREITO = '(max-width: 619px)';
function assinarEstreito(aviso: () => void) {
  const m = matchMedia(CONSULTA_ESTREITO);
  m.addEventListener('change', aviso);
  return () => m.removeEventListener('change', aviso);
}
const eEstreito = () => matchMedia(CONSULTA_ESTREITO).matches;

/** O agrupamento escolhido fica lembrado no aparelho (é preferência de tela, não dado). */
const CHAVE_AGRUPAR = 'sl_sessao_agrupar';
function lerAgrupar(): Agrupamento {
  try {
    const v = localStorage.getItem(CHAVE_AGRUPAR);
    return AGRUPAMENTOS.some(a => a.valor === v) ? (v as Agrupamento) : 'nenhum';
  } catch {
    return 'nenhum';
  }
}

/** Indicador da sessão: rótulo, número que corre e uma linha de apoio. */
function Kpi({ rotulo, valor, apoio, destaque }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; destaque?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-borda p-4 tablet:p-5', destaque ? 'bg-verde-suave/60' : 'bg-superficie')}>
      <p className="text-[12px] font-medium text-tinta-2">{rotulo}</p>
      <p className="numeros mt-1.5 text-[22px] leading-none tracking-tight tablet:text-[28px]">{valor}</p>
      {apoio && <p className="mt-2 text-[12px] leading-snug text-tinta-2">{apoio}</p>}
    </div>
  );
}

function Quadro({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-borda bg-superficie p-4 tablet:p-5', className)}>
      <h2 className="mb-3.5 text-[13px] font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Quadro da sessão de mapeamento: abre por cima do mapa ao tocar no cartão da
 * sessão (o mapa fica atrás, esmaecido). Cabeçalho com caminho de volta, ações
 * da sessão, indicadores, gráficos simples e a lista de processos com busca e
 * filtros próprios. No desktop, "expandir" leva o quadro até as bordas da tela
 * (anima as margens); no celular ele sobe como folha de baixo e ocupa a tela.
 */
export function PaginaSessao({
  aberto,
  sessao,
  carteira,
  podeEditar,
  filtrosIniciais,
  aoVoltar,
  acoes,
}: {
  aberto: boolean;
  sessao: Sessao;
  carteira: Carteira;
  podeEditar: boolean;
  filtrosIniciais?: FiltrosProcesso;
  aoVoltar: () => void;
  acoes: AcoesProcesso & { novoProcesso: (s: Sessao) => void; editarSessao: (s: Sessao) => void };
}) {
  const [filtros, setFiltros] = useState<FiltrosProcesso>(filtrosIniciais ?? FILTROS_VAZIOS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // O quadro sempre abre reduzido, mesmo que tenha sido fechado expandido.
  const [expandido, setExpandido] = useState(false);
  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) setExpandido(false);
  }
  const alternarExpandido = () => setExpandido(e => !e);
  const [agrupar, setAgrupar] = useState<Agrupamento>(lerAgrupar);
  const mudarAgrupar = (v: Agrupamento) => {
    setAgrupar(v);
    try {
      localStorage.setItem(CHAVE_AGRUPAR, v);
    } catch {
      /* sem armazenamento: vale nesta visita */
    }
  };

  const reduzido = useReducedMotion();
  // Celular: o quadro é folha de baixo e fecha ao arrastar para baixo.
  const estreito = useSyncExternalStore(assinarEstreito, eEstreito, () => false);
  const { prender: prenderFolha, y: yFolha } = useArrastarParaFechar<HTMLElement>(aberto && estreito, aoVoltar);

  const cliente = carteira.clientePorId.get(sessao.cliente_id);
  const setorDe = (p: Processo) => (p.area_id ? (carteira.areaPorId.get(p.area_id)?.nome ?? null) : null);
  const todos = carteira.processos.filter(p => p.sessao_id === sessao.id);
  const info = { setor: setorDe, ganhoMes: (p: Processo) => carteira.roiDe(p).ganho_mes };
  const visiveis = filtrarProcessos(todos, filtros, 'todos', info);
  const grupos = agrupar === 'nenhum' ? null : agruparProcessos(visiveis, agrupar, { setor: setorDe, cfg: carteira.config });
  const roi = consolidar(todos, carteira.ctxDe);
  const etapas = contarEtapas(todos);
  const setores = agregarPor(todos, p => setorDe(p) ?? 'Sem setor', carteira.ctxDe).map(g => ({
    setor: g.chave ?? 'Sem setor',
    ganho: g.roi.ganho_mes,
    processos: g.roi.processos,
  }));
  const ativos = contarFiltros(filtros);
  const etiquetas = etiquetasAtivas(filtros, {
    status: s => rotuloStatus(s, carteira.config),
    prioridade: e => rotuloDe(PRIORIDADES, e),
    origem: o => ORIGENS_FILTRO.find(x => x.valor === o)?.rotulo ?? o,
  });
  const nParticipantes = sessao.participantes.length;

  return (
    <>
      <Dialog.Root open={aberto} onOpenChange={a => !a && aoVoltar()}>
        <AnimatePresence>
          {aberto && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-40 bg-[var(--veu)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduzido ? 0 : 0.22 }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                forceMount
                aria-describedby={undefined}
                onInteractOutside={tocouNoAvisoDeVersao}
                // Foco no próprio quadro (e não no primeiro botão): sem anel de foco solto ao abrir.
                onOpenAutoFocus={e => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement | null)?.focus();
                }}
                onEscapeKeyDown={e => {
                  // Esc primeiro recolhe o quadro expandido; com ele recolhido, fecha.
                  if (expandido) {
                    e.preventDefault();
                    alternarExpandido();
                  }
                }}
              >
                <motion.section
                  ref={prenderFolha}
                  style={{ y: yFolha }}
                  initial={reduzido ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduzido ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
                  transition={reduzido ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34 }}
                  tabIndex={-1}
                  className={cn(
                    'quadro-sessao @container fixed z-40 flex flex-col overflow-hidden bg-fundo shadow-painel outline-none',
                    expandido && 'expandido',
                  )}
                >
                  {/* Alça de folha no celular */}
                  <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pilula bg-borda-forte tablet:hidden" aria-hidden="true" />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className={cn('mx-auto px-4 pt-3 pb-10 tablet:px-8 tablet:pt-6', expandido && 'max-w-[var(--largura-app)]')}>
                      {/* Caminho e controles do quadro */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={aoVoltar}
                          className="foco aperta -ml-2 inline-flex min-h-[var(--toque)] shrink-0 items-center gap-1 rounded-pilula pr-3 pl-2 text-[14px] font-semibold text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta"
                        >
                          <IconAnterior size={18} /> Mapa
                        </button>
                        <p className="min-w-0 truncate text-[13px] text-tinta-3">
                          <span className="text-tinta-2">{cliente?.nome}</span> / {sessao.titulo || 'Sessão de mapeamento'}
                        </p>
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={alternarExpandido}
                            aria-label={expandido ? 'Recolher o quadro' : 'Expandir para a tela toda'}
                            title={expandido ? 'Recolher (Esc)' : 'Expandir para a tela toda'}
                            className="foco aperta hidden size-[var(--toque)] place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta tablet:grid"
                          >
                            <span key={String(expandido)} className="troca">
                              {expandido ? <IconRecolher size={18} /> : <IconExpandir size={18} />}
                            </span>
                          </button>
                          <Dialog.Close
                            aria-label="Fechar a sessão"
                            className="foco aperta grid size-[var(--toque)] place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta"
                          >
                            <IconFechar size={18} />
                          </Dialog.Close>
                        </div>
                      </div>

                      {/* Título e ações da sessão */}
                      <div className="mt-3 flex items-start gap-3 tablet:mt-4">
                        <Avatar nome={cliente?.nome} imagem={cliente?.logo} tamanho={44} quadrado className="mt-0.5 hidden tablet:block" />
                        <div className="min-w-0 flex-1">
                          <Dialog.Title className="text-[26px] leading-tight font-semibold tracking-tight tablet:text-[32px]">
                            {sessao.titulo || 'Sessão de mapeamento'}
                          </Dialog.Title>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-2">
                            <Selo tom={sessao.status === 'validada' ? 'verde' : sessao.status === 'em_revisao' ? 'analise' : 'pendente'}>
                              {rotuloDe(STATUS_SESSAO, sessao.status)}
                            </Selo>
                            <span>{sessao.data.split('-').reverse().join('/')}</span>
                            {nParticipantes > 0 && (
                              <span>
                                {nParticipantes} {nParticipantes === 1 ? 'participante' : 'participantes'}
                              </span>
                            )}
                          </div>
                        </div>
                        {podeEditar && (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              title="Editar sessão"
                              onClick={() => acoes.editarSessao(sessao)}
                              className={cn(estiloBotao({ variante: 'secundario' }), '@max-xl:w-[var(--toque)] @max-xl:px-0')}
                            >
                              <IconEditar size={17} />
                              <span className="@max-xl:sr-only">Editar sessão</span>
                            </button>
                            <button
                              type="button"
                              title="Novo processo"
                              onClick={() => acoes.novoProcesso(sessao)}
                              className={cn(estiloBotao({ variante: 'primario' }), '@max-xl:w-[var(--toque)] @max-xl:px-0')}
                            >
                              <IconAdicionar size={18} />
                              <span className="@max-xl:sr-only">Novo processo</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Indicadores */}
                      <div className="cascata mt-5 grid grid-cols-2 gap-2.5 tablet:mt-6 @3xl:grid-cols-4">
                        <Kpi
                          destaque
                          rotulo="Processos"
                          valor={<NumeroAnimado deZero valor={roi.processos} formatar={n => numero(Math.round(n))} />}
                          apoio={roi.processos ? `${roi.completos} com números completos` : 'Nenhum ainda'}
                        />
                        <Kpi
                          rotulo="Horas por mês"
                          valor={<NumeroAnimado deZero valor={roi.horas_mes} formatar={horas} />}
                          apoio={roi.horas_liberadas_mes > 0 ? `${horas(roi.horas_liberadas_mes)} liberadas` : 'Sem horas calculadas'}
                        />
                        <Kpi
                          rotulo="Ganho por mês"
                          valor={<NumeroAnimado deZero valor={roi.ganho_mes} formatar={v => reais(Math.round(v))} />}
                          apoio={roi.ganho_ano > 0 ? `${reaisCompacto(roi.ganho_ano)} por ano` : 'Faltam números para calcular'}
                        />
                        <Kpi
                          rotulo="Em risco"
                          valor={<NumeroAnimado deZero valor={roi.em_risco} formatar={n => numero(Math.round(n))} />}
                          apoio={roi.ganho_mes > 0 ? `${percentual(roi.fracao_validada)} do ganho validado` : 'Nenhum ganho validado'}
                        />
                      </div>

                      {/* Gráficos simples */}
                      {todos.length > 0 && (
                        <div className="mt-2.5 grid gap-2.5 @3xl:grid-cols-2">
                          <Quadro titulo="Processos por etapa">
                            <BarraEtapas contagem={etapas} cfg={carteira.config} />
                            {/* Prioridade: contagem direta, sem cor (quatro números leem melhor que um gráfico). */}
                            <h3 className="mt-5 border-t border-borda pt-4 text-[13px] font-semibold">Por prioridade</h3>
                            <ul className="mt-3 grid grid-cols-4 gap-2">
                              {PRIORIDADES.map(pr => {
                                const n = todos.filter(p => p.eisenhower === pr.valor).length;
                                return (
                                  <li key={pr.valor} className={cn('rounded-xl bg-sutil/70 px-2 py-2.5 text-center', !n && 'opacity-55')}>
                                    <span className="numeros block text-[18px] leading-none">{n}</span>
                                    <span className="mt-1 block truncate text-[12px] text-tinta-2">{pr.rotulo}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </Quadro>
                          <Quadro titulo="Ganho por setor (mês)">
                            <GanhoPorSetor grupos={setores} />
                          </Quadro>
                        </div>
                      )}

                      {/* Busca e filtros da sessão */}
                      <div className="mt-6 flex items-center gap-2">
                        <h2 className="mr-auto hidden text-[15px] font-semibold @xl:block">
                          Processos <span className="numeros text-tinta-3">({todos.length})</span>
                        </h2>
                        <label className="relative min-w-0 flex-1 @xl:max-w-[360px]">
                          <IconBusca size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-tinta-3" />
                          <input
                            className="campo !rounded-pilula !pl-11"
                            placeholder="Buscar nesta sessão"
                            value={filtros.busca}
                            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
                            aria-label="Buscar processos nesta sessão"
                          />
                        </label>
                        {todos.length > 0 && <BotaoAgrupar valor={agrupar} aoMudar={mudarAgrupar} />}
                        <button
                          type="button"
                          onClick={() => setFiltrosAbertos(true)}
                          className={cn(
                            'foco aperta inline-flex min-h-[var(--toque)] shrink-0 items-center gap-2 rounded-pilula border px-4 text-[14px] font-semibold transition-colors',
                            ativos ? 'border-tinta bg-tinta text-sobre-tinta' : 'border-borda bg-superficie hover:bg-sutil',
                          )}
                        >
                          <IconFiltros size={18} />
                          <span className="@max-md:sr-only">Filtros</span>
                          {ativos > 0 && (
                            <span className="numeros grid h-5 min-w-5 place-items-center rounded-pilula bg-verde px-1 text-[11px] text-sobre-verde">
                              {ativos}
                            </span>
                          )}
                        </button>
                      </div>

                      {etiquetas.length > 0 && (
                        <div key={etiquetas.map(e => e.chave).join()} className="cascata mt-3 flex flex-wrap items-center gap-2">
                          {etiquetas.map(e => (
                            <button
                              key={e.chave}
                              type="button"
                              onClick={() => setFiltros(f => e.remover(f))}
                              aria-label={`Remover filtro ${e.rotulo}`}
                              className="foco inline-flex h-8 items-center gap-1.5 rounded-pilula bg-sutil pr-2.5 pl-3 text-[13px] font-medium transition-colors hover:bg-borda"
                            >
                              {e.rotulo} <IconFechar size={14} className="text-tinta-2" />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setFiltros(f => ({ ...FILTROS_VAZIOS, busca: f.busca, ordem: f.ordem }))}
                            className="foco h-8 rounded-pilula px-2 text-[13px] font-semibold text-tinta-2 underline-offset-2 hover:text-tinta hover:underline"
                          >
                            Limpar filtros
                          </button>
                        </div>
                      )}

                      {/* Lista */}
                      <div className="mt-3 overflow-hidden rounded-2xl border border-borda bg-superficie">
                        {todos.length === 0 ? (
                          <div className="px-6 py-10 text-center">
                            <p className="font-semibold">Nenhum processo nesta sessão ainda</p>
                            <p className="mt-1.5 text-sm text-tinta-2">
                              Cada processo que o cliente contar entra aqui, com o cálculo de ganho.
                            </p>
                            {podeEditar && (
                              <button
                                type="button"
                                onClick={() => acoes.novoProcesso(sessao)}
                                className={cn(estiloBotao({ variante: 'primario' }), 'mt-5')}
                              >
                                <IconAdicionar size={18} /> Novo processo
                              </button>
                            )}
                          </div>
                        ) : visiveis.length === 0 ? (
                          <div className="px-6 py-10 text-center">
                            <p className="font-semibold">Nada encontrado com essa busca ou filtro</p>
                            <button
                              type="button"
                              onClick={() => setFiltros(FILTROS_VAZIOS)}
                              className="foco mt-3 text-sm font-semibold text-tinta-2 underline-offset-2 hover:text-tinta hover:underline"
                            >
                              Limpar busca e filtros
                            </button>
                          </div>
                        ) : (
                          <>
                            <CabecalhoTabela podeEditar={podeEditar} />
                            {grupos ? (
                              <GruposProcessos key={agrupar} grupos={grupos} carteira={carteira} podeEditar={podeEditar} acoes={acoes} />
                            ) : (
                              <ul key="lista" className="cascata">
                                <AnimatePresence initial={false}>
                                  {visiveis.map(p => (
                                    <LinhaProcesso key={p.id} p={p} carteira={carteira} podeEditar={podeEditar} acoes={acoes} />
                                  ))}
                                </AnimatePresence>
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                      {visiveis.length > 0 && visiveis.length < todos.length && (
                        <p className="mt-2 text-right text-[12px] text-tinta-2">
                          {visiveis.length} de {todos.length} processos
                        </p>
                      )}
                    </div>
                  </div>
                </motion.section>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      <PainelFiltros
        aberto={filtrosAbertos}
        aoFechar={() => setFiltrosAbertos(false)}
        filtros={filtros}
        aoMudar={setFiltros}
        processos={todos}
        setorDe={setorDe}
        previa={visiveis.length}
        cfg={carteira.config}
      />
    </>
  );
}
