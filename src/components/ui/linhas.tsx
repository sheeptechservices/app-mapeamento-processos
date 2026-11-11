'use client';

// Conteúdo do painel: grupos brancos com linhas (rótulo à esquerda, valor à
// direita, seta). Tocar numa linha com seta abre uma sub-tela.
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconBusca, IconCheck, IconImagem, IconSeta } from '@/components/icons';
import { cn } from '@/lib/cn';
import { lerNumero, numeroParaCampo } from '@/lib/formato';
import { ErroLogo, reduzirLogo } from '@/lib/logo';
import { Avatar } from './avatar';
import { usePainelOpcional } from './painel';

export function Grupo({ titulo, children, rodape }: { titulo?: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <section className="mt-4 first:mt-2">
      {titulo && <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-tinta-2">{titulo}</h3>}
      <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-superficie">{children}</div>
      {rodape && <p className="mt-1.5 px-1 text-xs leading-relaxed text-tinta-2">{rodape}</p>}
    </section>
  );
}

/** Linha que abre uma sub-tela. */
export function Linha({
  rotulo,
  valor,
  vazio = 'Não informado',
  subtela,
  aoClicar,
  destaque,
}: {
  rotulo: string;
  valor?: ReactNode;
  vazio?: string;
  subtela?: string;
  aoClicar?: () => void;
  destaque?: boolean;
}) {
  const painel = usePainelOpcional();
  const temValor = valor !== null && valor !== undefined && valor !== '';
  return (
    <button
      type="button"
      onClick={() => {
        aoClicar?.();
        if (subtela && painel) painel.abrir(subtela);
      }}
      className="foco flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-sutil"
    >
      <span className={cn('shrink-0 text-[15px]', destaque ? 'font-semibold' : 'font-medium')}>{rotulo}</span>
      <span className={cn('min-w-0 flex-1 truncate text-right text-[15px]', temValor ? 'text-tinta-2' : 'text-tinta-3')}>
        {temValor ? valor : vazio}
      </span>
      <IconSeta size={18} className="shrink-0 text-tinta-3" />
    </button>
  );
}

const classeEntrada =
  'min-w-0 flex-1 bg-transparent py-3 text-right text-[15px] text-tinta outline-none placeholder:text-tinta-3';

/** Texto curto direto na linha. */
export function LinhaTexto({
  rotulo,
  valor,
  aoMudar,
  placeholder = 'Não informado',
  tipo = 'text',
  autoFocus,
}: {
  rotulo: string;
  valor: string | null | undefined;
  aoMudar: (v: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'email' | 'tel';
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4 focus-within:bg-sutil/60">
      <label htmlFor={id} className="shrink-0 text-[15px] font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        inputMode={tipo === 'tel' ? 'tel' : tipo === 'email' ? 'email' : undefined}
        className={classeEntrada}
        value={valor ?? ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={e => aoMudar(e.target.value)}
      />
    </div>
  );
}

/**
 * Número direto na linha, com teclado numérico e vírgula decimal (pt-BR).
 * Vazio guarda `null`: vazio é "não informado", nunca zero.
 */
export function LinhaNumero({
  rotulo,
  valor,
  aoMudar,
  prefixo,
  sufixo,
  decimais,
  placeholder = 'Não informado',
  dica,
  acessorio,
}: {
  rotulo: string;
  valor: number | null | undefined;
  aoMudar: (v: number | null) => void;
  prefixo?: string;
  sufixo?: string;
  decimais?: boolean;
  placeholder?: string;
  dica?: ReactNode;
  /** Controle depois do campo (ex.: escolha de unidade). */
  acessorio?: ReactNode;
}) {
  const id = useId();
  const [texto, setTexto] = useState(() => numeroParaCampo(valor));
  const [focado, setFocado] = useState(false);
  // Valor que mudou por fora entra no campo, mas nunca por cima de quem digita.
  const [valorVisto, setValorVisto] = useState(valor);
  if (valor !== valorVisto) {
    setValorVisto(valor);
    if (!focado) setTexto(numeroParaCampo(valor));
  }

  return (
    <div className="px-4 focus-within:bg-sutil/60">
      <div className="flex min-h-[52px] items-center gap-2">
        <label htmlFor={id} className="shrink-0 text-[15px] font-medium">
          {rotulo}
        </label>
        {prefixo && texto && <span className="ml-auto text-[15px] text-tinta-2">{prefixo}</span>}
        <input
          id={id}
          className={cn(classeEntrada, 'numeros !font-normal', prefixo && texto && 'flex-none')}
          style={prefixo && texto ? { width: `${Math.max(texto.length, 2) + 1}ch` } : undefined}
          inputMode={decimais ? 'decimal' : 'numeric'}
          enterKeyHint="next"
          autoComplete="off"
          placeholder={placeholder}
          value={texto}
          onFocus={() => setFocado(true)}
          onBlur={() => {
            setFocado(false);
            setTexto(numeroParaCampo(valor));
          }}
          onChange={e => {
            const limpo = e.target.value.replace(decimais ? /[^\d.,]/g : /[^\d]/g, '');
            setTexto(limpo);
            aoMudar(lerNumero(limpo));
          }}
        />
        {sufixo && texto && <span className="text-[15px] text-tinta-2">{sufixo}</span>}
        {acessorio}
      </div>
      {dica && <p className="-mt-1.5 pb-2.5 text-right text-xs text-tinta-2">{dica}</p>}
    </div>
  );
}

/** Texto longo: rótulo em cima, campo que cresce com o conteúdo. */
export function LinhaTextoLongo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  linhas = 2,
}: {
  rotulo: string;
  valor: string | null | undefined;
  aoMudar: (v: string) => void;
  placeholder?: string;
  linhas?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }, [valor]);
  return (
    <div className="px-4 pt-3 pb-2 focus-within:bg-sutil/60">
      <label htmlFor={id} className="block text-[13px] font-medium text-tinta-2">
        {rotulo}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={linhas}
        className="mt-1 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-tinta-3"
        placeholder={placeholder ?? 'Não informado'}
        value={valor ?? ''}
        onChange={e => aoMudar(e.target.value)}
      />
    </div>
  );
}

