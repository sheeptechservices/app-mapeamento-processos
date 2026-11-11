'use client';

import { useId, useState } from 'react';
import { CampoAreaTexto, CampoNumero, CampoTexto, Chips, Etiquetas } from '@/components/ui/campos';
import { SEGMENTOS, STATUS_LEVANTAMENTO, type Dados, type Levantamento } from '@/lib/dominio';
import { dataCurta, hojeISO } from '@/lib/formato';
import { cn } from '@/lib/cn';

type Mudar = <K extends keyof Dados<Levantamento>>(campo: K, valor: Dados<Levantamento>[K]) => void;

/** Data digitada DD/MM/AAAA com atalho "Hoje", no lugar do seletor nativo. */
function CampoData({ valor, aoMudar }: { valor: string; aoMudar: (iso: string) => void }) {
  const id = useId();
  const [texto, setTexto] = useState(dataCurta(valor));
  const [valorVisto, setValorVisto] = useState(valor);
  if (valor !== valorVisto) {
    setValorVisto(valor);
    setTexto(dataCurta(valor));
  }
  const mascarar = (t: string) => {
    const d = t.replace(/\D/g, '').slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-gray">
        Data da visita
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          className="campo numeros"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          value={texto}
          onChange={e => {
            const m = mascarar(e.target.value);
            setTexto(m);
            const [d, mes, a] = m.split('/');
            if (a?.length === 4 && Number(mes) >= 1 && Number(mes) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
              aoMudar(`${a}-${mes}-${d}`);
            }
          }}
        />
        <button
          type="button"
          onClick={() => aoMudar(hojeISO())}
          className={cn(
            'foco min-h-[var(--toque)] shrink-0 rounded-md border px-4 text-sm font-semibold transition-colors',
            valor === hojeISO() ? 'border-tinta bg-tinta text-bg' : 'border-gray3 hover:bg-gray4',
          )}
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

export function FormLevantamento({ dados, mudar, edicao }: { dados: Dados<Levantamento>; mudar: Mudar; edicao?: boolean }) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="rotulo">Cliente</h2>
        <CampoTexto
          rotulo="Nome do cliente"
          valor={dados.cliente_nome}
          aoMudar={v => mudar('cliente_nome', v)}
          placeholder="Ex.: Contabilidade Horizonte"
          autoComplete="organization"
          enterKeyHint="next"
          autoFocus={!edicao}
        />
        <Chips
          rotulo="Segmento"
          opcoes={SEGMENTOS.map(s => ({ valor: s, rotulo: s }))}
          valor={dados.segmento}
          aoMudar={v => mudar('segmento', v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto rotulo="Cidade" valor={dados.cidade} aoMudar={v => mudar('cidade', v || null)} placeholder="Ex.: Maringá/PR" />
          <CampoData valor={dados.data} aoMudar={v => mudar('data', v)} />
        </div>
        <Etiquetas
          rotulo="Participantes da visita"
          valor={dados.participantes}
          aoMudar={v => mudar('participantes', v)}
          placeholder="Nome e cargo, Enter para adicionar"
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="rotulo">Base do ROI</h2>
          <p className="mt-1 text-xs text-gray">
            O custo médio da hora vale para todos os processos que não tiverem um custo próprio.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoNumero
            rotulo="Custo médio da hora"
            roi
            prefixo="R$"
            decimais
            valor={dados.custo_hora}
            aoMudar={v => mudar('custo_hora', v)}
            placeholder="45"
            dica="Salário com encargos dividido pelas horas do mês"
          />
          <CampoNumero rotulo="Funcionários" valor={dados.funcionarios} aoMudar={v => mudar('funcionarios', v)} placeholder="26" />
          <CampoNumero
            rotulo="Faturamento mensal"
            prefixo="R$"
            decimais
            valor={dados.faturamento_mensal}
            aoMudar={v => mudar('faturamento_mensal', v)}
            placeholder="Opcional"
          />
        </div>
      </section>

      {edicao && (
        <section className="space-y-4">
          <h2 className="rotulo">Andamento</h2>
          <Chips
            rotulo="Status"
            permitirLimpar={false}
            opcoes={STATUS_LEVANTAMENTO}
            valor={dados.status}
            aoMudar={v => v && mudar('status', v)}
          />
          <CampoAreaTexto
            rotulo="Observações gerais"
            valor={dados.observacoes}
            aoMudar={v => mudar('observacoes', v || null)}
            placeholder="Contexto do cliente, objetivo da visita, o que o sócio quer resolver"
          />
        </section>
      )}

      <section>
        <label className="cartao flex cursor-pointer items-start gap-3 p-4">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-[var(--black)]"
            checked={dados.consentimento_gravacao}
            onChange={e => mudar('consentimento_gravacao', e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold">O cliente autorizou gravar áudio na visita</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-gray">
              Necessário para a captura por voz (LGPD). Os áudios podem ser apagados a qualquer momento junto com o
              levantamento.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
