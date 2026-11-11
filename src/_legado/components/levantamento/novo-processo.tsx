'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconAlerta, IconCheck, IconMicrofone, IconRaio } from '@/components/icons';
import { Botao } from '@/components/ui/botao';
import { CampoAreaTexto, CampoNumero, CampoTexto, Chips } from '@/components/ui/campos';
import { Folha } from '@/components/ui/folha';
import type { Captura } from '@/lib/dominio';
import { extrairProcesso, type PropostaProcesso } from '@/lib/extrair';
import { reais } from '@/lib/formato';
import { comIndicador } from '@/lib/local/gravacao';
import { atualizar, criarArea, criarCaptura, criarProcesso } from '@/lib/local/repo';
import { rotas } from '@/lib/rotas';
import { cn } from '@/lib/cn';
import { useLev } from './contexto';

type Modo = 'rapido' | 'texto';

/** Uma linha da proposta: mostra o que foi entendido e o que ficou de fora. */
function Entendido({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-gray">{rotulo}</span>
      <span className={cn('numeros text-right font-semibold', !valor && 'font-normal text-gray2')}>{valor ?? 'não informado'}</span>
    </div>
  );
}

/**
 * Captura rápida. Dois jeitos:
 * - Rápido: nome e área, um toque, e o stepper abre para o resto.
 * - Texto livre: o consultor escreve como falaria; o app interpreta no aparelho
 *   (funciona offline) e mostra a proposta. Nada entra sem confirmação.
 * A voz chega na Fase 3, junto com a interpretação por IA.
 */
