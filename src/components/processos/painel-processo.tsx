'use client';

import { useState } from 'react';
import { IconAlerta, IconCheck, IconExcluir } from '@/components/icons';
import { Avatar } from '@/components/ui/avatar';
import { Confirmar } from '@/components/ui/confirmar';
import { useAnexosProcesso } from '@/components/processos/anexos-processo';
import { Grupo, Linha, LinhaInterruptor, LinhaNumero, LinhaTexto, LinhaTextoLongo, ListaEscolha, Segmentado } from '@/components/ui/linhas';
import { Painel, RodapePainel } from '@/components/ui/painel';
import {
  DOCUMENTADO,
  PRIORIDADES,
  emExecucao,
  FREQUENCIAS,
  PERIODO_FREQUENCIA,
  NIVEIS_AUTOMACAO,
  ORIGENS,
  ROTULO_CAMPO_PROCESSO,
  rotuloDe,
  rotuloFrequencia,
  tempoEmMinutos,
  tempoNaUnidade,
  unidadeTempoInicial,
  UNIDADES_TEMPO,
  type UnidadeTempo,
  vezesNoMes,
  vezesNoPeriodo,
  rotuloStatus,
  STATUS_PROCESSO,
  SUGESTOES_SISTEMAS,
  type Dados,
  type Processo,
  type Sessao,
} from '@/lib/dominio';
import { horas, numero, percentual, reais } from '@/lib/formato';
import { useCarteira } from '@/lib/local/carteira';
import { useAreas } from '@/lib/local/consultas';
import { useEquipe } from '@/lib/local/equipe';
import { comIndicador, useFormulario } from '@/lib/local/gravacao';
import { aceitarConflitos, areaDoSetor, criarProcesso, dadosProcessoVazio, excluirProcesso, lembrarOpcao } from '@/lib/local/repo';
import { AvisoRascunho } from '@/components/ui/aviso-rascunho';
import { calcularProcesso, ROTULO_CAMPO_ROI } from '@/lib/roi';
import { cn } from '@/lib/cn';

/** Nomes curtos para caber nos três segmentos do painel. */
const ROTULO_CURTO_ORIGEM = { cliente: 'Cliente', medido: 'Medido', estimativa: 'Estimativa' } as const;

const FONTE_CUSTO = { processo: 'do processo', cliente: 'do cliente', padrao: 'padrão das Configurações' } as const;

/** O cálculo ao vivo do processo, aberto: o consultor vê de onde sai cada número. */
function CalculoAoVivo({ p, ctx }: { p: Dados<Processo>; ctx: Parameters<typeof calcularProcesso>[1] }) {
  const r = calcularProcesso(p, ctx);
  const linha = (rotulo: string, valor: string, forte?: boolean) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px] text-white/60">{rotulo}</span>
      <span className={cn('numeros text-right', forte ? 'text-[19px] text-verde' : 'text-[15px]')}>{valor}</span>
    </div>
  );
  return (
    <section className="card-ia mt-4 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-white/60">Cálculo ao vivo</p>
        <span
          className={cn(
            'rounded-pilula px-2 py-0.5 text-[11px] font-semibold',
            r.so_estimativa ? 'bg-white/10 text-white/80' : 'bg-verde text-sobre-verde',
          )}
        >
          {r.origem === 'nao_informada' ? 'Origem não informada' : rotuloDe(ORIGENS, r.origem)}
        </span>
      </div>
      <div className="mt-2 divide-y divide-white/10">
        {linha('Horas por mês', horas(r.horas_mes))}
        {linha(`Custo da hora (${r.custo_hora_fonte ? FONTE_CUSTO[r.custo_hora_fonte] : 'falta'})`, reais(r.custo_hora, true))}
        {linha('Custo por mês', reais(r.custo_mes))}
        {linha(`Redução${r.reducao_padrao ? ' (padrão)' : ''}`, percentual(r.reducao))}
        {linha('Ganho por mês', reais(r.ganho_mes), true)}
        {linha('Ganho por ano', reais(r.ganho_ano))}
      </div>
      {!r.completo && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs leading-relaxed text-white/80">
          <IconAlerta size={14} className="mt-px shrink-0 text-verde" />
          Falta {r.faltando.map(c => ROTULO_CAMPO_ROI[c]).join(', ')} para fechar a conta.
        </p>
      )}
    </section>
  );
}

