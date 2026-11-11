'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconVoltar } from '@/components/icons';
import { FormLevantamento } from '@/components/levantamento/form-levantamento';
import { Botao } from '@/components/ui/botao';
import type { Dados, Levantamento } from '@/lib/dominio';
import { criarLevantamento, dadosLevantamentoVazio } from '@/lib/local/repo';
import { rotas } from '@/lib/rotas';

export default function NovoLevantamento() {
  const router = useRouter();
  const [dados, setDados] = useState<Dados<Levantamento>>(dadosLevantamentoVazio);
  const [criando, setCriando] = useState(false);
  const podeCriar = dados.cliente_nome.trim().length > 0 && !criando;

  const criar = async () => {
    if (!podeCriar) return;
    setCriando(true);
    const lev = await criarLevantamento({ ...dados, cliente_nome: dados.cliente_nome.trim() });
    router.replace(rotas.lev(lev.id));
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 sm:px-6">
      <header className="flex items-center gap-2 py-3">
        <Link
          href="/levantamentos"
          aria-label="Voltar"
          className="foco -ml-2 grid size-[var(--toque)] place-items-center rounded-md transition-colors hover:bg-gray4"
        >
          <IconVoltar />
        </Link>
        <h1 className="font-bold">Novo levantamento</h1>
      </header>

      <form
        className="surge pt-2 pb-32"
        onSubmit={e => {
          e.preventDefault();
          void criar();
        }}
      >
        <FormLevantamento dados={dados} mudar={(c, v) => setDados(d => ({ ...d, [c]: v }))} />
        <div className="pb-seguro fixed inset-x-0 bottom-0 border-t border-gray3 bg-bg/90 px-4 py-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
          <Botao type="submit" variante="primario" tamanho="lg" className="w-full sm:w-auto" disabled={!podeCriar}>
            {criando && <span className="spinner sm" />}
            Criar e começar
          </Botao>
        </div>
      </form>
    </div>
  );
}
