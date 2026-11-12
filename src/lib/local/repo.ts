// Escrita no banco local. Toda alteração carimba os campos que mudou e marca o
// registro como pendente; a tela lê pelo useLiveQuery e se atualiza sozinha.
import {
  CONFIG_PADRAO,
  IA_PADRAO,
  SETORES_PADRAO,
  type Anexo,
  type AnexoParte,
  type Area,
  type Captura,
  type Cliente,
  type Configuracoes,
  type Dados,
  type ModeloRoteiro,
  type Processo,
  type Registro,
  type RoteiroBloco,
  type RoteiroPergunta,
  type Sessao,
  type TermoGlossario,
} from '@/lib/dominio';
import { hojeISO } from '@/lib/formato';
import { ROTEIRO_PADRAO } from '@/lib/roteiro-padrao';
import { banco, type TabelaSync } from './banco';

// Avisado a cada escrita: é por aqui que a sincronização sabe que há o que
// enviar (sem import circular com sync.ts).
let aoGravar: (() => void) | null = null;
export function quandoGravar(fn: (() => void) | null) {
  aoGravar = fn;
}

export interface Autor {
  organizacao_id: string;
  usuario_id: string;
}

let autor: Autor = { organizacao_id: 'sheep', usuario_id: 'local' };

/** Definido no início da sessão com quem entrou. */
export function definirAutor(a: Autor) {
  autor = a;
}
export function autorAtual() {
  return autor;
}

export function novoId() {
  return crypto.randomUUID();
}

function carimbos(campos: string[], t: number) {
  return Object.fromEntries(campos.map(c => [c, t]));
}

function novoRegistro<T extends Registro>(dados: Dados<T>, id = novoId()): T {
  const t = Date.now();
  return {
    ...dados,
    id,
    organizacao_id: autor.organizacao_id,
    criado_por: autor.usuario_id,
    criado_em: t,
    atualizado_em: t,
    excluido: 0,
    _ts: carimbos(Object.keys(dados), t),
    _pendente: 1,
  } as T;
}

type Tabela = TabelaSync;
type TipoDe<N extends Tabela> = {
  configuracoes: Configuracoes;
  clientes: Cliente;
  sessoes: Sessao;
  areas: Area;
  processos: Processo;
  roteiro_blocos: RoteiroBloco;
  roteiro_perguntas: RoteiroPergunta;
  capturas: Captura;
  anexos: Anexo;
  anexos_partes: AnexoParte;
  glossario: TermoGlossario;
}[N];

async function inserir<T extends Registro>(tabela: Tabela, reg: T) {
  await banco()
    .tabela(tabela)
    .add(reg as never);
  aoGravar?.();
  return reg;
}

/**
 * Altera só os campos enviados, com carimbo próprio de cada um. Mexer num campo
 * que estava em conflito resolve o conflito daquele campo.
 */
export async function atualizar<N extends Tabela>(tabela: N, id: string, mudancas: Partial<Dados<TipoDe<N>>>) {
  const t = Date.now();
  const tb = banco().tabela(tabela);
  await banco().transaction('rw', tb, async () => {
    const atual = await tb.get(id);
    if (!atual) return;
    const campos = Object.keys(mudancas);
    const conflitos = atual._conflitos?.filter(c => !campos.includes(c));
    await tb.put({
      ...atual,
      ...mudancas,
      atualizado_em: t,
      _ts: { ...atual._ts, ...carimbos(campos, t) },
      _pendente: 1,
      _conflitos: conflitos?.length ? conflitos : undefined,
    });
  });
  aoGravar?.();
}

/** Exclusão lógica: some da tela, e a exclusão também sincroniza. */
export async function excluir(tabela: Tabela, id: string) {
  await atualizar(tabela, id, { excluido: 1 } as never);
}

/** "Conferido": o consultor viu o campo em conflito e aceita o valor atual. */
export async function aceitarConflitos(tabela: Tabela, id: string) {
  const tb = banco().tabela(tabela);
  const reg = await tb.get(id);
  if (reg?._conflitos) await tb.put({ ...reg, _conflitos: undefined });
}

async function excluirFilhas(tabela: Tabela, campo: string, valor: string) {
  const ids = await banco().tabela(tabela).where(campo).equals(valor).primaryKeys();
  await Promise.all(ids.map(id => excluir(tabela, id)));
}

