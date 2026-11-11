'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconAlerta, IconAnterior, IconCheck, IconExcluir, IconSeta } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import { ROIProcessoCartao } from '@/components/levantamento/roi-processo';
import { Botao } from '@/components/ui/botao';
import { CampoAreaTexto, CampoNumero, CampoTexto, Chips, Etiquetas } from '@/components/ui/campos';
import { Confirmar } from '@/components/ui/folha';
import {
  DOCUMENTADO,
  EISENHOWER,
  FREQUENCIAS,
  NIVEIS_AUTOMACAO,
  ORIGENS,
  ROTULO_CAMPO_PROCESSO,
  STATUS_PROCESSO,
  SUGESTOES_SISTEMAS,
  type Dados,
  type Processo,
} from '@/lib/dominio';
import { reais } from '@/lib/formato';
import { useProcesso } from '@/lib/local/consultas';
import { useRascunho } from '@/lib/local/gravacao';
import { aceitarConflitos, excluir } from '@/lib/local/repo';
import { calcularProcesso, ROTULO_CAMPO_ROI } from '@/lib/roi';
import { cn } from '@/lib/cn';
import { rotas } from '@/lib/rotas';

const ETAPAS = ['Identificação', 'Como funciona', 'Números', 'Situação', 'Valor'] as const;
const DIAS_UTEIS = 22;
const SEMANAS_MES = 4.3;

type Mudar = <K extends keyof Dados<Processo>>(campo: K, valor: Dados<Processo>[K]) => void;

/** Vezes por dia ou por semana viram vezes por mês, sem conta de cabeça. */
function AjudaVolume({ p, mudar }: { p: Processo; mudar: Mudar }) {
  const [n, setN] = useState<number | null>(null);
  const porDia = p.frequencia === 'diaria';
  const porSemana = p.frequencia === 'semanal';
  if (!porDia && !porSemana) return null;
  const fator = porDia ? DIAS_UTEIS : SEMANAS_MES;
  return (
    <div className="surge flex items-end gap-2 rounded-md bg-gray4 p-3">
      <CampoNumero
        className="flex-1"
        rotulo={porDia ? 'Quantas vezes por dia?' : 'Quantas vezes por semana?'}
        valor={n}
        aoMudar={setN}
        decimais
        placeholder="0"
      />
      <Botao variante="escuro" disabled={!n} onClick={() => n && mudar('vezes_mes', Math.round(n * fator))}>
        = {n ? Math.round(n * fator) : '-'}/mês
      </Botao>
    </div>
  );
}

