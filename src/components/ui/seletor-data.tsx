'use client';

import { Popover } from 'radix-ui';
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { IconAnterior, IconCalendario, IconSeta } from '@/components/icons';
import {
  DIAS_SEMANA,
  DIAS_SEMANA_LONGOS,
  diaDaSemana,
  gradeDoMes,
  hojeLocal,
  isoDe,
  MESES,
  MESES_CURTOS,
  partes,
  relativo,
  somarDias,
  somarMeses,
} from '@/lib/calendario';
import { cn } from '@/lib/cn';

const botaoSeta =
  'foco aperta grid size-9 place-items-center rounded-pilula text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta';

/**
 * Calendário da casa. Abre num popover que se reposiciona para caber na tela
 * (vira para cima, encosta na borda) e rola por dentro se a tela for baixa.
 * Teclado: setas andam dia e semana, PageUp/PageDown trocam o mês, Enter escolhe.
 */
function Calendario({
  valor,
  aoEscolher,
  limpavel,
}: {
  valor: string;
  aoEscolher: (iso: string) => void;
  limpavel?: boolean;
}) {
  const hoje = hojeLocal();
  const inicial = partes(valor) ? valor : hoje;
  const [foco, setFoco] = useState(inicial);
  const [modo, setModo] = useState<'dias' | 'meses'>('dias');
  const [direcao, setDirecao] = useState<'esq' | 'dir' | null>(null);
  const viaTeclado = useRef(false);
  const botoes = useRef(new Map<string, HTMLButtonElement>());

  const { ano, mes } = partes(foco)!;
  const grade = gradeDoMes(ano, mes);

  // Foco do teclado acompanha o dia ativo (só quando veio do teclado).
  useEffect(() => {
    if (!viaTeclado.current) return;
    viaTeclado.current = false;
    botoes.current.get(foco)?.focus();
  }, [foco]);

  const irPara = (iso: string, teclado = false) => {
    const a = partes(iso)!;
    if (a.ano !== ano || a.mes !== mes) setDirecao(iso > foco ? 'dir' : 'esq');
    viaTeclado.current = teclado;
    setFoco(iso);
  };

  const teclas = (e: KeyboardEvent) => {
    const passos: Record<string, () => string> = {
      ArrowLeft: () => somarDias(foco, -1),
      ArrowRight: () => somarDias(foco, 1),
      ArrowUp: () => somarDias(foco, -7),
      ArrowDown: () => somarDias(foco, 7),
      PageUp: () => somarMeses(foco, -1),
      PageDown: () => somarMeses(foco, 1),
      Home: () => somarDias(foco, -diaDaSemana(foco)),
      End: () => somarDias(foco, 6 - diaDaSemana(foco)),
    };
    const passo = passos[e.key];
    if (!passo) return;
    e.preventDefault();
    irPara(passo(), true);
  };

  return (
    <div className="w-[min(312px,calc(100vw-24px))] p-3">
      {/* Cabeçalho: mês e ano (abre a escolha de mês) e setas */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={() => setModo(m => (m === 'dias' ? 'meses' : 'dias'))}
          aria-label={modo === 'dias' ? 'Escolher mês e ano' : 'Voltar aos dias'}
          className="foco inline-flex h-9 items-center gap-1 rounded-pilula px-2.5 text-[15px] font-semibold tracking-tight transition-colors hover:bg-sutil"
        >
          <span key={`${ano}-${mes}-${modo}`} className="troca">
            {modo === 'dias' ? `${MESES[mes]} ${ano}` : ano}
          </span>
          <IconSeta size={15} className={cn('text-tinta-3 transition-transform duration-200', modo === 'meses' ? '-rotate-90' : 'rotate-90')} />
        </button>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={modo === 'dias' ? 'Mês anterior' : 'Ano anterior'}
            onClick={() => irPara(somarMeses(foco, modo === 'dias' ? -1 : -12))}
            className={botaoSeta}
          >
            <IconAnterior size={18} />
          </button>
          <button
            type="button"
            aria-label={modo === 'dias' ? 'Próximo mês' : 'Próximo ano'}
            onClick={() => irPara(somarMeses(foco, modo === 'dias' ? 1 : 12))}
            className={botaoSeta}
          >
            <IconSeta size={18} />
          </button>
        </div>
      </div>

      {modo === 'dias' ? (
        <div key={`${ano}-${mes}`} className={cn(direcao === 'dir' ? 'vem-da-direita' : direcao === 'esq' ? 'vem-da-esquerda' : 'troca')}>
          <div className="grid grid-cols-7 pb-1" aria-hidden="true">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="py-1 text-center text-[11px] font-semibold text-tinta-3">
                {d}
              </span>
            ))}
          </div>
          <div role="grid" aria-label={`${MESES[mes]} de ${ano}`} onKeyDown={teclas} className="grid grid-cols-7 gap-y-0.5">
            {grade.map(d => {
              const escolhido = d.iso === valor;
              const eHoje = d.iso === hoje;
              const p = partes(d.iso)!;
              return (
                <button
                  key={d.iso}
                  ref={el => {
                    if (el) botoes.current.set(d.iso, el);
                    else botoes.current.delete(d.iso);
                  }}
                  type="button"
                  role="gridcell"
                  tabIndex={d.iso === foco ? 0 : -1}
                  aria-selected={escolhido}
                  aria-current={eHoje ? 'date' : undefined}
                  aria-label={`${DIAS_SEMANA_LONGOS[diaDaSemana(d.iso)]}, ${p.dia} de ${MESES[p.mes].toLowerCase()} de ${p.ano}`}
                  onClick={() => aoEscolher(d.iso)}
                  className={cn(
                    'foco aperta relative mx-auto grid size-10 place-items-center rounded-pilula text-[14px] tabular-nums transition-colors',
                    escolhido
                      ? 'bg-tinta font-semibold text-sobre-tinta'
                      : eHoje
                        ? 'font-semibold text-tinta hover:bg-sutil'
                        : d.doMes
                          ? 'text-tinta hover:bg-sutil'
                          : 'text-tinta-3/70 hover:bg-sutil',
                  )}
                >
                  {d.dia}
                  {/* Hoje: pontinho verde embaixo do número. */}
                  {eHoje && (
                    <span
                      aria-hidden="true"
                      className={cn('absolute bottom-1 size-1 rounded-pilula', escolhido ? 'bg-verde' : 'bg-verde-tinta')}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div key={`meses-${ano}`} className={cn('grid grid-cols-3 gap-1.5 py-1', direcao === 'dir' ? 'vem-da-direita' : direcao === 'esq' ? 'vem-da-esquerda' : 'troca')}>
          {MESES_CURTOS.map((m, i) => {
            const atual = i === mes;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  const p = partes(foco)!;
                  const ultimo = new Date(Date.UTC(ano, i + 1, 0)).getUTCDate();
                  setDirecao(null);
                  setFoco(isoDe(ano, i, Math.min(p.dia, ultimo)));
                  setModo('dias');
                }}
                className={cn(
                  'foco aperta h-12 rounded-2xl text-[14px] font-medium capitalize transition-colors',
                  atual ? 'bg-tinta text-sobre-tinta' : 'bg-sutil/60 hover:bg-sutil',
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}

      {/* Rodapé: atalho para hoje e, se o campo aceita vazio, limpar. */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-borda pt-2.5">
        {limpavel ? (
          <button
            type="button"
            onClick={() => aoEscolher('')}
            className="foco h-9 rounded-pilula px-3 text-[13px] font-semibold text-tinta-2 transition-colors hover:bg-sutil hover:text-tinta"
          >
            Limpar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => aoEscolher(hoje)}
          className="foco aperta h-9 rounded-pilula bg-sutil px-3.5 text-[13px] font-semibold transition-colors hover:bg-borda"
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

/** "qua, 11/11/2026". */
function dataLegivel(iso: string) {
  const p = partes(iso);
  if (!p) return null;
  const dia = DIAS_SEMANA_LONGOS[diaDaSemana(iso)].slice(0, 3);
  return `${dia}, ${String(p.dia).padStart(2, '0')}/${String(p.mes + 1).padStart(2, '0')}/${p.ano}`;
}

// Tela estreita ou baixa: o popover não teria onde caber, então o calendário
// abre dentro do formulário, empurrando o resto (o painel rola).
const CONSULTA_EMBUTIDO = '(max-width: 619px), (max-height: 640px)';
function assinarTela(aviso: () => void) {
  const m = matchMedia(CONSULTA_EMBUTIDO);
  m.addEventListener('change', aviso);
  return () => m.removeEventListener('change', aviso);
}
const telaApertada = () => matchMedia(CONSULTA_EMBUTIDO).matches;

/**
 * Linha de data dos formulários: mostra a data (com "Hoje", "Amanhã" ao lado)
 * e abre o calendário ao tocar. No desktop, popover que se reposiciona para
 * caber na tela; no celular ou em tela baixa, embutido logo abaixo da linha.
 * `limpavel` para datas opcionais.
 */
export function LinhaData({
  rotulo,
  valor,
  aoMudar,
  limpavel,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (iso: string) => void;
  limpavel?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  // Cada abertura começa no mês da data escolhida.
  const [aberturas, setAberturas] = useState(0);
  const embutido = useSyncExternalStore(assinarTela, telaApertada, () => false);
  const caixa = useRef<HTMLDivElement>(null);

  // Embutido: depois de abrir, rola o painel até o calendário aparecer inteiro (espera o .revelar).
  useEffect(() => {
    if (!aberto || !embutido) return;
    const t = setTimeout(() => caixa.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 260);
    return () => clearTimeout(t);
  }, [aberto, embutido]);
  const legivel = dataLegivel(valor);
  const rel = legivel ? relativo(valor, hojeLocal()) : null;
  let conteudo: ReactNode = <span className="text-tinta-3">Escolher data</span>;
  if (legivel)
    conteudo = (
      <>
        {rel && <span className="rounded-pilula bg-verde-suave px-2 py-0.5 text-[12px] font-semibold text-verde-tinta">{rel}</span>}
        <span className="numeros !font-normal">{legivel}</span>
      </>
    );

  const alternar = (a: boolean) => {
    if (a) setAberturas(n => n + 1);
    setAberto(a);
  };
  const escolher = (iso: string) => {
    aoMudar(iso);
    setAberto(false);
  };

  const gatilho = (
    <button
      type="button"
      aria-expanded={aberto}
      onClick={embutido ? () => alternar(!aberto) : undefined}
      className={cn(
        'foco flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-sutil/50',
        aberto && 'bg-sutil/60',
      )}
    >
      <span className="shrink-0 text-[15px] font-medium">{rotulo}</span>
      <span key={valor} className="troca ml-auto flex min-w-0 items-center gap-2 text-[15px]">
        {conteudo}
      </span>
      <IconCalendario size={18} className={cn('shrink-0 transition-colors', aberto ? 'text-tinta' : 'text-tinta-3')} />
    </button>
  );

  if (embutido)
    return (
      <div>
        {gatilho}
        <div className={cn('revelar', aberto && 'aberto')}>
          <div>
            <div ref={caixa} className="flex justify-center border-t border-borda bg-fundo/50" inert={!aberto}>
              <Calendario key={aberturas} valor={valor} limpavel={limpavel} aoEscolher={escolher} />
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <Popover.Root open={aberto} onOpenChange={alternar}>
      <Popover.Trigger asChild>{gatilho}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          // Abre com o foco no dia escolhido (ou hoje): as setas já andam pela grade.
          onOpenAutoFocus={e => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')?.focus();
          }}
          className="pop-surge z-[70] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[20px] border border-borda bg-superficie shadow-painel outline-none"
        >
          <Calendario valor={valor} limpavel={limpavel} aoEscolher={escolher} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
