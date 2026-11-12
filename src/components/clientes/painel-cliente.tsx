'use client';

import { useState } from 'react';
import { IconExcluir } from '@/components/icons';
import { Confirmar } from '@/components/ui/confirmar';
import {
  Grupo,
  Linha,
  LinhaData,
  LinhaLogo,
  LinhaMascara,
  LinhaNumero,
  LinhaTexto,
  LinhaTextoLongo,
  ListaEscolha,
} from '@/components/ui/linhas';
import { Painel, RodapePainel } from '@/components/ui/painel';
import { useGlossarioCliente } from '@/components/clientes/glossario';
import { LinhaTextoRico } from '@/components/ui/texto-rico';
import { ESTAGIOS_CLIENTE, rotuloDe, SEGMENTOS, type Cliente } from '@/lib/dominio';
import { mascaraCnpj, mascaraTelefone, reais } from '@/lib/formato';
import { useCarteira } from '@/lib/local/carteira';
import { comIndicador, useFormulario } from '@/lib/local/gravacao';
import { criarCliente, dadosClienteVazio, excluirCliente, lembrarOpcao } from '@/lib/local/repo';
import { AvisoRascunho } from '@/components/ui/aviso-rascunho';
import { cn } from '@/lib/cn';

/**
 * Cadastrar (cliente = null) ou ver e editar um cliente. Editando, cada campo
 * salva sozinho; cadastrando, os dados só entram ao tocar em Salvar.
 */
