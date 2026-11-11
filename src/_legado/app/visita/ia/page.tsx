'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconAlerta, IconCheckCirculo, IconIA, IconRaio, IconSeta } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import { NovoProcesso } from '@/components/levantamento/novo-processo';
import type { Captura } from '@/lib/dominio';
import { ROTULO_CAMPO_ROI } from '@/lib/roi';
import { rotas } from '@/lib/rotas';

export default function PainelIA() {
  const { levantamento, processos, roiDe, capturas } = useLev();
  const [convertendo, setConvertendo] = useState<Captura | null>(null);
  const pendentes = capturas.filter(c => c.status === 'pendente');
  const lacunas = processos
    .filter(p => p.status !== 'descartado')
    .map(p => ({ p, r: roiDe(p) }))
    .filter(({ r }) => !r.completo);

  return (
    <div className="surge space-y-6">
      <div>
        <p className="rotulo">Análise</p>
        <h1 className="text-2xl font-extrabold tracking-tight">IA</h1>
      </div>

      <section className="cartao p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="rotulo">Lacunas de números</p>
          <span className="numeros text-xs font-semibold text-gray">{lacunas.length}</span>
        </div>
        {lacunas.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-verde">
            <IconCheckCirculo size={18} />
            {processos.length ? 'Todos os processos têm volume, tempo e custo da hora.' : 'Nenhum processo registrado ainda.'}
          </p>
        ) : (
          <ul key={lacunas.map(l => l.p.id).join()} className="lista-anima -mx-2">
            {lacunas.map(({ p, r }) => (
              <li key={p.id}>
                <Link
                  href={rotas.processo(levantamento.id, p.id)}
                  className="foco flex min-h-[52px] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-gray4"
                >
                  <IconAlerta size={16} className="shrink-0 text-ambar" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {p.codigo} - {p.titulo || 'Sem título'}
                    </span>
                    <span className="block text-xs text-gray">
                      Pergunte: {r.faltando.map(c => ROTULO_CAMPO_ROI[c]).join(', ')}
                    </span>
                  </span>
                  <IconSeta size={16} className="text-gray2" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendentes.length > 0 && (
        <section className="cartao p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="rotulo">Capturas para converter</p>
            <span className="numeros text-xs font-semibold text-gray">{pendentes.length}</span>
          </div>
          <ul key={pendentes.map(c => c.id).join()} className="lista-anima -mx-2">
            {pendentes.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setConvertendo(c)}
                  className="foco flex min-h-[52px] w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-gray4"
                >
                  <IconRaio size={16} className="shrink-0 text-gray" />
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm">{c.conteudo}</span>
                  <IconSeta size={16} className="shrink-0 text-gray2" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NovoProcesso aberto={!!convertendo} aoFechar={() => setConvertendo(null)} capturaInicial={convertendo} />

      <section className="rounded-lg border border-dashed border-gray3 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-limao text-on-limao">
            <IconIA size={20} />
          </span>
          <div>
            <p className="font-bold">Análise com IA chega na Fase 3</p>
            <p className="mt-1 text-sm leading-relaxed text-gray">
              Insights e convergências entre áreas, oportunidades de automação, riscos e próximas perguntas, sempre com o processo
              de origem citado. As lacunas acima já são calculadas no aparelho e funcionam sem conexão.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
