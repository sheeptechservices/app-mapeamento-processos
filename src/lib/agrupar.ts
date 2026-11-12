import { FREQUENCIAS, PRIORIDADES, rotuloFrequencia, type Configuracoes, type Opcao, type Processo } from './dominio';

/** Como a lista de processos do quadro da sessão se divide. */
export type Agrupamento = 'nenhum' | 'setor' | 'prioridade' | 'frequencia';

export const AGRUPAMENTOS: Opcao<Agrupamento>[] = [
  { valor: 'nenhum', rotulo: 'Sem agrupar' },
  { valor: 'setor', rotulo: 'Setor' },
  { valor: 'prioridade', rotulo: 'Prioridade' },
  { valor: 'frequencia', rotulo: 'Frequência' },
];

export interface GrupoProcessos {
  chave: string;
  rotulo: string;
  processos: Processo[];
}

/**
 * Divide a lista (já filtrada e ordenada) em grupos, mantendo a ordem de dentro.
 * Setor em ordem alfabética; prioridade de Urgente a Baixa; frequência de
 * Diário a Sob demanda. Quem não tem o campo vai para um grupo "Sem ..." no fim.
 * Só aparecem grupos com processos.
 */
export function agruparProcessos(
  lista: Processo[],
  modo: Exclude<Agrupamento, 'nenhum'>,
  info: { setor: (p: Processo) => string | null; cfg?: Pick<Configuracoes, 'rotulos_frequencia'> | null },
): GrupoProcessos[] {
  const grupos = new Map<string, GrupoProcessos>();
  const por = (chave: string, rotulo: string, p: Processo) => {
    const g = grupos.get(chave) ?? { chave, rotulo, processos: [] };
    g.processos.push(p);
    grupos.set(chave, g);
  };

  let ordem: string[];
  if (modo === 'setor') {
    for (const p of lista) {
      const s = info.setor(p)?.trim();
      if (s) por(s.toLocaleLowerCase('pt-BR'), s, p);
      else por('', 'Sem setor', p);
    }
    ordem = [...grupos.values()]
      .filter(g => g.chave)
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
      .map(g => g.chave);
  } else if (modo === 'prioridade') {
    for (const p of lista) {
      if (p.eisenhower) por(String(p.eisenhower), PRIORIDADES.find(x => x.valor === p.eisenhower)?.rotulo ?? '', p);
      else por('', 'Sem prioridade', p);
    }
    ordem = PRIORIDADES.map(x => String(x.valor));
  } else {
    for (const p of lista) {
      if (p.frequencia) por(p.frequencia, rotuloFrequencia(p.frequencia, info.cfg), p);
      else por('', 'Sem frequência', p);
    }
    ordem = FREQUENCIAS.map(x => x.valor);
  }

  return [...ordem, ''].flatMap(chave => grupos.get(chave) ?? []);
}