export function NovoProcesso({
  aberto,
  aoFechar,
  areaInicial,
  capturaInicial,
}: {
  aberto: boolean;
  aoFechar: () => void;
  areaInicial?: string | null;
  /** Abrir direto numa captura guardada antes, para converter. */
  capturaInicial?: Captura | null;
}) {
  const router = useRouter();
  const { levantamento, areas } = useLev();
  const [modo, setModo] = useState<Modo>('rapido');
  const [titulo, setTitulo] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [proposta, setProposta] = useState<PropostaProcesso | null>(null);
  const [captura, setCaptura] = useState<Captura | null>(null);
  const [criando, setCriando] = useState(false);

  // Cada abertura começa limpa: o reset acontece no render em que `aberto` vira true.
  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    if (aberto) {
      setTitulo('');
      setArea(areaInicial ?? (areas.length === 1 ? areas[0].id : null));
      setCriando(false);
      setCaptura(capturaInicial ?? null);
      setTexto(capturaInicial?.conteudo ?? '');
      setProposta(capturaInicial ? extrairProcesso(capturaInicial.conteudo, areas) : null);
      setModo(capturaInicial ? 'texto' : 'rapido');
    }
  }

  const abrirProcesso = (pid: string) => {
    aoFechar();
    router.push(rotas.processo(levantamento.id, pid));
  };

  const criarRapido = async () => {
    setCriando(true);
    const p = await comIndicador(() => criarProcesso(levantamento.id, area, { titulo: titulo.trim() || 'Sem título' }));
    abrirProcesso(p.id);
  };

  const interpretar = async () => {
    const t = texto.trim();
    if (!t) return;
    // A captura fica guardada já na interpretação: se o consultor fechar, ela
    // continua na lista para converter depois.
    const c = captura ?? (await comIndicador(() => criarCaptura(levantamento.id, t)));
    if (captura && captura.conteudo !== t) await atualizar('capturas', captura.id, { conteudo: t });
    setCaptura(c);
    setProposta(extrairProcesso(t, areas));
  };

  const confirmar = async () => {
    if (!proposta) return;
    setCriando(true);
    const p = await comIndicador(async () => {
      let areaId = proposta.area_id;
      if (!areaId && proposta.area_nova) areaId = (await criarArea(levantamento.id, { nome: proposta.area_nova })).id;
      const temNumero = [proposta.vezes_mes, proposta.tempo_medio_min, proposta.perda_mes].some(v => v != null);
      const novo = await criarProcesso(levantamento.id, areaId, {
        titulo: proposta.titulo,
        descricao: proposta.descricao,
        vezes_mes: proposta.vezes_mes,
        tempo_medio_min: proposta.tempo_medio_min,
        pessoas_envolvidas: proposta.pessoas_envolvidas,
        perda_mes: proposta.perda_mes,
        gargalos: proposta.gargalos,
        origem_numero: temNumero ? 'cliente' : null,
      });
      if (captura) await atualizar('capturas', captura.id, { status: 'convertida', processo_gerado_id: novo.id });
      return novo;
    });
    abrirProcesso(p.id);
  };

  const descartar = async () => {
    if (captura) await comIndicador(() => atualizar('capturas', captura.id, { status: 'descartada' }));
    aoFechar();
  };

  const mudarProposta = <K extends keyof PropostaProcesso>(campo: K, valor: PropostaProcesso[K]) =>
    setProposta(p => (p ? { ...p, [campo]: valor } : p));

  const nomeArea = proposta?.area_id ? areas.find(a => a.id === proposta.area_id)?.nome : proposta?.area_nova;

  const rodape =
    modo === 'rapido' ? (
      <Botao variante="primario" tamanho="lg" className="w-full" onClick={criarRapido} disabled={criando}>
        {criando && <span className="spinner sm" />}
        Criar e preencher
      </Botao>
    ) : proposta ? (
      <div className="flex gap-2">
        <Botao tamanho="lg" onClick={descartar} disabled={criando}>
          Descartar
        </Botao>
        <Botao variante="primario" tamanho="lg" className="flex-1" onClick={confirmar} disabled={criando}>
          {criando ? <span className="spinner sm" /> : <IconCheck size={18} />}
          Criar processo
        </Botao>
      </div>
    ) : (
      <Botao variante="escuro" tamanho="lg" className="w-full" onClick={interpretar} disabled={!texto.trim()}>
        <IconRaio size={18} /> Interpretar
      </Botao>
    );

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} rotulo="Captura rápida" titulo="Novo processo" rodape={rodape}>
      <div role="tablist" aria-label="Jeito de capturar" className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-gray4 p-1">
        {(
          [
            ['rapido', 'Nome e área'],
            ['texto', 'Texto livre'],
          ] as const
        ).map(([m, rotulo]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => setModo(m)}
            className={cn(
              'foco min-h-10 rounded-sm text-sm font-semibold transition-[background-color,color,box-shadow]',
              modo === m ? 'bg-superficie text-tinta shadow-card' : 'text-gray hover:text-tinta',
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === 'rapido' ? (
        <form
          key="rapido"
          className="troca space-y-5"
          onSubmit={e => {
            e.preventDefault();
            void criarRapido();
          }}
        >
          <CampoTexto
            rotulo="Nome do processo"
            valor={titulo}
            aoMudar={setTitulo}
            placeholder="Ex.: Importação de XML de notas"
            autoFocus
            enterKeyHint="go"
          />
          {areas.length > 0 ? (
            <Chips rotulo="Área" opcoes={areas.map(a => ({ valor: a.id, rotulo: a.nome }))} valor={area} aoMudar={setArea} />
          ) : (
            <p className="text-sm text-gray">Sem áreas ainda: o processo fica sem área e você escolhe depois.</p>
          )}
        </form>
      ) : !proposta ? (
        <div key="texto" className="troca space-y-3">
          <CampoAreaTexto
            rotulo="Escreva como o cliente contou"
            valor={texto}
            aoMudar={setTexto}
            linhas={4}
            placeholder="Ex.: o fiscal importa XML de uns 300 clientes por mês, cada um leva uns 10 minutos, e erra muito no SPED"
          />
          <p className="flex items-start gap-2 text-xs leading-relaxed text-gray">
            <IconMicrofone size={14} className="mt-px shrink-0" />A gravação por voz e a interpretação por IA chegam na próxima fase. Esta
            leitura roda no aparelho e funciona sem internet.
          </p>
        </div>
      ) : (
        <div key="proposta" className="troca space-y-4">
          <CampoTexto rotulo="Nome do processo" valor={proposta.titulo} aoMudar={v => mudarProposta('titulo', v)} />
          {areas.length > 0 && (
            <Chips
              rotulo="Área"
              opcoes={areas.map(a => ({ valor: a.id, rotulo: a.nome }))}
              valor={proposta.area_id}
              aoMudar={v => setProposta(p => (p ? { ...p, area_id: v, area_nova: v ? null : p.area_nova } : p))}
            />
          )}
          {proposta.area_nova && !proposta.area_id && (
            <p className="surge rounded-md bg-gray4 px-3 py-2 text-[13px]">
              A área <strong>{proposta.area_nova}</strong> ainda não existe e será criada junto.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <CampoNumero rotulo="Vezes por mês" roi decimais valor={proposta.vezes_mes} aoMudar={v => mudarProposta('vezes_mes', v)} />
            <CampoNumero
              rotulo="Tempo médio"
              roi
              sufixo="min"
              decimais
              valor={proposta.tempo_medio_min}
              aoMudar={v => mudarProposta('tempo_medio_min', v)}
            />
          </div>
          <div className="rounded-md border border-gray3 px-3 py-1">
            <Entendido rotulo="Área" valor={nomeArea ?? null} />
            <Entendido rotulo="Pessoas envolvidas" valor={proposta.pessoas_envolvidas != null ? String(proposta.pessoas_envolvidas) : null} />
            <Entendido rotulo="Perda ou receita em risco" valor={proposta.perda_mes != null ? `${reais(proposta.perda_mes)}/mês` : null} />
            <Entendido rotulo="Gargalo" valor={proposta.gargalos} />
          </div>
          {(proposta.vezes_mes == null || proposta.tempo_medio_min == null) && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ambar">
              <IconAlerta size={14} className="mt-px shrink-0" />
              Número que não apareceu no texto fica vazio, nunca chutado. Pergunte ao cliente e complete no processo.
            </p>
          )}
          <button
            type="button"
            onClick={() => setProposta(null)}
            className="foco text-[13px] font-semibold text-gray underline-offset-2 hover:text-tinta hover:underline"
          >
            Editar o texto
          </button>
        </div>
      )}
    </Folha>
  );
}
