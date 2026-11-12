import { DOCUMENTADO, FREQUENCIAS, NIVEIS_AUTOMACAO, rotuloFrequencia, type Configuracoes, type Opcao, type Processo } from './dominio';

/**
 * Perfil dos processos mapeados (para o diagnóstico, não para o ganho): por
 * setor, frequência, quão automático, documentação, origem dos números e
 * sistemas citados. Cada fatia traz quantos processos e as horas por mês que
 * eles tomam hoje. Campo vazio vira a fatia "Não informado" (nunca some).
 */

export interface Fatia {
  chave: string;
  rotulo: string;
  n: number;
  horas: number;
}

export interface Perfil {
  total: number;
  horas_mes: number;
  /** Soma das pessoas envolvidas, só dos processos que informaram. */
  pessoas: number;
  completos: number;
  setores: Fatia[];
  frequencias: Fatia[];
  automacao: Fatia[];
  documentacao: Fatia[];
  origens: Fatia[];
  sistemas: Fatia[];
}

export const NAO_INFORMADO = 'Não informado';

/** Origem do número em ordem de confiança: estimativa, o que o cliente disse, medido. */
export const ORIGENS_CONFIANCA: Opcao<string>[] = [
  { valor: 'estimativa', rotulo: 'Estimativa Sheep' },
  { valor: 'cliente', rotulo: 'Cliente informou' },
  { valor: 'medido', rotulo: 'Medido' },
];

type Info = {
  setor: (p: Processo) => string | null;
  horas: (p: Processo) => number | null;
  completo: (p: Processo) => boolean;
  cfg?: Pick<Configuracoes, 'rotulos_frequencia'> | null;
};

/** Conta por uma lista fixa de opções (na ordem dela) e põe "Não informado" no fim, se houver. */
function porOpcoes<T extends string>(
  processos: Processo[],
  opcoes: Opcao<T>[],
  valor: (p: Processo) => T | null,
  horas: (p: Processo) => number,
  rotulo: (o: Opcao<T>) => string = o => o.rotulo,
): Fatia[] {
  const fatias = opcoes.map(o => ({ chave: String(o.valor), rotulo: rotulo(o), n: 0, horas: 0 }));
  const sem: Fatia = { chave: '', rotulo: NAO_INFORMADO, n: 0, horas: 0 };
  for (const p of processos) {
    const v = valor(p);
    const f = (v != null && fatias.find(x => x.chave === v)) || sem;
    f.n++;
    f.horas += horas(p);
  }
  return sem.n ? [...fatias, sem] : fatias;
}

/** Conta por texto livre (setor, sistema), juntando maiúsculas e minúsculas; maiores primeiro. */
function porTexto(entradas: { texto: string; horas: number }[]): Fatia[] {
  const mapa = new Map<string, Fatia>();
  for (const { texto, horas } of entradas) {
    const chave = texto.trim().toLocaleLowerCase('pt-BR');
    const f = mapa.get(chave) ?? { chave, rotulo: texto.trim(), n: 0, horas: 0 };
    f.n++;
    f.horas += horas;
    mapa.set(chave, f);
  }
  return [...mapa.values()].sort((a, b) => b.n - a.n || b.horas - a.horas || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

export function perfilProcessos(processos: Processo[], info: Info): Perfil {
  const horas = (p: Processo) => info.horas(p) ?? 0;

  const setores = porTexto(processos.filter(p => info.setor(p)?.trim()).map(p => ({ texto: info.setor(p)!, horas: horas(p) })));
  const semSetor = processos.filter(p => !info.setor(p)?.trim());
  if (semSetor.length)
    setores.push({ chave: '', rotulo: 'Sem setor', n: semSetor.length, horas: semSetor.reduce((a, p) => a + horas(p), 0) });

  const sistemas = porTexto(
    processos.flatMap(p => [...new Set(p.sistemas.filter(s => s.trim()))].map(s => ({ texto: s, horas: horas(p) }))),
  );

  return {
    total: processos.length,
    horas_mes: processos.reduce((a, p) => a + horas(p), 0),
    pessoas: processos.reduce((a, p) => a + (p.pessoas_envolvidas ?? 0), 0),
    completos: processos.filter(info.completo).length,
    setores,
    frequencias: porOpcoes(
      processos,
      FREQUENCIAS,
      p => p.frequencia,
      horas,
      o => rotuloFrequencia(o.valor, info.cfg),
    ).filter(f => f.n > 0),
    automacao: porOpcoes(processos, NIVEIS_AUTOMACAO, p => p.nivel_automacao, horas),
    documentacao: porOpcoes(processos, DOCUMENTADO, p => p.documentado, horas),
    origens: porOpcoes(processos, ORIGENS_CONFIANCA, p => p.origem_numero, horas),
    sistemas,
  };
}

/** Quantos da fatia `chave` (0 se não houver). */
export function contagem(fatias: Fatia[], chave: string) {
  return fatias.find(f => f.chave === chave)?.n ?? 0;
}
