'use client';

import { Grupo, Linha, LinhaInterruptor, ListaEscolha } from '@/components/ui/linhas';
import { Painel, RodapePainel } from '@/components/ui/painel';
import { PRIORIDADES, ORIGENS, rotuloStatus, STATUS_PROCESSO, type Configuracoes, type Processo } from '@/lib/dominio';
import { FILTROS_VAZIOS, type FiltrosProcesso, type Ordem, type OrigemFiltro } from '@/lib/filtros';

export const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: 'ganho', rotulo: 'Maior ganho' },
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'az', rotulo: 'A-Z' },
];

export const ORIGENS_FILTRO: { valor: OrigemFiltro; rotulo: string }[] = [
  ...ORIGENS.map(o => ({ valor: o.valor as OrigemFiltro, rotulo: o.rotulo })),
  { valor: 'nao_informada', rotulo: 'Sem origem informada' },
];

/**
 * Filtros no padrão de sobreposição: grupos com linhas que abrem sub-telas
 * (listas com busca, contagem e checkbox), rodapé Limpar / Mostrar N.
 * `previa` conta quantos processos sobram com os filtros em edição.
 */
export function PainelFiltros({
  aberto,
  aoFechar,
  filtros,
  aoMudar,
  processos,
  setorDe,
  previa,
  cfg,
}: {
  aberto: boolean;
  aoFechar: () => void;
  filtros: FiltrosProcesso;
  aoMudar: (f: FiltrosProcesso) => void;
  processos: Processo[];
  setorDe: (p: Processo) => string | null;
  previa: number;
  cfg: Pick<Configuracoes, 'rotulos_status'> | null;
}) {
  const contar = <T,>(chave: (p: Processo) => T, valor: T) => processos.filter(p => chave(p) === valor).length;
  const setores = [...new Set(processos.map(setorDe).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const resumo = (n: number) => (n ? `${n} ${n === 1 ? 'marcado' : 'marcados'}` : 'Todos');

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Filtros"
      rodape={
        <RodapePainel
          secundario={{ rotulo: 'Limpar', acao: () => aoMudar({ ...FILTROS_VAZIOS, busca: filtros.busca }) }}
          primario={{ rotulo: `Mostrar ${previa} ${previa === 1 ? 'processo' : 'processos'}`, acao: aoFechar }}
        />
      }
      subtelas={{
        setor: {
          titulo: 'Área / setor',
          conteudo: (
            <ListaEscolha
              multiplo
              buscaAPartirDe={6}
              opcoes={setores.map(s => ({ valor: s, rotulo: s, contagem: contar(setorDe, s) }))}
              selecionados={filtros.setores}
              aoMudar={v => aoMudar({ ...filtros, setores: v })}
            />
          ),
        },
        status: {
          titulo: 'Status',
          conteudo: (
            <ListaEscolha
              multiplo
              opcoes={STATUS_PROCESSO.map(s => ({ valor: s.valor, rotulo: rotuloStatus(s.valor, cfg), contagem: contar(p => p.status, s.valor) }))}
              selecionados={filtros.status}
              aoMudar={v => aoMudar({ ...filtros, status: v })}
            />
          ),
        },
        prioridade: {
          titulo: 'Prioridade',
          conteudo: (
            <ListaEscolha
              multiplo
              opcoes={PRIORIDADES.map(e => ({ ...e, contagem: contar(p => p.eisenhower, e.valor) }))}
              selecionados={filtros.prioridade}
              aoMudar={v => aoMudar({ ...filtros, prioridade: v })}
            />
          ),
        },
        origem: {
          titulo: 'Origem do número',
          conteudo: (
            <ListaEscolha
              multiplo
              opcoes={ORIGENS_FILTRO.map(o => ({ ...o, contagem: contar(p => p.origem_numero ?? 'nao_informada', o.valor) }))}
              selecionados={filtros.origem}
              aoMudar={v => aoMudar({ ...filtros, origem: v })}
            />
          ),
        },
        ordem: {
          titulo: 'Ordenar por',
          conteudo: (
            <ListaEscolha opcoes={ORDENS} selecionados={[filtros.ordem]} aoMudar={([v]) => v && aoMudar({ ...filtros, ordem: v })} />
          ),
        },
      }}
    >
      <Grupo>
        <LinhaInterruptor
          rotulo="Só em risco"
          dica={`${processos.filter(p => p.em_risco).length} processos marcados como em risco`}
          ligado={filtros.soRisco}
          aoMudar={v => aoMudar({ ...filtros, soRisco: v })}
        />
      </Grupo>
      <Grupo titulo="Filtrar">
        <Linha rotulo="Área / setor" valor={resumo(filtros.setores.length)} subtela="setor" />
        <Linha rotulo="Status" valor={resumo(filtros.status.length)} subtela="status" />
        <Linha rotulo="Prioridade" valor={resumo(filtros.prioridade.length)} subtela="prioridade" />
        <Linha rotulo="Origem do número" valor={resumo(filtros.origem.length)} subtela="origem" />
      </Grupo>
      <Grupo titulo="Ordem">
        <Linha rotulo="Ordenar por" valor={ORDENS.find(o => o.valor === filtros.ordem)?.rotulo} subtela="ordem" />
      </Grupo>
    </Painel>
  );
}