// ─── Configurações ────────────────────────────────────────────────────────

export function configuracoesPadrao(): Dados<Configuracoes> {
  return {
    ...CONFIG_PADRAO,
    setores: [...SETORES_PADRAO],
    segmentos: [],
    sistemas: [],
    rotulos_status: {},
    rotulos_frequencia: {},
    modelos_roteiro: [],
    ia: { ...IA_PADRAO },
  };
}

/** Garante a linha de configurações da organização (id = id da organização). */
export async function garantirConfiguracoes() {
  const org = autor.organizacao_id;
  const tb = banco().configuracoes;
  // Ler e criar na mesma transação: duas chamadas ao mesmo tempo (dois efeitos,
  // duas abas) não tentam criar a mesma linha.
  const { cfg, criada } = await banco().transaction('rw', tb, async () => {
    const atual = await tb.get(org);
    if (atual) return { cfg: atual, criada: false };
    const nova = novoRegistro<Configuracoes>(configuracoesPadrao(), org);
    await tb.add(nova);
    return { cfg: nova, criada: true };
  });
  if (criada) aoGravar?.();
  return cfg;
}

/**
 * Opção criada num campo de escolha (setor, segmento, sistema) entra na lista
 * da organização, que sincroniza: aparece para os próximos cadastros, em todos
 * os aparelhos. Antes da primeira sincronização ainda não há a linha de
 * configurações; a opção continua no próprio registro e as telas também listam
 * as opções em uso, então nada some.
 */
export async function lembrarOpcao(lista: 'setores' | 'segmentos' | 'sistemas', valor: string) {
  const v = valor.trim();
  if (!v) return;
  const cfg = await banco().configuracoes.get(autor.organizacao_id);
  if (!cfg) return;
  const atual = cfg[lista] ?? [];
  if (atual.some(x => x.toLowerCase() === v.toLowerCase())) return;
  await atualizar('configuracoes', cfg.id, { [lista]: [...atual, v] } as Partial<Dados<Configuracoes>>);
}

// ─── Cliente ──────────────────────────────────────────────────────────────

export function dadosClienteVazio(): Dados<Cliente> {
  return {
    nome: '',
    cnpj: null,
    segmento: null,
    cidade: null,
    contato_nome: null,
    contato_email: null,
    contato_telefone: null,
    logo: null,
    custo_hora: null,
    funcionarios: null,
    faturamento_mensal: null,
    estagio: 'mapeando',
    razao_social: null,
    atividade: null,
    porte: null,
    abertura: null,
    endereco: null,
    telefone: null,
    email: null,
    site: null,
    instagram: null,
    socios: null,
    observacoes: null,
    contexto_especifico: null,
  };
}

export async function criarCliente(dados: Partial<Dados<Cliente>>) {
  return inserir('clientes', novoRegistro<Cliente>({ ...dadosClienteVazio(), ...dados }));
}

/** Exclui o cliente e tudo dele: sessões, áreas, processos, roteiro e capturas (LGPD). */
export async function excluirCliente(id: string) {
  const sessoes = await banco().sessoes.where('cliente_id').equals(id).primaryKeys();
  await Promise.all(sessoes.map(excluirSessao));
  await excluirFilhas('processos', 'cliente_id', id);
  await excluirFilhas('anexos', 'cliente_id', id);
  await excluirFilhas('anexos_partes', 'cliente_id', id);
  await excluirFilhas('glossario', 'cliente_id', id);
  await excluir('clientes', id);
}

// ─── Sessão ───────────────────────────────────────────────────────────────

export function dadosSessaoVazia(cliente_id: string): Dados<Sessao> {
  return {
    cliente_id,
    data: hojeISO(),
    titulo: null,
    participantes: [],
    status: 'em_andamento',
    validado_em: null,
    consentimento_gravacao: false,
    observacoes: null,
    visita_inicio: null,
    visita_acumulado_ms: 0,
  };
}