function Etapa({ indice, p, mudar }: { indice: number; p: Processo; mudar: Mudar }) {
  const { levantamento, areas } = useLev();
  const r = calcularProcesso(p, levantamento);

  switch (indice) {
    case 0:
      return (
        <div className="space-y-5">
          <CampoTexto rotulo="Nome do processo" valor={p.titulo} aoMudar={v => mudar('titulo', v)} placeholder="Ex.: Fechamento da folha" />
          {areas.length > 0 && (
            <Chips rotulo="Área" opcoes={areas.map(a => ({ valor: a.id, rotulo: a.nome }))} valor={p.area_id} aoMudar={v => mudar('area_id', v)} />
          )}
          <CampoTexto
            rotulo="Ponto focal"
            valor={p.ponto_focal}
            aoMudar={v => mudar('ponto_focal', v || null)}
            placeholder="Quem executa ou responde pelo processo"
            autoComplete="off"
          />
          <Chips rotulo="Status" permitirLimpar={false} opcoes={STATUS_PROCESSO} valor={p.status} aoMudar={v => v && mudar('status', v)} />
        </div>
      );
    case 1:
      return (
        <div className="space-y-5">
          <CampoAreaTexto
            rotulo="Como funciona hoje"
            valor={p.descricao}
            aoMudar={v => mudar('descricao', v || null)}
            placeholder="Passo a passo do jeito que o cliente contou"
            linhas={4}
          />
          <CampoTexto
            rotulo="O que dispara o processo"
            valor={p.gatilho}
            aoMudar={v => mudar('gatilho', v || null)}
            placeholder="Ex.: Pedido do cliente, fechamento do mês"
          />
          <Chips rotulo="Frequência" opcoes={FREQUENCIAS} valor={p.frequencia} aoMudar={v => mudar('frequencia', v)} />
          <Etiquetas rotulo="Sistemas usados" valor={p.sistemas} aoMudar={v => mudar('sistemas', v)} sugestoes={SUGESTOES_SISTEMAS} />
        </div>
      );
    case 2:
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <CampoNumero rotulo="Vezes por mês" roi valor={p.vezes_mes} aoMudar={v => mudar('vezes_mes', v)} decimais placeholder="300" />
            <CampoNumero
              rotulo="Tempo médio"
              roi
              sufixo="min"
              valor={p.tempo_medio_min}
              aoMudar={v => mudar('tempo_medio_min', v)}
              decimais
              placeholder="10"
            />
          </div>
          <AjudaVolume p={p} mudar={mudar} />
          <div className="grid grid-cols-2 gap-3">
            <CampoNumero rotulo="Pessoas envolvidas" valor={p.pessoas_envolvidas} aoMudar={v => mudar('pessoas_envolvidas', v)} placeholder="2" />
            <CampoNumero
              rotulo="Perda ou receita em risco"
              prefixo="R$"
              decimais
              valor={p.perda_mes}
              aoMudar={v => mudar('perda_mes', v)}
              placeholder="por mês"
            />
          </div>
          <CampoNumero
            rotulo="Custo da hora deste processo"
            prefixo="R$"
            decimais
            valor={p.custo_hora_override}
            aoMudar={v => mudar('custo_hora_override', v)}
            placeholder={levantamento.custo_hora != null ? String(levantamento.custo_hora).replace('.', ',') : 'Opcional'}
            dica={
              levantamento.custo_hora != null
                ? `Vazio usa ${reais(levantamento.custo_hora, true)} do levantamento. Preencha se quem executa ganha diferente da média.`
                : 'O levantamento ainda não tem custo médio da hora.'
            }
          />
          <ROIProcessoCartao r={r} compacto />
        </div>
      );
    case 3:
      return (
        <div className="space-y-5">
          <Chips rotulo="Quão automático está hoje" opcoes={NIVEIS_AUTOMACAO} valor={p.nivel_automacao} aoMudar={v => mudar('nivel_automacao', v)} />
          <Chips rotulo="Está documentado" opcoes={DOCUMENTADO} valor={p.documentado} aoMudar={v => mudar('documentado', v)} />
          <CampoAreaTexto
            rotulo="Maiores gargalos"
            valor={p.gargalos}
            aoMudar={v => mudar('gargalos', v || null)}
            placeholder="Onde trava, onde erra, onde espera"
          />
          <CampoAreaTexto
            rotulo="Pontos de atenção"
            valor={p.pontos_atencao}
            aoMudar={v => mudar('pontos_atencao', v || null)}
            placeholder="Risco fiscal, dependência de uma pessoa, acesso a sistema externo"
          />
        </div>
      );
    default:
      return (
        <div className="space-y-5">
          <CampoAreaTexto
            rotulo="Ganho esperado"
            valor={p.ganho_esperado}
            aoMudar={v => mudar('ganho_esperado', v || null)}
            placeholder="O que muda para o cliente com a automação"
            linhas={2}
          />
          <div>
            <CampoNumero
              rotulo="Redução estimada"
              roi
              sufixo="%"
              valor={p.reducao_pct}
              aoMudar={v => mudar('reducao_pct', v == null ? null : Math.min(v, 100))}
              placeholder="60"
              dica="Vazio usa 60%."
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[30, 50, 60, 70, 85].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => mudar('reducao_pct', v)}
                  className={cn(
                    'foco numeros min-h-9 rounded-pill border px-3 text-[13px] font-semibold transition-colors',
                    p.reducao_pct === v ? 'border-tinta bg-tinta text-bg' : 'border-gray3 hover:bg-gray4',
                  )}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
          <Chips rotulo="Prioridade (Matriz de Eisenhower)" opcoes={EISENHOWER} valor={p.eisenhower} aoMudar={v => mudar('eisenhower', v)} />
          <Chips
            rotulo="De onde vêm os números"
            roi
            opcoes={ORIGENS}
            valor={p.origem_numero}
            aoMudar={v => mudar('origem_numero', v)}
            dica={ORIGENS.find(o => o.valor === p.origem_numero)?.dica}
          />
          <ROIProcessoCartao r={r} />
        </div>
      );
  }
}

// Trocar de processo (pela lista lateral) remonta o editor: etapa e rascunho começam do zero.
export default function PaginaProcesso() {
  const pid = useSearchParams().get('p') ?? '';
  return <EditorProcesso key={pid} pid={pid} />;
}

