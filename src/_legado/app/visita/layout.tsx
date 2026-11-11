import { Suspense } from 'react';
import { SessaoProvider } from '@/components/sessao';
import { LayoutCliente } from './layout-cliente';

// Casca 100% estática: o id do levantamento vem da query string (?l=) e os dados
// do IndexedDB, ambos no cliente. Assim o service worker cacheia uma página só
// por tela e qualquer levantamento abre offline.
export default function LayoutVisita({ children }: LayoutProps<'/visita'>) {
  return (
    <Suspense
      fallback={
        <div className="spinner-linha min-h-dvh items-center">
          <span className="spinner" />
        </div>
      }
    >
      <SessaoProvider>
        <LayoutCliente>{children}</LayoutCliente>
      </SessaoProvider>
    </Suspense>
  );
}
