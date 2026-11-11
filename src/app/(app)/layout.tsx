import { Suspense } from 'react';
import { Casca } from '@/components/casca/casca';
import { SessaoProvider } from '@/components/sessao';

// As 4 abas são estáticas (prefetch e cache offline); sessão, dados do
// IndexedDB e query string entram no cliente, dentro do Suspense.
export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="spinner-linha min-h-dvh items-center">
          <span className="spinner" />
        </div>
      }
    >
      <SessaoProvider>
        <Casca>{children}</Casca>
      </SessaoProvider>
    </Suspense>
  );
}