/** Interruptor (sim/não) na linha. */
export function LinhaInterruptor({
  rotulo,
  dica,
  ligado,
  aoMudar,
}: {
  rotulo: string;
  dica?: string;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => aoMudar(!ligado)}
      className="foco flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-sutil"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{rotulo}</span>
        {dica && <span className="block text-xs text-tinta-2">{dica}</span>}
      </span>
      <span
        className={cn(
          'relative h-[26px] w-[44px] shrink-0 rounded-pilula transition-colors duration-200',
          ligado ? 'bg-tinta' : 'bg-borda-forte',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] left-[3px] size-5 rounded-pilula bg-superficie shadow-card transition-transform duration-200 ease-v6',
            ligado && 'translate-x-[18px]',
          )}
        />
      </span>
    </button>
  );
}

/** Segmentado por toque (2 a 4 opções curtas). */
export function Segmentado<T extends string | number>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  permitirLimpar = true,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T | null | undefined;
  aoMudar: (v: T | null) => void;
  rotulo: string;
  permitirLimpar?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-[13px] font-medium text-tinta-2">{rotulo}</p>
      <div role="radiogroup" aria-label={rotulo} className="grid auto-cols-fr grid-flow-col gap-1 rounded-pilula bg-sutil p-1">
        {opcoes.map(o => {
          const ativo = o.valor === valor;
          return (
            <button
              key={String(o.valor)}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(ativo && permitirLimpar ? null : o.valor)}
              className={cn(
                'foco min-h-10 truncate rounded-pilula px-2 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150',
                ativo ? 'bg-superficie text-tinta shadow-card' : 'text-tinta-2 hover:text-tinta',
              )}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface OpcaoLista<T> {
  valor: T;
  rotulo: string;
  dica?: string;
  contagem?: number;
}

/**
 * Sub-tela de escolha: rádio (uma) ou checkbox (várias), com busca quando a
 * lista é longa e contagem por item.
 */
export function ListaEscolha<T extends string | number>({
  opcoes,
  selecionados,
  aoMudar,
  multiplo,
  buscaAPartirDe = 7,
  aoCriar,
}: {
  opcoes: OpcaoLista<T>[];
  selecionados: T[];
  aoMudar: (v: T[]) => void;
  multiplo?: boolean;
  buscaAPartirDe?: number;
  /** Permite criar um item novo a partir da busca (ex.: setor que não está na lista). */
  aoCriar?: (texto: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const painel = usePainelOpcional();
  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? opcoes.filter(o => o.rotulo.toLowerCase().includes(t)) : opcoes;
  }, [busca, opcoes]);
  const exato = opcoes.some(o => o.rotulo.toLowerCase() === busca.trim().toLowerCase());

  const tocar = (v: T) => {
    if (multiplo) aoMudar(selecionados.includes(v) ? selecionados.filter(x => x !== v) : [...selecionados, v]);
    else {
      aoMudar(selecionados.includes(v) ? [] : [v]);
      painel?.voltar();
    }
  };

  return (
    <div>
      {opcoes.length >= buscaAPartirDe && (
        <label className="relative mt-2 block">
          <IconBusca size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-tinta-3" />
          <input
            className="campo !rounded-pilula !pl-10"
            placeholder="Buscar"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            aria-label="Buscar na lista"
          />
        </label>
      )}
      <Grupo>
        <div key={visiveis.map(v => v.valor).join()} className="cascata divide-y divide-borda">
          {visiveis.map(o => {
            const marcado = selecionados.includes(o.valor);
            return (
              <button
                key={String(o.valor)}
                type="button"
                role={multiplo ? 'checkbox' : 'radio'}
                aria-checked={marcado}
                onClick={() => tocar(o.valor)}
                className="foco flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-sutil"
              >
                <span
                  className={cn(
                    'grid size-[22px] shrink-0 place-items-center border-[1.5px] transition-colors',
                    multiplo ? 'rounded-md' : 'rounded-pilula',
                    marcado ? 'border-tinta bg-tinta text-sobre-tinta' : 'border-borda-forte',
                  )}
                >
                  {marcado && <IconCheck size={14} strokeWidth={2.6} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px]">{o.rotulo}</span>
                  {o.dica && <span className="block text-xs text-tinta-2">{o.dica}</span>}
                </span>
                {o.contagem !== undefined && <span className="numeros text-[13px] text-tinta-2">{o.contagem}</span>}
              </button>
            );
          })}
          {!visiveis.length && !aoCriar && <p className="px-4 py-4 text-[13px] text-tinta-2">Nada encontrado.</p>}
          {aoCriar && busca.trim() && !exato && (
            <button
              type="button"
              onClick={() => {
                aoCriar(busca.trim());
                setBusca('');
              }}
              className="foco flex min-h-[52px] w-full items-center px-4 text-left text-[15px] font-semibold transition-colors hover:bg-sutil"
            >
              Adicionar &quot;{busca.trim()}&quot;
            </button>
          )}
        </div>
      </Grupo>
    </div>
  );
}

/** Texto com máscara (CNPJ, telefone) direto na linha. */
export function LinhaMascara({
  rotulo,
  valor,
  aoMudar,
  mascara,
  modo = 'numeric',
  placeholder = 'Não informado',
}: {
  rotulo: string;
  valor: string | null | undefined;
  aoMudar: (v: string | null) => void;
  mascara: (t: string) => string;
  modo?: 'numeric' | 'tel';
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4 focus-within:bg-sutil/60">
      <label htmlFor={id} className="shrink-0 text-[15px] font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        inputMode={modo}
        className={cn(classeEntrada, 'numeros !font-normal')}
        value={valor ?? ''}
        placeholder={placeholder}
        onChange={e => {
          const m = mascara(e.target.value);
          aoMudar(m || null);
        }}
      />
    </div>
  );
}

// Data: calendário da casa num popover (seletor-data.tsx).
export { LinhaData } from './seletor-data';

/** Logo do cliente: prévia, enviar (reduzida a 256px no aparelho) e remover. */
export function LinhaLogo({
  nome,
  valor,
  aoMudar,
}: {
  nome: string;
  valor: string | null;
  aoMudar: (dataUrl: string | null) => void;
}) {
  const id = useId();
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Avatar nome={nome || 'Cliente'} imagem={valor} tamanho={64} quadrado />
      <div className="min-w-0 flex-1">
        <p className="text-[15px]">Logo</p>
        <p className="text-xs text-tinta-2">{erro ?? 'PNG, JPG, SVG ou WebP. Sem logo, aparecem as iniciais.'}</p>
        <div className="mt-2 flex gap-2">
          <label
            htmlFor={id}
            className="foco inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-pilula bg-tinta px-3.5 text-[13px] font-semibold text-sobre-tinta transition-transform focus-within:outline-2 hover:-translate-y-px"
          >
            {lendo ? <span className="spinner sm" /> : <IconImagem size={16} />}
            {valor ? 'Trocar' : 'Enviar logo'}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async e => {
              const arquivo = e.target.files?.[0];
              e.target.value = '';
              if (!arquivo) return;
              setLendo(true);
              try {
                aoMudar(await reduzirLogo(arquivo));
                setErro(null);
              } catch (err) {
                setErro(err instanceof ErroLogo ? err.message : 'Não foi possível ler a imagem.');
              } finally {
                setLendo(false);
              }
            }}
          />
          {valor && (
            <button
              type="button"
              onClick={() => aoMudar(null)}
              className="foco h-9 rounded-pilula border border-borda-forte px-3.5 text-[13px] font-semibold transition-colors hover:bg-sutil"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