/**
 * Tempo médio com a unidade escolhida na própria linha (min, h ou dias). O
 * número digitado fica; trocar a unidade muda o que ele significa ("2" min vira
 * "2" h). Guarda sempre minutos.
 */
function TempoMedio({ minutos, aoMudar }: { minutos: number | null; aoMudar: (min: number | null) => void }) {
  const [unidade, setUnidade] = useState<UnidadeTempo>(() => unidadeTempoInicial(minutos));
  const noCampo = tempoNaUnidade(minutos, unidade);
  return (
    <LinhaNumero
      rotulo="Tempo médio"
      decimais
      valor={noCampo}
      aoMudar={v => aoMudar(tempoEmMinutos(v, unidade))}
      dica={
        minutos != null && unidade !== 'min' ? `${numero(minutos)} min no cálculo${unidade === 'dias' ? ' (dia de 8 h)' : ''}` : undefined
      }
      acessorio={
        <span role="radiogroup" aria-label="Unidade do tempo médio" className="ml-1 inline-flex shrink-0 rounded-pilula bg-sutil p-1">
          {UNIDADES_TEMPO.map(u => (
            <button
              key={u.valor}
              type="button"
              role="radio"
              aria-checked={unidade === u.valor}
              onClick={() => {
                if (u.valor === unidade) return;
                setUnidade(u.valor);
                if (noCampo != null) aoMudar(tempoEmMinutos(noCampo, u.valor));
              }}
              className={cn(
                'foco aperta h-9 min-w-11 rounded-pilula px-2.5 text-[13px] font-semibold transition-colors',
                unidade === u.valor ? 'bg-superficie text-tinta shadow-card' : 'text-tinta-2 hover:text-tinta',
              )}
            >
              {u.rotulo}
            </button>
          ))}
        </span>
      }
    />
  );
}

/**
 * Incluir (processo = null) ou editar um processo da sessão. Editando, cada
 * campo salva sozinho; incluindo, só o título é obrigatório e o processo entra
 * ao tocar em Salvar.
 */
