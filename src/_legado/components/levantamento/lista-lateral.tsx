'use client';

import { IconAdicionar } from '@/components/icons';
import { useLev } from './contexto';
import { ProcessoLinha } from './processo-linha';

/** Coluna esquerda do desktop: processos agrupados por área. */
export function ListaLateral({ aoNovo }: { aoNovo: () => void }) {
  const { areas, processos } = useLev();
  const semArea = processos.filter(p => !p.area_id || !areas.some(a => a.id === p.area_id));

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-gray3">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="rotulo">Processos ({processos.length})</p>
        <button
          type="button"
          onClick={aoNovo}
          aria-label="Novo processo"
          className="foco grid size-8 place-items-center rounded-md text-gray transition-colors hover:bg-gray4 hover:text-tinta"
        >
          <IconAdicionar size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
        {areas.map(a => {
          const lista = processos.filter(p => p.area_id === a.id);
          return (
            <div key={a.id}>
              <p className="px-2 pb-1 text-xs font-bold text-gray">{a.nome}</p>
              {lista.length ? (
                lista.map(p => <ProcessoLinha key={p.id} processo={p} compacta />)
              ) : (
                <p className="px-2 text-xs text-gray2">Nenhum processo</p>
              )}
            </div>
          );
        })}
        {semArea.length > 0 && (
          <div>
            <p className="px-2 pb-1 text-xs font-bold text-gray">Sem área</p>
            {semArea.map(p => (
              <ProcessoLinha key={p.id} processo={p} compacta />
            ))}
          </div>
        )}
        {!areas.length && !processos.length && (
          <p className="px-2 text-sm leading-relaxed text-gray">Adicione as áreas do cliente para começar a mapear.</p>
        )}
      </div>
    </div>
  );
}