/** Cria a sessão já com o roteiro: o modelo do segmento do cliente, ou o padrão Sheep. */
export async function criarSessao(cliente_id: string, dados: Partial<Dados<Sessao>> = {}) {
  const reg = novoRegistro<Sessao>({ ...dadosSessaoVazia(cliente_id), ...dados });
  const [cliente, cfg] = await Promise.all([banco().clientes.get(cliente_id), banco().configuracoes.get(autor.organizacao_id)]);
  const modelo = cfg?.modelos_roteiro?.find(m => m.segmento === cliente?.segmento);
  const b = banco();
  await b.transaction('rw', [b.sessoes, b.roteiro_blocos, b.roteiro_perguntas], async () => {
    await b.sessoes.add(reg);
    await criarRoteiro(reg.id, modelo?.blocos ?? ROTEIRO_PADRAO);
  });
  aoGravar?.();
  return reg;
}

export async function excluirSessao(id: string) {
  await Promise.all(
    (['areas', 'processos', 'anexos', 'anexos_partes', 'roteiro_blocos', 'roteiro_perguntas', 'capturas'] as const).map(t =>
      excluirFilhas(t, 'sessao_id', id),
    ),
  );
  await excluir('sessoes', id);
}

// ─── Área ─────────────────────────────────────────────────────────────────

export async function criarArea(sessao_id: string, dados: Partial<Dados<Area>>) {
  const ordem = await banco().areas.where('sessao_id').equals(sessao_id).count();
  return inserir('areas', novoRegistro<Area>({ sessao_id, nome: '', responsavel: null, pessoas: null, entrega: null, ordem, ...dados }));
}

/** Área da sessão com esse nome (setor), criando se ainda não existe. */
export async function areaDoSetor(sessao_id: string, nome: string) {
  const existentes = await banco().areas.where('sessao_id').equals(sessao_id).toArray();
  const achada = existentes.find(a => !a.excluido && a.nome.toLowerCase() === nome.toLowerCase());
  return achada ?? criarArea(sessao_id, { nome });
}

/** Excluir a área solta os processos dela, que ficam sem setor em vez de sumir. */
export async function excluirArea(id: string) {
  const soltos = await banco().processos.where('area_id').equals(id).primaryKeys();
  await Promise.all([excluir('areas', id), ...soltos.map(p => atualizar('processos', p, { area_id: null }))]);
}

// ─── Processo ─────────────────────────────────────────────────────────────

export function dadosProcessoVazio(sessao_id: string, cliente_id: string, area_id: string | null): Dados<Processo> {
  return {
    sessao_id,
    cliente_id,
    area_id,
    codigo: '',
    titulo: '',
    ponto_focal: null,
    status: 'pendente',
    descricao: null,
    gatilho: null,
    fim: null,
    frequencia: null,
    sistemas: [],
    pessoas_envolvidas: null,
    vezes_mes: null,
    tempo_medio_min: null,
    custo_hora_override: null,
    perda_mes: null,
    reducao_pct: null,
    origem_numero: null,
    nivel_automacao: null,
    documentado: null,
    gargalos: null,
    pontos_atencao: null,
    ganho_esperado: null,
    observacoes: null,
    eisenhower: null,
    em_risco: false,
    ganho_validado_pct: null,
    responsaveis: [],
  };
}

/** Próximo código PRC-NNN da sessão. Conta os excluídos para nunca reaproveitar. */
export function proximoCodigo(existentes: string[]) {
  const maior = existentes.reduce((m, c) => Math.max(m, Number(/PRC-(\d+)/.exec(c)?.[1] ?? 0)), 0);
  return `PRC-${String(maior + 1).padStart(3, '0')}`;
}

export async function criarProcesso(sessao_id: string, area_id: string | null, dados: Partial<Dados<Processo>> = {}) {
  const sessao = await banco().sessoes.get(sessao_id);
  if (!sessao) throw new Error('sessão não encontrada');
  const codigos = (await banco().processos.where('sessao_id').equals(sessao_id).toArray()).map(p => p.codigo);
  return inserir(
    'processos',
    novoRegistro<Processo>({
      ...dadosProcessoVazio(sessao_id, sessao.cliente_id, area_id),
      responsaveis: autor.usuario_id === 'local' ? [] : [autor.usuario_id],
      ...dados,
      // Depois do que veio do formulário: o código é sempre gerado aqui (o
      // formulário de inclusão traz codigo vazio) e o vínculo vem da sessão.
      codigo: dados.codigo || proximoCodigo(codigos),
      sessao_id,
      cliente_id: sessao.cliente_id,
      area_id: dados.area_id !== undefined ? dados.area_id : area_id,
    }),
  );
}