export function PainelProcesso({
  aberto,
  aoFechar,
  processo,
  sessao,
  podeEditar = true,
}: {
  aberto: boolean;
  aoFechar: () => void;
  processo: Processo | null;
  sessao: Sessao;
  podeEditar?: boolean;
}) {
  const carteira = useCarteira();
  const areas = useAreas(sessao.id) ?? [];
  const equipe = useEquipe();
  const vazio = () => dadosProcessoVazio(sessao.id, sessao.cliente_id, null);
  // Processo novo: rascunho no aparelho até o Salvar (um por sessão); o setor
  // escolhido vai junto, como extra.
  const { dados, mudar, editando, reiniciar, recuperado, descartar, concluir, extras, mudarExtra } = useFormulario(
    'processos',
    processo,
    vazio,
    aberto && !processo ? `processo:${sessao.id}` : null,
  );
  const setorNovo = (extras.setor as string | null | undefined) ?? null;
  const { grupo: grupoAnexos, subtelas: subtelasAnexos } = useAnexosProcesso(processo?.id ?? null, podeEditar);
  const [excluindo, setExcluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    if (aberto && !processo) {
      reiniciar();
      setSalvando(false);
    }
  }

  if (!dados || !carteira) return null;
  const cfg = carteira.config;
  const ctx = carteira.ctxDe({ cliente_id: sessao.cliente_id });
  const setorAtual = editando ? (areas.find(a => a.id === dados.area_id)?.nome ?? null) : setorNovo;
  // Setores da organização + os já usados em qualquer sessão: setor criado nunca some da lista.
  const setores = [
    ...new Set([
      ...cfg.setores,
      ...areas.map(a => a.nome),
      ...[...carteira.areaPorId.values()].filter(a => !a.excluido).map(a => a.nome),
      ...(setorAtual ? [setorAtual] : []),
    ]),
  ];
  const custoHerdado = ctx.custo_hora_cliente ?? ctx.custo_hora_padrao;

  const escolherSetor = async (nome: string | undefined) => {
    if (!editando) return mudarExtra('setor', nome ?? null);
    if (!nome) return mudar('area_id', null);
    const area = await areaDoSetor(sessao.id, nome);
    mudar('area_id', area.id);
  };

  const salvar = async () => {
    if (!dados.titulo.trim()) return;
    setSalvando(true);
    await comIndicador(async () => {
      const area = setorNovo ? await areaDoSetor(sessao.id, setorNovo) : null;
      await criarProcesso(sessao.id, area?.id ?? null, { ...dados, titulo: dados.titulo.trim(), area_id: area?.id ?? null });
    });
    concluir();
    aoFechar();
  };

  const rodape = !podeEditar ? (
    <RodapePainel primario={{ rotulo: 'Fechar', acao: aoFechar }} />
  ) : editando ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setExcluindo(true)}
        className="foco inline-flex min-h-12 items-center gap-2 rounded-pilula bg-risco px-5 text-[14px] font-semibold text-white transition-[filter,translate,scale] hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
      >
        <IconExcluir size={17} /> Excluir
      </button>
      <button
        type="button"
        onClick={aoFechar}
        className="foco min-h-12 flex-1 rounded-pilula bg-tinta text-[14px] font-semibold text-sobre-tinta transition-transform hover:-translate-y-px active:scale-[0.97]"
      >
        Pronto
      </button>
    </div>
  ) : (
    <RodapePainel
      secundario={{ rotulo: 'Cancelar', acao: aoFechar }}
      primario={{
        rotulo: salvando ? <span className="spinner sm" /> : 'Salvar processo',
        acao: salvar,
        desabilitado: !dados.titulo.trim() || salvando,
      }}
    />
  );

  const listaUnica = <T extends string | number>(
    opcoes: { valor: T; rotulo: string; dica?: string }[],
    valor: T | null,
    campo: keyof Dados<Processo>,
  ) => <ListaEscolha opcoes={opcoes} selecionados={valor == null ? [] : [valor]} aoMudar={([v]) => mudar(campo, (v ?? null) as never)} />;

  return (
    <>
      <Painel
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={editando ? (processo?.codigo ?? 'Processo') : 'Novo processo'}
        rodape={rodape}
        subtelas={{
          setor: {
            titulo: 'Setor',
            conteudo: (
              <ListaEscolha
                opcoes={setores.map(s => ({ valor: s, rotulo: s }))}
                selecionados={setorAtual ? [setorAtual] : []}
                aoMudar={([v]) => void escolherSetor(v)}
                aoCriar={t => {
                  void escolherSetor(t);
                  void lembrarOpcao('setores', t);
                }}
                buscaAPartirDe={0}
              />
            ),
          },
          frequencia: {
            titulo: 'Frequência',
            conteudo: (
              <ListaEscolha
                opcoes={FREQUENCIAS.map(f => ({ ...f, rotulo: rotuloFrequencia(f.valor, cfg) }))}
                selecionados={dados.frequencia ? [dados.frequencia] : []}
                aoMudar={([v]) => {
                  const nova = v ?? null;
                  // Trocou o período: mantém a quantidade que a pessoa disse
                  // ("15 por dia" vira "15 por semana") e refaz o volume do mês.
                  const noPeriodo = dados.frequencia && dados.vezes_mes != null ? vezesNoPeriodo(dados.vezes_mes, dados.frequencia) : null;
                  mudar('frequencia', nova);
                  if (nova && noPeriodo != null) mudar('vezes_mes', vezesNoMes(noPeriodo, nova));
                }}
              />
            ),
          },
          status: {
            titulo: 'Status',
            conteudo: listaUnica(
              STATUS_PROCESSO.map(s => ({ ...s, rotulo: rotuloStatus(s.valor, cfg) })),
              dados.status,
              'status',
            ),
          },
          sistemas: {
            titulo: 'Sistemas usados',
            conteudo: (
              <ListaEscolha
                multiplo
                opcoes={[
                  ...new Set([...SUGESTOES_SISTEMAS, ...cfg.sistemas, ...carteira.processos.flatMap(p => p.sistemas), ...dados.sistemas]),
                ].map(s => ({
                  valor: s,
                  rotulo: s,
                }))}
                selecionados={dados.sistemas}
                aoMudar={v => mudar('sistemas', v)}
                aoCriar={t => {
                  mudar('sistemas', [...dados.sistemas, t]);
                  void lembrarOpcao('sistemas', t);
                }}
                buscaAPartirDe={0}
              />
            ),
          },
          prioridade: { titulo: 'Prioridade', conteudo: listaUnica(PRIORIDADES, dados.eisenhower, 'eisenhower') },
          responsaveis: {
            titulo: 'Responsáveis',
            conteudo: equipe.length ? (
              <ListaEscolha
                multiplo
                opcoes={equipe.filter(m => m.ativo).map(m => ({ valor: m.id, rotulo: m.nome, dica: m.email }))}
                selecionados={dados.responsaveis}
                aoMudar={v => mudar('responsaveis', v)}
              />
            ) : (
              <p className="px-1 pt-4 text-sm text-tinta-2">A equipe aparece quando houver conexão.</p>
            ),
          },
          ...subtelasAnexos,
        }}
      >
        <fieldset disabled={!podeEditar} className="contents">
          {recuperado && !editando && <AvisoRascunho aoDescartar={descartar} />}
          {!!processo?._conflitos?.length && (
            <div role="alert" className="entra mt-2 rounded-2xl bg-analise-fundo p-3.5 text-sm">
              <p className="flex items-start gap-2 font-semibold text-analise">
                <IconAlerta size={16} className="mt-0.5 shrink-0" />
                Outro consultor alterou {processo._conflitos.map(c => ROTULO_CAMPO_PROCESSO[c] ?? c).join(', ')} ao mesmo tempo.
              </p>
              <p className="mt-1 pl-6 text-[13px] text-tinta">Ficou o valor gravado por último. Confira e ajuste se precisar.</p>
              <button
                type="button"
                onClick={() => aceitarConflitos('processos', processo.id)}
                className="foco mt-2 ml-6 inline-flex h-8 items-center gap-1.5 rounded-pilula border border-borda-forte bg-superficie px-3 text-[13px] font-semibold transition-colors hover:bg-sutil"
              >
                <IconCheck size={15} /> Conferido
              </button>
            </div>
          )}

          <Grupo titulo="Identificação">
            <LinhaTexto
              rotulo="Título"
              valor={dados.titulo}
              aoMudar={v => mudar('titulo', v)}
              placeholder="Obrigatório"
              autoFocus={!editando}
            />
            <Linha rotulo="Setor" valor={setorAtual} subtela="setor" />
            <LinhaTexto rotulo="Ponto focal" valor={dados.ponto_focal} aoMudar={v => mudar('ponto_focal', v || null)} />
            <Linha rotulo="Frequência" valor={dados.frequencia ? rotuloFrequencia(dados.frequencia, cfg) : null} subtela="frequencia" />
            {/* Quantas vezes, no período da frequência; guardado como volume do mês (base do ROI). */}
            {(dados.frequencia || dados.vezes_mes != null) && (
              <div key={dados.frequencia ?? 'sem'} className="entra">
                <LinhaNumero
                  rotulo={`Quantas vezes ${PERIODO_FREQUENCIA[dados.frequencia ?? 'mensal']}`}
                  decimais
                  valor={vezesNoPeriodo(dados.vezes_mes, dados.frequencia ?? 'mensal')}
                  aoMudar={v => mudar('vezes_mes', vezesNoMes(v, dados.frequencia ?? 'mensal'))}
                  dica={
                    dados.vezes_mes != null && dados.frequencia && dados.frequencia !== 'mensal' && dados.frequencia !== 'sob_demanda'
                      ? `${numero(dados.vezes_mes)} por mês no cálculo`
                      : undefined
                  }
                />
              </div>
            )}
            <Linha rotulo="Status" valor={rotuloStatus(dados.status, cfg)} subtela="status" />
          </Grupo>

          <Grupo titulo="Como funciona">
            <LinhaTextoLongo
              rotulo="Descrição"
              valor={dados.descricao}
              aoMudar={v => mudar('descricao', v || null)}
              placeholder="Passo a passo do jeito que o cliente contou"
            />
            <LinhaTexto rotulo="Gatilho" valor={dados.gatilho} aoMudar={v => mudar('gatilho', v || null)} placeholder="O que dispara" />
            <LinhaTexto rotulo="Fim" valor={dados.fim} aoMudar={v => mudar('fim', v || null)} placeholder="Quando termina" />
            <Linha rotulo="Sistemas" valor={dados.sistemas.join(', ') || null} subtela="sistemas" />
            <LinhaNumero rotulo="Pessoas envolvidas" valor={dados.pessoas_envolvidas} aoMudar={v => mudar('pessoas_envolvidas', v)} />
          </Grupo>

          <Grupo titulo="Números">
            <TempoMedio key={processo?.id ?? 'novo'} minutos={dados.tempo_medio_min} aoMudar={v => mudar('tempo_medio_min', v)} />
            <LinhaNumero
              rotulo="Custo da hora"
              prefixo="R$"
              decimais
              valor={dados.custo_hora_override}
              aoMudar={v => mudar('custo_hora_override', v)}
              placeholder={custoHerdado != null ? `Herdado: ${reais(custoHerdado, true)}` : 'Não informado'}
            />
            <LinhaNumero
              rotulo="Redução esperada"
              sufixo="%"
              valor={dados.reducao_pct}
              aoMudar={v => mudar('reducao_pct', v == null ? null : Math.min(v, 100))}
              placeholder={`Padrão: ${cfg.reducao_padrao_pct}%`}
            />
            <Segmentado
              rotulo="Origem do número"
              opcoes={ORIGENS.map(o => ({ valor: o.valor, rotulo: ROTULO_CURTO_ORIGEM[o.valor] }))}
              valor={dados.origem_numero}
              aoMudar={v => mudar('origem_numero', v)}
            />
          </Grupo>

          <CalculoAoVivo p={dados} ctx={ctx} />

          <Grupo titulo="Situação hoje">
            <Segmentado
              rotulo="Quão automático"
              opcoes={NIVEIS_AUTOMACAO}
              valor={dados.nivel_automacao}
              aoMudar={v => mudar('nivel_automacao', v)}
            />
            <Segmentado rotulo="Documentado" opcoes={DOCUMENTADO} valor={dados.documentado} aoMudar={v => mudar('documentado', v)} />
            <LinhaTextoLongo
              rotulo="Maiores gargalos"
              valor={dados.gargalos}
              aoMudar={v => mudar('gargalos', v || null)}
              placeholder="Onde trava, erra ou espera"
            />
            <LinhaTextoLongo
              rotulo="Pontos de atenção"
              valor={dados.pontos_atencao}
              aoMudar={v => mudar('pontos_atencao', v || null)}
              placeholder="Risco fiscal, dependência de uma pessoa, acesso a sistema"
            />
          </Grupo>

          <Grupo titulo="Valor e prioridade">
            <LinhaTextoLongo
              rotulo="Ganho esperado"
              valor={dados.ganho_esperado}
              aoMudar={v => mudar('ganho_esperado', v || null)}
              placeholder="O que muda para o cliente com a automação"
            />
            <Linha rotulo="Prioridade" valor={dados.eisenhower ? rotuloDe(PRIORIDADES, dados.eisenhower) : null} subtela="prioridade" />
          </Grupo>

          <Grupo titulo="Anotações">
            <LinhaTextoLongo rotulo="Observações" valor={dados.observacoes} aoMudar={v => mudar('observacoes', v || null)} />
          </Grupo>

          {grupoAnexos}

          {/* Acompanhamento: só quando o processo já virou trabalho (em execução ou
              automatizado). Se já tiver algo preenchido, aparece sempre, para não esconder dado. */}
          {(emExecucao(dados.status) || dados.em_risco || dados.ganho_validado_pct != null || dados.responsaveis.length > 0) && (
            <Grupo titulo="Acompanhamento">
              <LinhaInterruptor
                rotulo="Em risco"
                dica="Aparece no filtro Em risco e com o selo vermelho"
                ligado={dados.em_risco}
                aoMudar={v => mudar('em_risco', v)}
              />
              <LinhaNumero
                rotulo="Ganho validado"
                sufixo="%"
                valor={dados.ganho_validado_pct}
                aoMudar={v => mudar('ganho_validado_pct', v == null ? null : Math.min(v, 100))}
                placeholder="0%"
                dica="Quanto do ganho o cliente confirmou"
              />
              <Linha
                rotulo="Responsáveis"
                subtela="responsaveis"
                vazio="Ninguém"
                valor={
                  dados.responsaveis.length ? (
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {dados.responsaveis.slice(0, 3).map(id => {
                        const m = equipe.find(x => x.id === id);
                        return <Avatar key={id} nome={m?.nome ?? '?'} imagem={m?.foto} tamanho={22} />;
                      })}
                      {dados.responsaveis.length > 3 && <span className="text-[13px]">+{dados.responsaveis.length - 3}</span>}
                    </span>
                  ) : null
                }
              />
            </Grupo>
          )}
        </fieldset>
      </Painel>

      {processo && (
        <Confirmar
          aberto={excluindo}
          aoFechar={() => setExcluindo(false)}
          titulo={`Excluir ${processo.codigo}?`}
          texto={`"${processo.titulo || 'Sem título'}" sai do mapa e do ROI, em todos os aparelhos. O código não é reaproveitado.`}
          rotuloConfirmar="Excluir processo"
          aoConfirmar={async () => {
            aoFechar();
            await comIndicador(() => excluirProcesso(processo.id));
          }}
        />
      )}
    </>
  );
}