export function PainelCliente({
  aberto,
  aoFechar,
  cliente,
  aoCriar,
  podeEditar = true,
}: {
  aberto: boolean;
  aoFechar: () => void;
  cliente: Cliente | null;
  aoCriar?: (c: Cliente) => void;
  podeEditar?: boolean;
}) {
  const carteira = useCarteira();
  // Cadastro novo: o que for digitado fica num rascunho no aparelho até o Salvar.
  const { dados, mudar, editando, reiniciar, recuperado, descartar, concluir } = useFormulario(
    'clientes',
    cliente,
    dadosClienteVazio,
    aberto && !cliente ? 'cliente' : null,
  );
  const [excluindo, setExcluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Cada cadastro novo começa limpo.
  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    if (aberto && !cliente) {
      reiniciar();
      setSalvando(false);
    }
  }

  const sessoes = cliente ? (carteira?.sessoes.filter(s => s.cliente_id === cliente.id).length ?? 0) : 0;
  const processos = cliente ? (carteira?.processos.filter(p => p.cliente_id === cliente.id).length ?? 0) : 0;
  // Padrões + os criados pela equipe + os que já estão em uso: opção criada nunca some da lista.
  const segmentos = [
    ...new Set([
      ...SEGMENTOS,
      ...(carteira?.config.segmentos ?? []),
      ...(carteira?.clientes.map(c => c.segmento).filter((s): s is string => !!s) ?? []),
      ...(dados?.segmento ? [dados.segmento] : []),
    ]),
  ];

  const salvar = async () => {
    if (!dados?.nome.trim()) return;
    setSalvando(true);
    const novo = await comIndicador(() => criarCliente({ ...dados, nome: dados.nome.trim() }));
    concluir();
    aoFechar();
    aoCriar?.(novo);
  };

  // Glossário do cliente (termos e definições), com as sub-telas de novo e editar termo.
  const { grupo: grupoGlossario, subtelas: subtelasGlossario } = useGlossarioCliente(cliente?.id ?? null, podeEditar);
  const rodape = editando ? (
    <div className="flex gap-2">
      {podeEditar && (
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          className="foco inline-flex min-h-12 items-center gap-2 rounded-pilula bg-risco px-5 text-[14px] font-semibold text-white transition-[filter,translate,scale] hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
        >
          <IconExcluir size={17} /> Excluir
        </button>
      )}
      <button
        type="button"
        onClick={aoFechar}
        className="foco min-h-12 flex-1 rounded-pilula bg-tinta text-[14px] font-semibold text-sobre-tinta transition-transform hover:-translate-y-px active:scale-[0.97]"
      >
        Pronto
      </button>
    </div>
  ) : (
    <RodapePainel
      secundario={{ rotulo: 'Cancelar', acao: aoFechar }}
      primario={{
        rotulo: salvando ? <span className="spinner sm" /> : 'Salvar cliente',
        acao: salvar,
        desabilitado: !dados?.nome.trim() || salvando,
      }}
    />
  );

  return (
    <>
      <Painel
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={editando ? 'Cliente' : 'Novo cliente'}
        rodape={rodape}
        subtelas={{
          ...subtelasGlossario,
          segmento: {
            titulo: 'Segmento',
            conteudo: (
              <ListaEscolha
                opcoes={segmentos.map(s => ({ valor: s, rotulo: s }))}
                selecionados={dados?.segmento ? [dados.segmento] : []}
                aoMudar={([v]) => mudar('segmento', v ?? null)}
                aoCriar={t => {
                  mudar('segmento', t);
                  void lembrarOpcao('segmentos', t);
                }}
                buscaAPartirDe={0}
              />
            ),
          },
          estagio: {
            titulo: 'Estágio',
            conteudo: (
              <ListaEscolha
                opcoes={ESTAGIOS_CLIENTE}
                selecionados={dados ? [dados.estagio] : []}
                aoMudar={([v]) => v && mudar('estagio', v)}
              />
            ),
          },
        }}
      >
        {dados && (
          <fieldset disabled={!podeEditar} className={cn('contents', !podeEditar && 'opacity-80')}>
            {recuperado && !editando && <AvisoRascunho aoDescartar={descartar} />}
            <Grupo>
              <LinhaLogo nome={dados.nome} valor={dados.logo} aoMudar={v => mudar('logo', v)} />
            </Grupo>
            <Grupo titulo="Identificação">
              <LinhaTexto
                rotulo="Nome"
                valor={dados.nome}
                aoMudar={v => mudar('nome', v)}
                placeholder="Obrigatório"
                autoFocus={!editando}
              />
              <LinhaMascara rotulo="CNPJ" valor={dados.cnpj} aoMudar={v => mudar('cnpj', v)} mascara={mascaraCnpj} />
              <Linha rotulo="Segmento" valor={dados.segmento} subtela="segmento" />
              <LinhaTexto rotulo="Cidade" valor={dados.cidade} aoMudar={v => mudar('cidade', v || null)} placeholder="Ex.: Maringá/PR" />
              <Linha rotulo="Estágio" valor={rotuloDe(ESTAGIOS_CLIENTE, dados.estagio)} subtela="estagio" />
            </Grupo>
            <Grupo titulo="Empresa">
              <LinhaTexto rotulo="Razão social" valor={dados.razao_social} aoMudar={v => mudar('razao_social', v || null)} />
              <LinhaTexto
                rotulo="Atividade"
                valor={dados.atividade}
                aoMudar={v => mudar('atividade', v || null)}
                placeholder="CNAE principal"
              />
              <LinhaTexto rotulo="Porte" valor={dados.porte} aoMudar={v => mudar('porte', v || null)} placeholder="Ex.: ME, Simples" />
              <LinhaData rotulo="Abertura" limpavel valor={dados.abertura ?? ''} aoMudar={v => mudar('abertura', v || null)} />
              <LinhaTextoLongo
                rotulo="Endereço"
                valor={dados.endereco}
                aoMudar={v => mudar('endereco', v || null)}
                placeholder="Rua, número, bairro, CEP"
              />
            </Grupo>
            <Grupo titulo="Canais da empresa">
              <LinhaMascara
                rotulo="Telefone"
                modo="tel"
                valor={dados.telefone}
                aoMudar={v => mudar('telefone', v)}
                mascara={mascaraTelefone}
              />
              <LinhaTexto rotulo="E-mail" tipo="email" valor={dados.email} aoMudar={v => mudar('email', v || null)} />
              <LinhaTexto rotulo="Site" valor={dados.site} aoMudar={v => mudar('site', v || null)} placeholder="empresa.com.br" />
              <LinhaTexto rotulo="Instagram" valor={dados.instagram} aoMudar={v => mudar('instagram', v || null)} placeholder="@perfil" />
            </Grupo>
            <Grupo titulo="Pessoas">
              <LinhaTextoRico
                rotulo="Sócios e decisores"
                valor={dados.socios}
                aoMudar={v => mudar('socios', v || null)}
                placeholder="Um por linha: - **Nome** - *papel*"
              />
            </Grupo>
            <Grupo titulo="Contato principal">
              <LinhaTexto rotulo="Nome" valor={dados.contato_nome} aoMudar={v => mudar('contato_nome', v || null)} />
              <LinhaTexto rotulo="E-mail" tipo="email" valor={dados.contato_email} aoMudar={v => mudar('contato_email', v || null)} />
              <LinhaMascara
                rotulo="Telefone"
                modo="tel"
                valor={dados.contato_telefone}
                aoMudar={v => mudar('contato_telefone', v)}
                mascara={mascaraTelefone}
              />
            </Grupo>
            <Grupo
              titulo="Base do ROI"
              rodape={`O custo da hora vale para todos os processos do cliente que não tiverem custo próprio. Vazio usa o padrão das Configurações (${reais(carteira?.config.custo_hora_padrao, true)}).`}
            >
              <LinhaNumero rotulo="Custo da hora" prefixo="R$" decimais valor={dados.custo_hora} aoMudar={v => mudar('custo_hora', v)} />
              <LinhaNumero rotulo="Funcionários" valor={dados.funcionarios} aoMudar={v => mudar('funcionarios', v)} />
              <LinhaNumero
                rotulo="Faturamento mensal"
                prefixo="R$"
                decimais
                placeholder="Opcional"
                valor={dados.faturamento_mensal}
                aoMudar={v => mudar('faturamento_mensal', v)}
              />
            </Grupo>
            <Grupo titulo="Ficha">
              <LinhaTextoRico rotulo="Contexto geral" valor={dados.observacoes} aoMudar={v => mudar('observacoes', v || null)} />
              <LinhaTextoRico
                rotulo="Contexto específico"
                valor={dados.contexto_especifico}
                aoMudar={v => mudar('contexto_especifico', v || null)}
              />
            </Grupo>
            {grupoGlossario}
          </fieldset>
        )}
      </Painel>

      {cliente && (
        <Confirmar
          aberto={excluindo}
          aoFechar={() => setExcluindo(false)}
          titulo={`Excluir ${cliente.nome}?`}
          texto={`As ${sessoes} ${sessoes === 1 ? 'sessão' : 'sessões'} e os ${processos} ${processos === 1 ? 'processo' : 'processos'} deste cliente também serão apagados, em todos os aparelhos. Não dá para desfazer.`}
          rotuloConfirmar="Excluir cliente"
          pedirSenha
          aoConfirmar={async () => {
            aoFechar();
            await comIndicador(() => excluirCliente(cliente.id));
          }}
        />
      )}
    </>
  );
}
