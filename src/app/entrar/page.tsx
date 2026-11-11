import type { Metadata } from 'next';
import { Suspense } from 'react';
import { modoLocalPermitido } from '@/lib/servidor/sessao';
import { Entrar } from './entrar';

export const metadata: Metadata = { title: 'Entrar' };

// Tela de entrada no estilo da abertura da referência: fundo grafite com a
// esfera 3D, frase grande em branco e a logo da Sheep.
export default function PaginaEntrar() {
  return (
    <main className="card-ia relative flex min-h-dvh flex-col items-center justify-between !rounded-none px-6 pt-10 pb-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/sheep-logo.png" alt="Sheep Technology Services" width={168} height={48} className="invert" />

      <div className="entra flex max-w-md flex-col items-center">
        <span className="esfera" aria-hidden="true" />
        <h1 className="mt-10 text-[40px] leading-[1.05] font-normal tracking-[-0.035em] text-white tablet:text-[48px]">
          Transforme processos em <span className="text-verde">resultado</span>.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65">
          Mapeie os processos de cada cliente, capture com IA e mostre o retorno em horas e reais.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="spinner-linha"><span className="spinner" /></div>}>
          <Entrar clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''} modoLocal={modoLocalPermitido()} />
        </Suspense>
      </div>
    </main>
  );
}
