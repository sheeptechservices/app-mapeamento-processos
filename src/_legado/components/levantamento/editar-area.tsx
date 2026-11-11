'use client';

import { useState } from 'react';
import { IconExcluir } from '@/components/icons';
import { Botao } from '@/components/ui/botao';
import { CampoAreaTexto, CampoNumero, CampoTexto } from '@/components/ui/campos';
import { Confirmar, Folha } from '@/components/ui/folha';
import type { Area } from '@/lib/dominio';
import { useRascunho } from '@/lib/local/gravacao';
import { excluirArea } from '@/lib/local/repo';

function Campos({ area }: { area: Area }) {
  const { rascunho, mudar } = useRascunho('areas', area);
  if (!rascunho) return null;
  return (
    <div className="space-y-4">
      <CampoTexto rotulo="Nome da área" valor={rascunho.nome} aoMudar={v => mudar('nome', v)} />
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <CampoTexto
          rotulo="Responsável"
          valor={rascunho.responsavel}
          aoMudar={v => mudar('responsavel', v || null)}
          placeholder="Nome"
          autoComplete="off"
        />
        <CampoNumero rotulo="Pessoas" valor={rascunho.pessoas} aoMudar={v => mudar('pessoas', v)} placeholder="0" />
      </div>
      <CampoAreaTexto
        rotulo="O que a área entrega"
        valor={rascunho.entrega}
        aoMudar={v => mudar('entrega', v || null)}
        linhas={2}
        placeholder="Ex.: Apuração de impostos e obrigações acessórias"
      />
    </div>
  );
}

export function EditarArea({ area, aoFechar }: { area: Area | null; aoFechar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <>
      <Folha
        aberta={!!area}
        aoFechar={aoFechar}
        rotulo="Área"
        titulo={area?.nome || 'Sem nome'}
        rodape={
          <div className="flex gap-2">
            <Botao variante="fantasma" className="text-vermelho" onClick={() => setConfirmar(true)}>
              <IconExcluir size={18} /> Excluir
            </Botao>
            <Botao variante="escuro" className="flex-1" onClick={aoFechar}>
              Pronto
            </Botao>
          </div>
        }
      >
        {area && <Campos area={area} />}
      </Folha>
      <Confirmar
        aberta={confirmar}
        aoFechar={() => setConfirmar(false)}
        titulo="Excluir área?"
        texto="Os processos desta área não são apagados: eles ficam em Sem área."
        rotuloConfirmar="Excluir área"
        perigo
        aoConfirmar={async () => {
          if (area) await excluirArea(area.id);
          aoFechar();
        }}
      />
    </>
  );
}
