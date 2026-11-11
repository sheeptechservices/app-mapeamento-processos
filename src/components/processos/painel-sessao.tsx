'use client';

import { useState } from 'react';
import { IconAdicionar, IconExcluir } from '@/components/icons';
import { Confirmar } from '@/components/ui/confirmar';
import { Grupo, Linha, LinhaData, LinhaInterruptor, LinhaTexto, LinhaTextoLongo, ListaEscolha } from '@/components/ui/linhas';
import { Painel, RodapePainel } from '@/components/ui/painel';
import { rotuloDe, STATUS_SESSAO, type Sessao } from '@/lib/dominio';
import { useCarteira } from '@/lib/local/carteira';
import { comIndicador, useFormulario } from '@/lib/local/gravacao';
import { criarSessao, dadosSessaoVazia, excluirSessao } from '@/lib/local/repo';
import { AvisoRascunho } from '@/components/ui/aviso-rascunho';

/** Abrir (sessao = null) ou editar uma sessão de mapeamento. Toda sessão é de um cliente. */
export function PainelSessao({
  aberto,
  aoFechar,
  sessao,
  clienteInicial,
  aoCriar,
  aoExcluir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  sessao: Sessao | null;
  clienteInicial?: string | null;
  aoCriar?: (s: Sessao) => void;
  aoExcluir?: () => void;
}) {
  const carteira = useCarteira();
  const vazia = () => dadosSessaoVazia(clienteInicial ?? '');
  // Sessão nova: rascunho no aparelho até abrir a sessão (um por cliente).
  const { dados, mudar, editando, reiniciar, recuperado, descartar, concluir } = useFormulario(
    'sessoes',
    sessao,
    vazia,
    aberto && !sessao ? `sessao:${clienteInicial ?? ''}` : null,
  );
  const [participante, setParticipante] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [abertoVisto, setAbertoVisto] = useState(aberto);
  if (aberto !== abertoVisto) {
    setAbertoVisto(aberto);
    if (aberto && !sessao) {
      reiniciar();
      setSalvando(false);
    }
  }

  const clientes = carteira?.clientes ?? [];
  const cliente = clientes.find(c => c.id === dados?.cliente_id);
  const processos = sessao ? (carteira?.processos.filter(p => p.sessao_id === sessao.id).length ?? 0) : 0;

  const salvar = async () => {
    if (!dados?.cliente_id) return;
    setSalvando(true);
    const { cliente_id, ...resto } = dados;
    const nova = await comIndicador(() => criarSessao(cliente_id, { ...resto, titulo: resto.titulo?.trim() || null }));
    concluir();
    aoFechar();
    aoCriar?.(nova);
  };

  const adicionarParticipante = () => {
    const t = participante.trim();
    if (t && dados) mudar('participantes', [...dados.participantes, t]);
    setParticipante('');
  };

  const rodape = editando ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setExcluindo(true)}
        className="foco inline-flex min-h-12 items-center gap-2 rounded-pilula border border-borda-forte bg-superficie px-5 text-[14px] font-semibold text-risco transition-colors hover:bg-risco-fundo"
      >
        <IconExcluir size={17} /> Excluir
      </button>
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
        rotulo: salvando ? <span className="spinner sm" /> : 'Abrir sessão',
        acao: salvar,
        desabilitado: !dados?.cliente_id || salvando,
      }}
    />
  );

  return (
    <>
      <Painel
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={editando ? 'Sessão de mapeamento' : 'Nova sessão'}
        rodape={rodape}
        subtelas={{
          cliente: {
            titulo: 'Cliente',
            conteudo: (
              <ListaEscolha
                opcoes={clientes.map(c => ({ valor: c.id, rotulo: c.nome, dica: [c.segmento, c.cidade].filter(Boolean).join(' - ') }))}
                selecionados={dados?.cliente_id ? [dados.cliente_id] : []}
                aoMudar={([v]) => v && mudar('cliente_id', v)}
              />
            ),
          },
          status: {
            titulo: 'Status da sessão',
            conteudo: (
              <ListaEscolha
                opcoes={STATUS_SESSAO}
                selecionados={dados ? [dados.status] : []}
                aoMudar={([v]) => {
                  if (!v) return;
                  mudar('status', v);
                  // Validar a sessão carimba a data da validação.
                  mudar('validado_em', v === 'validada' ? Date.now() : null);
                }}
              />
            ),
          },
          participantes: {
            titulo: 'Participantes',
            conteudo: (
              <>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    adicionarParticipante();
                  }}
                >
                  <input
                    className="campo !rounded-pilula"
                    value={participante}
                    onChange={e => setParticipante(e.target.value)}
                    placeholder="Nome e cargo"
                    aria-label="Novo participante"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!participante.trim()}
                    aria-label="Adicionar participante"
                    className="foco grid size-[var(--toque)] shrink-0 place-items-center rounded-pilula bg-tinta text-sobre-tinta transition-opacity disabled:opacity-30"
                  >
                    <IconAdicionar size={20} />
                  </button>
                </form>
                {!!dados?.participantes.length && (
                  <Grupo>
                    <div key={dados.participantes.join()} className="cascata divide-y divide-borda">
                      {dados.participantes.map((p, i) => (
                        <div key={`${p}-${i}`} className="flex min-h-[52px] items-center gap-3 px-4">
                          <span className="flex-1 text-[15px]">{p}</span>
                          <button
                            type="button"
                            aria-label={`Remover ${p}`}
                            onClick={() => mudar('participantes', dados.participantes.filter((_, j) => j !== i))}
                            className="foco grid size-9 place-items-center rounded-pilula text-tinta-3 transition-colors hover:bg-risco-fundo hover:text-risco"
                          >
                            <IconExcluir size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Grupo>
                )}
              </>
            ),
          },
        }}
      >
        {dados && (
          <>
            {recuperado && !editando && <AvisoRascunho aoDescartar={descartar} />}
            <Grupo titulo="Sessão">
              <Linha rotulo="Cliente" valor={cliente?.nome} vazio="Escolha o cliente" subtela="cliente" destaque={!dados.cliente_id} />
              <LinhaTexto rotulo="Título" valor={dados.titulo} aoMudar={v => mudar('titulo', v || null)} placeholder="Ex.: Levantamento inicial" />
              <LinhaData rotulo="Data" valor={dados.data} aoMudar={v => mudar('data', v)} />
              <Linha
                rotulo="Participantes"
                valor={dados.participantes.length ? `${dados.participantes.length}` : null}
                vazio="Nenhum"
                subtela="participantes"
              />
              {editando && <Linha rotulo="Status" valor={rotuloDe(STATUS_SESSAO, dados.status)} subtela="status" />}
            </Grupo>
            <Grupo rodape="Necessário para a captura por voz (LGPD). Os áudios saem junto com a sessão se ela for excluída.">
              <LinhaInterruptor
                rotulo="Cliente autorizou gravar áudio"
                ligado={dados.consentimento_gravacao}
                aoMudar={v => mudar('consentimento_gravacao', v)}
              />
            </Grupo>
            <Grupo titulo="Observações">
              <LinhaTextoLongo
                rotulo="Contexto da visita"
                valor={dados.observacoes}
                aoMudar={v => mudar('observacoes', v || null)}
                placeholder="O que o cliente quer resolver, quem decide, o que já tentou"
              />
            </Grupo>
          </>
        )}
      </Painel>

      {sessao && (
        <Confirmar
          aberto={excluindo}
          aoFechar={() => setExcluindo(false)}
          titulo="Excluir a sessão?"
          texto={`Os ${processos} ${processos === 1 ? 'processo' : 'processos'}, as áreas e o roteiro desta sessão também serão apagados, em todos os aparelhos. O cliente continua. Não dá para desfazer.`}
          rotuloConfirmar="Excluir sessão"
          pedirSenha
          aoConfirmar={async () => {
            aoFechar();
            await comIndicador(() => excluirSessao(sessao.id));
            aoExcluir?.();
          }}
        />
      )}
    </>
  );
}
