import { Suspense } from 'react';
import { SessaoProvider } from '@/components/sessao';

// Tudo abaixo de /levantamentos lê do aparelho (IndexedDB, data de hoje, URL):
// a casca estática é prerenderizada e o conteúdo entra no cliente.
export default function LayoutLevantamentos({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="spinner-linha min-h-dvh items-center">
          <span className="spinner" />
        </div>
      }
    >
      <SessaoProvider>{children}</SessaoProvider>
    </Suspense>
  );
}
