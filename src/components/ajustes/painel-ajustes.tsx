'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { IconAdicionar, IconExcluir, IconLink } from '@/components/icons';
import { useSessao } from '@/components/sessao';
import { definirTema, usePreferenciaTema, type PreferenciaTema } from '@/components/tema';
import { Avatar } from '@/components/ui/avatar';
import { Confirmar } from '@/components/ui/confirmar';
import { Grupo, Linha, LinhaInterruptor, LinhaNumero, LinhaTexto, ListaEscolha, Segmentado } from '@/components/ui/linhas';
import { Painel, type SubTela } from '@/components/ui/painel';
import { FREQUENCIAS, IA_PADRAO, SEGMENTOS, STATUS_PROCESSO, type Configuracoes, type FlagsIA } from '@/lib/dominio';
import { reais } from '@/lib/formato';
import { configEfetiva } from '@/lib/local/carteira';
import { useConfiguracoes } from '@/lib/local/consultas';
import { recarregarEquipe, useEquipe, type MembroEquipe } from '@/lib/local/equipe';
import { useRascunho } from '@/lib/local/gravacao';
import { garantirConfiguracoes } from '@/lib/local/repo';
import { assinarSync, estadoSync } from '@/lib/local/sync';
import { ROTEIRO_PADRAO } from '@/lib/roteiro-padrao';

type Papel = MembroEquipe['papel'];
const PAPEIS: { valor: Papel; rotulo: string; dica: string }[] = [
  { valor: 'admin', rotulo: 'Administrador', dica: 'Tudo, inclusive equipe e configurações' },
  { valor: 'consultor', rotulo: 'Consultor', dica: 'Cria e edita clientes, sessões e processos' },
  { valor: 'leitura', rotulo: 'Leitura', dica: 'Só visualiza; nada que fizer é gravado' },
];

const TEMAS: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'sistema', rotulo: 'Sistema' },
];

const ROTULOS_IA: Record<keyof FlagsIA, { rotulo: string; dica: string }> = {
  analise_automatica: { rotulo: 'Análise automática', dica: 'Analisa a sessão enquanto os processos entram' },
  sugerir_perguntas: { rotulo: 'Sugerir próximas perguntas', dica: 'Aponta números que faltam na visita' },
  transcricao: { rotulo: 'Transcrição de áudio', dica: 'Captura por voz com consentimento do cliente' },
  uso_offline: { rotulo: 'Uso offline', dica: 'Sem rede, a captura usa a leitura no aparelho' },
};

const INTEGRACOES = [
  { nome: 'Linear', dica: 'Gerar cards dos processos priorizados' },
  { nome: 'Fireflies', dica: 'Importar a transcrição das reuniões' },
  { nome: 'WhatsApp', dica: 'Enviar o resumo do relatório' },
];

const botaoRemover = 'foco grid size-9 place-items-center rounded-pilula text-tinta-3 transition-colors hover:bg-risco-fundo hover:text-risco';

/** Configurações da organização: só administrador edita; os demais veem. */
function useConfiguracao(cfg: Configuracoes | null) {
  const { rascunho, mudar } = useRascunho('configuracoes', cfg);
  return { c: rascunho, mudar };
}

/**
 * Ajustes num painel aberto pela engrenagem do topo (o app é uma página só).
 * Listas e escolhas são sub-telas do mesmo painel.
 */
