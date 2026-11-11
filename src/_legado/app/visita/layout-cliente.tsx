'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CascaLevantamento } from '@/components/levantamento/casca';
import { LevantamentoProvider } from '@/components/levantamento/contexto';
import { estiloBotao } from '@/components/ui/botao';
import { rotas } from '@/lib/rotas';

export function LayoutCliente({ children }: { children: React.ReactNode }) {
  const id = useSearchParams().get('l') ?? '';
  return (
    <LevantamentoProvider
      id={id}
      carregando={
        <div className="spinner-linha min-h-dvh items-center">
          <span className="spinner" />
        </div>
      }
      inexistente={
        <div className="surge grid min-h-dvh place-items-center px-4 text-center">
          <div>
            <h1 className="text-lg font-bold">Levantamento não encontrado</h1>
            <p className="mt-1 text-sm text-gray">Ele pode ter sido excluído ou ainda não chegou a este aparelho.</p>
            <Link href={rotas.lista} className={estiloBotao({ variante: 'escuro' }) + ' mt-5'}>
              Ver levantamentos
            </Link>
          </div>
        </div>
      }
    >
      <CascaLevantamento>{children}</CascaLevantamento>
    </LevantamentoProvider>
  );
}