function EditorProcesso({ pid }: { pid: string }) {
  const router = useRouter();
  const { levantamento } = useLev();
  const registro = useProcesso(pid);
  const { rascunho, mudar, gravar } = useRascunho('processos', registro);
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [excluindo, setExcluindo] = useState(false);
  const reduzido = useReducedMotion();
  const base = rotas.lev(levantamento.id);

  // Chaves no corpo: no Chrome atual scrollTo devolve uma Promise, e efeito não pode devolver nada além de função.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
  }, [etapa, reduzido]);

  if (registro === null) {
    return (
      <div className="surge py-16 text-center">
        <p className="font-semibold">Processo não encontrado</p>
        <Botao className="mt-4" onClick={() => router.replace(base)}>
          Voltar para áreas
        </Botao>
      </div>
    );
  }
  if (!rascunho) {
    return (
      <div className="spinner-linha">
        <span className="spinner" />
      </div>
    );
  }

  const r = calcularProcesso(rascunho, levantamento);
  const irPara = (i: number) => {
    setDirecao(i > etapa ? 1 : -1);
    setEtapa(i);
  };
  const concluir = () => {
    if (rascunho.status === 'rascunho') mudar('status', 'mapeado');
    gravar();
    router.push(base);
  };

  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="rotulo numeros">{rascunho.codigo}</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight">{rascunho.titulo || 'Sem título'}</h1>
        </div>
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          aria-label="Excluir processo"
          className="foco grid size-[var(--toque)] place-items-center rounded-md text-gray transition-colors hover:bg-vermelho-suave hover:text-vermelho"
        >
          <IconExcluir size={18} />
        </button>
      </div>

      {/* Etapas: toque para pular, a barra mostra onde está */}
      <nav aria-label="Etapas" className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ol className="flex gap-1.5">
          {ETAPAS.map((nome, i) => {
            const temLacuna = i === 2 && !r.completo;
            return (
              <li key={nome} className="shrink-0">
                <button
                  type="button"
                  onClick={() => irPara(i)}
                  aria-current={etapa === i ? 'step' : undefined}
                  className={cn(
                    'foco relative inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold transition-colors',
                    etapa === i ? 'bg-tinta text-bg' : 'bg-gray4 text-gray hover:text-tinta',
                  )}
                >
                  <span className="numeros text-[11px] opacity-60">{i + 1}</span>
                  {nome}
                  {temLacuna && <span className="size-1.5 rounded-pill bg-ambar" aria-label="faltam números" />}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {registro?._conflitos?.length ? (
        <div role="alert" className="surge mb-4 rounded-md border border-ambar/40 bg-ambar-suave p-3 text-sm">
          <p className="flex items-start gap-2 font-semibold text-ambar">
            <IconAlerta size={16} className="mt-0.5 shrink-0" />
            Outro consultor alterou {registro._conflitos.map(c => ROTULO_CAMPO_PROCESSO[c] ?? c).join(', ')} ao mesmo tempo.
          </p>
          <p className="mt-1 pl-6 text-[13px] leading-relaxed text-tinta">
            Ficou o valor gravado por último. Confira com o colega e ajuste se precisar.
          </p>
          <div className="mt-2 pl-6">
            <Botao onClick={() => aceitarConflitos('processos', registro.id)} className="min-h-9 text-[13px]">
              <IconCheck size={16} /> Conferido
            </Botao>
          </div>
        </div>
      ) : null}

      {!r.completo && etapa !== 2 && (
        <button
          type="button"
          onClick={() => irPara(2)}
          className="foco surge mb-4 flex w-full items-center gap-2 rounded-md bg-ambar-suave px-3 py-2.5 text-left text-xs font-semibold text-ambar"
        >
          <IconAlerta size={16} className="shrink-0" />
          <span className="flex-1">Faltam para o ROI: {r.faltando.map(c => ROTULO_CAMPO_ROI[c]).join(', ')}</span>
          <IconSeta size={14} />
        </button>
      )}

      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
          <motion.div
            key={etapa}
            custom={direcao}
            initial={reduzido ? false : { opacity: 0, x: direcao * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduzido ? { opacity: 0 } : { opacity: 0, x: direcao * -28 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <Etapa indice={etapa} p={rascunho} mudar={mudar} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegação das etapas, no alcance do polegar */}
      <div className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t border-gray3 bg-bg/95 backdrop-blur lg:sticky lg:mt-8 lg:rounded-lg lg:border lg:bg-superficie">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          <Botao tamanho="lg" onClick={() => irPara(etapa - 1)} disabled={etapa === 0} aria-label="Etapa anterior" className="px-4">
            <IconAnterior />
          </Botao>
          {etapa < ETAPAS.length - 1 ? (
            <Botao variante="escuro" tamanho="lg" className="flex-1" onClick={() => irPara(etapa + 1)}>
              {ETAPAS[etapa + 1]} <IconSeta size={18} />
            </Botao>
          ) : (
            <Botao variante="primario" tamanho="lg" className="flex-1" onClick={concluir}>
              <IconCheck size={18} /> Concluir processo
            </Botao>
          )}
        </div>
      </div>

      <Confirmar
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo="Excluir processo?"
        texto={`${rascunho.codigo} - ${rascunho.titulo || 'Sem título'} sai do levantamento e do ROI. O código não é reaproveitado.`}
        rotuloConfirmar="Excluir"
        perigo
        aoConfirmar={async () => {
          await excluir('processos', rascunho.id);
          router.replace(base);
        }}
      />
    </div>
  );
}