export function PainelAjustes({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { usuario, sair } = useSessao();
  const cfg = useConfiguracoes();
  const { c, mudar } = useConfiguracao(cfg ?? null);
  const equipe = useEquipe();
  const tema = usePreferenciaTema();
  const ultimaSync = useSyncExternalStore(assinarSync, () => estadoSync().ultima, () => null);
  const admin = usuario?.papel === 'admin';
  const [novoSetor, setNovoSetor] = useState('');
  const [removerModelo, setRemoverModelo] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [membroId, setMembroId] = useState<string | null>(null);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);
  const membro = equipe.find(m => m.id === membroId) ?? null;

  // A linha de configurações só nasce depois de uma sincronização: assim os
  // padrões nunca são criados por cima do que outro aparelho já configurou.
  useEffect(() => {
    if (aberto && cfg === null && ultimaSync) void garantirConfiguracoes();
  }, [aberto, cfg, ultimaSync]);

  const mudarMembro = async (m: MembroEquipe, mudanca: Partial<Pick<MembroEquipe, 'papel' | 'ativo'>>) => {
    const r = await fetch('/api/equipe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, ...mudanca }),
    }).catch(() => null);
    if (r?.ok) {
      setErroEquipe(null);
      await recarregarEquipe();
    } else {
      const corpo = r ? ((await r.json().catch(() => ({}))) as { erro?: string }) : null;
      setErroEquipe(corpo?.erro ?? 'Sem conexão: a mudança não foi feita.');
    }
  };

  const ia = { ...IA_PADRAO, ...c?.ia };
  const adicionarSetor = () => {
    const t = novoSetor.trim();
    if (c && t && !c.setores.some(s => s.toLowerCase() === t.toLowerCase())) mudar('setores', [...c.setores, t]);
    setNovoSetor('');
  };

  const subtelas: Record<string, SubTela> = c
    ? {
        setores: {
          titulo: 'Setores',
          conteudo: (
            <fieldset disabled={!admin} className="contents">
              <form
                className="mt-2 flex gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  adicionarSetor();
                }}
              >
                <input className="campo !rounded-pilula" value={novoSetor} onChange={e => setNovoSetor(e.target.value)} placeholder="Novo setor" aria-label="Novo setor" />
                <button
                  type="submit"
                  disabled={!novoSetor.trim()}
                  aria-label="Adicionar setor"
                  className="foco grid size-[var(--toque)] shrink-0 place-items-center rounded-pilula bg-tinta text-sobre-tinta transition-opacity disabled:opacity-30"
                >
                  <IconAdicionar size={20} />
                </button>
              </form>
              <Grupo rodape="Remover um setor daqui não muda os processos que já usam esse nome.">
                <div key={c.setores.join()} className="cascata divide-y divide-borda">
                  {c.setores.map(s => (
                    <div key={s} className="flex min-h-[52px] items-center gap-3 px-4">
                      <span className="flex-1 text-[15px]">{s}</span>
                      <button type="button" aria-label={`Remover ${s}`} onClick={() => mudar('setores', c.setores.filter(x => x !== s))} className={botaoRemover}>
                        <IconExcluir size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </Grupo>
            </fieldset>
          ),
        },
        status: {
          titulo: 'Status',
          conteudo: (
            <fieldset disabled={!admin} className="contents">
              <Grupo rodape="O nome muda em todo o sistema. A etapa em si não muda: filtros e relatório dependem dela.">
                {STATUS_PROCESSO.map(s => (
                  <LinhaTexto
                    key={s.valor}
                    rotulo={s.rotulo}
                    placeholder={s.rotulo}
                    valor={c.rotulos_status[s.valor] ?? ''}
                    aoMudar={v => mudar('rotulos_status', { ...c.rotulos_status, [s.valor]: v || undefined })}
                  />
                ))}
              </Grupo>
            </fieldset>
          ),
        },
        frequencias: {
          titulo: 'Frequências',
          conteudo: (
            <fieldset disabled={!admin} className="contents">
              <Grupo rodape="O nome muda em todo o sistema; a frequência em si continua a mesma.">
                {FREQUENCIAS.map(f => (
                  <LinhaTexto
                    key={f.valor}
                    rotulo={f.rotulo}
                    placeholder={f.rotulo}
                    valor={c.rotulos_frequencia[f.valor] ?? ''}
                    aoMudar={v => mudar('rotulos_frequencia', { ...c.rotulos_frequencia, [f.valor]: v || undefined })}
                  />
                ))}
              </Grupo>
            </fieldset>
          ),
        },
        roteiros: {
          titulo: 'Modelos de roteiro',
          conteudo: (
            <Grupo rodape="Sessão nova de um cliente desse segmento já nasce com o modelo dele. Sem modelo, vale o padrão Sheep.">
              <Linha rotulo="Padrão Sheep" valor={`${ROTEIRO_PADRAO.length} blocos`} />
              {c.modelos_roteiro.map(m => (
                <div key={m.segmento} className="flex min-h-[52px] items-center gap-3 px-4">
                  <span className="flex-1 text-[15px]">{m.segmento}</span>
                  <span className="text-[13px] text-tinta-2">{m.blocos.reduce((s, b) => s + b.perguntas.length, 0)} perguntas</span>
                  {admin && (
                    <button type="button" aria-label={`Remover modelo de ${m.segmento}`} onClick={() => setRemoverModelo(m.segmento)} className={botaoRemover}>
                      <IconExcluir size={17} />
                    </button>
                  )}
                </div>
              ))}
              {admin && <Linha rotulo="Criar modelo para um segmento" subtela="roteiro-novo" valor="" vazio="" destaque />}
            </Grupo>
          ),
        },
        'roteiro-novo': {
          titulo: 'Segmento do modelo',
          conteudo: (
            <ListaEscolha
              opcoes={SEGMENTOS.filter(s => !c.modelos_roteiro.some(m => m.segmento === s)).map(s => ({ valor: s, rotulo: s }))}
              selecionados={[]}
              aoMudar={([seg]) => seg && mudar('modelos_roteiro', [...c.modelos_roteiro, { segmento: seg, blocos: structuredClone(ROTEIRO_PADRAO) }])}
            />
          ),
        },
        membro: {
          titulo: membro?.nome ?? 'Membro',
          conteudo: membro ? (
            <>
              <Grupo titulo="Papel">
                <ListaEscolha
                  opcoes={PAPEIS}
                  selecionados={[membro.papel]}
                  aoMudar={([v]) => v && v !== membro.papel && void mudarMembro(membro, { papel: v })}
                />
              </Grupo>
              <Grupo rodape="Quem está inativo não entra mais no sistema.">
                <LinhaInterruptor rotulo="Acesso ativo" ligado={membro.ativo} aoMudar={v => void mudarMembro(membro, { ativo: v })} />
              </Grupo>
              {erroEquipe && <p className="entra mt-3 rounded-xl bg-risco-fundo px-3 py-2.5 text-sm text-risco">{erroEquipe}</p>}
            </>
          ) : null,
        },
      }
    : {};

  return (
    <>
      <Painel aberto={aberto} aoFechar={aoFechar} titulo="Ajustes" subtelas={subtelas}>
        {c ? (
          <fieldset disabled={!admin} className="contents">
            <Grupo titulo="Padrões de cálculo" rodape={admin ? 'Valem quando o processo e o cliente não informam os próprios valores.' : 'Só administradores alteram.'}>
              <LinhaNumero rotulo="Custo da hora padrão" prefixo="R$" decimais valor={c.custo_hora_padrao} aoMudar={v => mudar('custo_hora_padrao', v)} />
              <LinhaNumero
                rotulo="Redução esperada padrão"
                sufixo="%"
                valor={c.reducao_padrao_pct}
                aoMudar={v => mudar('reducao_padrao_pct', v == null ? 60 : Math.min(v, 100))}
              />
              <Segmentado
                rotulo="Horizonte do ROI"
                permitirLimpar={false}
                opcoes={[
                  { valor: 12, rotulo: '12 meses' },
                  { valor: 24, rotulo: '24 meses' },
                  { valor: 36, rotulo: '36 meses' },
                ]}
                valor={c.horizonte_meses}
                aoMudar={v => v && mudar('horizonte_meses', v)}
              />
            </Grupo>
            <Grupo titulo="Mapa de processos">
              <Linha rotulo="Setores" valor={`${c.setores.length}`} subtela="setores" />
              <Linha rotulo="Status" valor="4 etapas" subtela="status" />
              <Linha rotulo="Frequências" valor={`${FREQUENCIAS.length}`} subtela="frequencias" />
              <Linha rotulo="Modelos de roteiro" valor={c.modelos_roteiro.length ? `${c.modelos_roteiro.length} por segmento` : 'Padrão Sheep'} subtela="roteiros" />
            </Grupo>
            <Grupo titulo="IA">
              {(Object.keys(ROTULOS_IA) as (keyof FlagsIA)[]).map(k => (
                <LinhaInterruptor key={k} rotulo={ROTULOS_IA[k].rotulo} dica={ROTULOS_IA[k].dica} ligado={ia[k]} aoMudar={v => mudar('ia', { ...ia, [k]: v })} />
              ))}
            </Grupo>
          </fieldset>
        ) : (
          <Grupo titulo="Padrões de cálculo" rodape="As configurações carregam na primeira conexão com o servidor.">
            <Linha rotulo="Custo da hora padrão" valor={reais(configEfetiva(null).custo_hora_padrao, true)} />
            <Linha rotulo="Redução esperada padrão" valor={`${configEfetiva(null).reducao_padrao_pct}%`} />
          </Grupo>
        )}

        <Grupo titulo="Integrações" rodape="As integrações entram depois do MVP.">
          {INTEGRACOES.map(i => (
            <div key={i.nome} className="flex min-h-[60px] items-center gap-3 px-4 py-2">
              <span className="grid size-9 place-items-center rounded-xl bg-sutil text-tinta-2">
                <IconLink size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{i.nome}</span>
                <span className="block text-xs text-tinta-2">{i.dica}</span>
              </span>
              <span className="rounded-pilula bg-pendente-fundo px-2.5 py-1 text-xs font-medium text-pendente">Não conectado</span>
            </div>
          ))}
        </Grupo>

        <Grupo titulo="Equipe" rodape={admin ? 'Toque em alguém para mudar o papel.' : 'Só administradores mudam papéis.'}>
          {equipe.length === 0 ? (
            <p className="px-4 py-4 text-sm text-tinta-2">A equipe aparece quando houver conexão.</p>
          ) : (
            equipe.map(m =>
              admin ? (
                <Linha
                  key={m.id}
                  rotulo={m.nome}
                  valor={PAPEIS.find(p => p.valor === m.papel)?.rotulo}
                  subtela="membro"
                  aoClicar={() => setMembroId(m.id)}
                />
              ) : (
                <div key={m.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                  <Avatar nome={m.nome} imagem={m.foto} tamanho={32} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{m.nome}</span>
                  <span className="text-[13px] text-tinta-2">{PAPEIS.find(p => p.valor === m.papel)?.rotulo}</span>
                </div>
              ),
            )
          )}
        </Grupo>

        <Grupo titulo="Aparência">
          <Segmentado rotulo="Tema" permitirLimpar={false} opcoes={TEMAS} valor={tema} aoMudar={v => v && definirTema(v)} />
        </Grupo>
        <Grupo titulo="Conta">
          <Linha rotulo="Sair" valor={usuario?.email} aoClicar={() => setSaindo(true)} />
        </Grupo>
        <p className="mt-6 text-center text-xs text-tinta-3">Sheep Levantamento - versão {process.env.NEXT_PUBLIC_VERSAO ?? 'local'}</p>
      </Painel>

      <Confirmar
        aberto={!!removerModelo}
        aoFechar={() => setRemoverModelo(null)}
        titulo={`Remover o modelo de ${removerModelo}?`}
        texto="Sessões que já usaram o modelo continuam com o roteiro delas. As próximas usam o padrão Sheep."
        rotuloConfirmar="Remover"
        aoConfirmar={() => c && mudar('modelos_roteiro', c.modelos_roteiro.filter(m => m.segmento !== removerModelo))}
      />
      <Confirmar
        aberto={saindo}
        aoFechar={() => setSaindo(false)}
        titulo="Sair da conta?"
        texto="Se tudo já foi sincronizado, os dados de clientes saem deste aparelho. Com algo pendente (sem conexão), eles ficam até a próxima sincronização."
        rotuloConfirmar="Sair"
        aoConfirmar={sair}
      />
    </>
  );
}
