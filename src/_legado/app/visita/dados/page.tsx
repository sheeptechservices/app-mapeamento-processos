'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconExcluir } from '@/components/icons';
import { useLev } from '@/components/levantamento/contexto';
import { FormLevantamento } from '@/components/levantamento/form-levantamento';
import { Botao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/folha';
import { useRascunho } from '@/lib/local/gravacao';
import { excluirLevantamento } from '@/lib/local/repo';

export default function DadosLevantamento() {
  const router = useRouter();
  const { levantamento, processos } = useLev();
  const { rascunho, mudar } = useRascunho('levantamentos', levantamento);
  const [excluindo, setExcluindo] = useState(false);
  if (!rascunho) return null;

  return (
    <div className="surge space-y-8">
      <div>
        <p className="rotulo">Cadastro</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Dados do levantamento</h1>
        <p className="mt-1 text-sm text-gray">Cada alteração é salva no aparelho na hora.</p>
      </div>

      <FormLevantamento dados={rascunho} mudar={mudar} edicao />

      <section className="rounded-lg border border-vermelho/30 p-4">
        <p className="font-bold">Excluir levantamento</p>
        <p className="mt-1 text-sm text-gray">
          Apaga o levantamento, as áreas e os {processos.length} processos. Use quando o cliente pedir a exclusão dos dados.
        </p>
        <Botao variante="secundario" className="mt-3 text-vermelho" onClick={() => setExcluindo(true)}>
          <IconExcluir size={18} /> Excluir levantamento
        </Botao>
      </section>

      <Confirmar
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Excluir ${levantamento.cliente_nome}?`}
        texto="O levantamento some de todos os aparelhos depois da sincronização. Não dá para desfazer."
        rotuloConfirmar="Excluir tudo"
        perigo
        aoConfirmar={async () => {
          await excluirLevantamento(levantamento.id);
          router.replace('/levantamentos');
        }}
      />
    </div>
  );
}