/** Exclui o processo e os anexos dele. */
export async function excluirProcesso(id: string) {
  await excluirFilhas('anexos', 'processo_id', id);
  await excluirFilhas('anexos_partes', 'processo_id', id);
  await excluir('processos', id);
}

// ─── Anexos ───────────────────────────────────────────────────────────────

/** Novo anexo (foto, link ou arquivo) no fim da lista do processo. Arquivo: o conteúdo vem em `conteudo` (partes base64). */
export async function criarAnexo(
  processo_id: string,
  dados: Pick<Anexo, 'tipo'> & Partial<Pick<Anexo, 'url' | 'imagem' | 'descricao' | 'nome' | 'mime' | 'tamanho'>>,
  conteudo: string[] = [],
) {
  const processo = await banco().processos.get(processo_id);
  if (!processo) throw new Error('processo não encontrado');
  const ordem = await banco().anexos.where('processo_id').equals(processo_id).count();
  const anexo = await inserir(
    'anexos',
    novoRegistro<Anexo>({
      processo_id,
      sessao_id: processo.sessao_id,
      cliente_id: processo.cliente_id,
      tipo: dados.tipo,
      url: dados.url ?? null,
      imagem: dados.imagem ?? null,
      descricao: dados.descricao ?? null,
      ordem,
      nome: dados.nome ?? null,
      mime: dados.mime ?? null,
      tamanho: dados.tamanho ?? null,
      partes: conteudo.length || null,
    }),
  );
  for (const [i, parte] of conteudo.entries()) {
    await inserir(
      'anexos_partes',
      novoRegistro<AnexoParte>({
        anexo_id: anexo.id,
        processo_id,
        sessao_id: processo.sessao_id,
        cliente_id: processo.cliente_id,
        ordem: i,
        dados: parte,
      }),
    );
  }
  return anexo;
}

/** Exclui o anexo e solta o conteúdo pesado (foto ou partes do arquivo) para não ocupar espaço à toa. */
export async function excluirAnexo(id: string) {
  const partes = await banco().anexos_partes.where('anexo_id').equals(id).primaryKeys();
  await Promise.all(partes.map(p => atualizar('anexos_partes', p, { excluido: 1, dados: null } as never)));
  await atualizar('anexos', id, { excluido: 1, imagem: null } as never);
}

// ─── Glossário do cliente ─────────────────────────────────────────────────

export async function criarTermo(cliente_id: string, termo: string, definicao: string | null) {
  return inserir('glossario', novoRegistro<TermoGlossario>({ cliente_id, termo: termo.trim(), definicao: definicao?.trim() || null }));
}

// ─── Roteiro ──────────────────────────────────────────────────────────────

export async function criarRoteiro(sessao_id: string, modelo: ModeloRoteiro['blocos']) {
  const blocos: RoteiroBloco[] = [];
  const perguntas: RoteiroPergunta[] = [];
  modelo.forEach((b, i) => {
    const bloco = novoRegistro<RoteiroBloco>({ sessao_id, titulo: b.titulo, ordem: i, minutos_previstos: b.minutos, anotacoes: null });
    blocos.push(bloco);
    b.perguntas.forEach((p, j) =>
      perguntas.push(
        novoRegistro<RoteiroPergunta>({
          sessao_id,
          bloco_id: bloco.id,
          texto: p.texto,
          essencial: !!p.essencial,
          feita: false,
          anotacao: null,
          ordem: j,
        }),
      ),
    );
  });
  await banco().roteiro_blocos.bulkAdd(blocos);
  await banco().roteiro_perguntas.bulkAdd(perguntas);
  aoGravar?.();
}

export async function criarPergunta(sessao_id: string, bloco_id: string, texto: string) {
  const ordem = await banco().roteiro_perguntas.where('bloco_id').equals(bloco_id).count();
  return inserir(
    'roteiro_perguntas',
    novoRegistro<RoteiroPergunta>({ sessao_id, bloco_id, texto, essencial: false, feita: false, anotacao: null, ordem }),
  );
}

// ─── Captura ──────────────────────────────────────────────────────────────

export async function criarCaptura(sessao_id: string, conteudo: string, tipo: Captura['tipo'] = 'texto') {
  return inserir('capturas', novoRegistro<Captura>({ sessao_id, tipo, conteudo, processo_gerado_id: null, status: 'pendente' }));
}
