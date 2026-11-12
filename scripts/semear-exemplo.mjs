// Cria no banco (Turso ou local.db) um cliente FICTÍCIO com 3 sessões e 100
// processos, no formato da sincronização, para ver o app com volume.
//   node --env-file=.env.local scripts/semear-exemplo.mjs
// O nome começa com "Exemplo -" para ser fácil achar e excluir depois.
import { descricaoDe } from './exemplo-descricoes.mjs';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { COLUNAS } from '../src/lib/sync-protocolo.ts';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const NOME = 'Exemplo - Atacadista Vale do Ivaí';

const ja = (await db.execute({ sql: 'SELECT id FROM clientes WHERE nome = ? AND excluido = 0', args: [NOME] })).rows[0];
if (ja) {
  console.log('Já existe:', NOME);
  process.exit(0);
}

// Sorteio com semente: rodar de novo dá o mesmo conjunto.
let semente = 20261111;
const sorte = () => ((semente = (semente * 1664525 + 1013904223) % 4294967296) / 4294967296);
const um = lista => lista[Math.floor(sorte() * lista.length)];
const entre = (a, b) => Math.round(a + sorte() * (b - a));
const pesado = pares => {
  const total = pares.reduce((s, [, p]) => s + p, 0);
  let r = sorte() * total;
  for (const [v, p] of pares) if ((r -= p) <= 0) return v;
  return pares[0][0];
};

const uid = (await db.execute("SELECT id FROM usuarios WHERE organizacao_id = 'sheep' ORDER BY criado_em LIMIT 1")).rows[0]?.id ?? 'local';
const agora = Date.now();
const lote = [];

function registro(tabela, dados) {
  const cols = Object.keys(COLUNAS[tabela]);
  const tipo = COLUNAS[tabela];
  const ts = JSON.stringify(Object.fromEntries([...cols, 'excluido'].map(c => [c, agora])));
  const id = randomUUID();
  const todas = ['id', 'organizacao_id', 'criado_por', 'criado_em', 'atualizado_em', 'excluido', 'campos_ts', 'campos_sync', 'sincronizado_em', ...cols];
  const valor = c => {
    const x = dados[c];
    if (x === undefined || x === null) return tipo[c] === 'json' ? (c === 'ia' ? '{}' : '[]') : tipo[c] === 'bool' ? 0 : null;
    if (tipo[c] === 'json') return JSON.stringify(x);
    if (tipo[c] === 'bool') return x ? 1 : 0;
    return x;
  };
  lote.push({
    sql: `INSERT INTO ${tabela} (${todas.join(',')}) VALUES (${todas.map(() => '?').join(',')})`,
    args: [id, 'sheep', uid, agora, agora, 0, ts, ts, agora, ...cols.map(valor)],
  });
  return id;
}

const cliente = registro('clientes', {
  nome: NOME,
  razao_social: 'Atacadista Vale do Ivaí Ltda (fictício)',
  segmento: 'Distribuição',
  cidade: 'Ivaiporã/PR',
  estagio: 'mapeando',
  custo_hora: 46,
  funcionarios: 180,
  faturamento_mensal: 4800000,
  contato_nome: 'Marcos Andrade',
  contato_email: 'marcos@exemplo.com.br',
  contato_telefone: '(43) 99999-0000',
  observacoes:
    '**Cliente fictício** criado para testar o app com volume (100 processos).\n\n## Perfil\n- Atacadista de alimentos e limpeza\n- 3 centros de distribuição e frota própria\n- ERP próprio + muitas planilhas',
});

const sessoes = [
  { titulo: 'Levantamento inicial', data: '2026-11-03', status: 'validada', n: 50, participantes: ['Marcos Andrade', 'Paula Reis', 'Júlio Teixeira'] },
  { titulo: 'Retorno financeiro e fiscal', data: '2026-11-10', status: 'em_revisao', n: 30, participantes: ['Paula Reis', 'Carla Nunes'] },
  { titulo: 'Logística e comercial', data: '2026-11-17', status: 'em_andamento', n: 20, participantes: ['Júlio Teixeira'] },
];

// Processos por setor: título e o gargalo típico.
const MODELOS = {
  Financeiro: [
    ['Conciliação bancária diária', 'Extratos de 6 bancos baixados à mão'],
    ['Contas a pagar dos fornecedores', 'Boletos chegam por e-mail e WhatsApp'],
    ['Cobrança de clientes em atraso', 'Lista montada no Excel toda manhã'],
    ['Fechamento de caixa das filiais', 'Planilhas diferentes em cada filial'],
    ['Baixa de recebimentos no ERP', 'Digitação manual linha a linha'],
    ['Antecipação de recebíveis', 'Cotação feita banco a banco por telefone'],
    ['Previsão de fluxo de caixa', 'Depende de 4 planilhas que não conversam'],
  ],
  Fiscal: [
    ['Importação de XML de notas de entrada', 'Erros de CFOP só aparecem no SPED'],
    ['Apuração de ICMS-ST', 'Tabela de MVA atualizada à mão'],
    ['Conferência de notas de devolução', 'Divergência de valores com o pedido'],
    ['Emissão de guias de impostos', 'Prazo perdido quando alguém falta'],
    ['Escrituração de notas de serviço', 'Prefeituras com sistemas diferentes'],
  ],
  Compras: [
    ['Cotação com fornecedores', 'Respostas espalhadas em e-mail e WhatsApp'],
    ['Pedido de reposição de estoque', 'Ponto de pedido calculado no olho'],
    ['Conferência de pedido x nota', 'Três telas abertas para comparar'],
    ['Cadastro de novos produtos', 'Informações incompletas do fornecedor'],
  ],
  Estoque: [
    ['Inventário rotativo', 'Contagem anotada em papel'],
    ['Recebimento de mercadorias', 'Fila de caminhões na doca'],
    ['Controle de validade', 'Perda de produto vencido todo mês'],
    ['Transferência entre CDs', 'Pedido de transferência por planilha'],
  ],
  Logística: [
    ['Roteirização das entregas', 'Rotas montadas pela experiência do motorista'],
    ['Controle de entregas e canhotos', 'Canhoto físico se perde'],
    ['Agendamento com redes de supermercado', 'Portais diferentes para cada rede'],
    ['Gestão de abastecimento da frota', 'Notas de combustível sem conferência'],
    ['Manutenção preventiva dos caminhões', 'Controle em caderno'],
  ],
  Comercial: [
    ['Digitação de pedidos dos vendedores', 'Pedido chega por foto no WhatsApp'],
    ['Tabela de preços por região', 'Reajuste manual em centenas de itens'],
    ['Análise de crédito de novos clientes', 'Consultas em 3 sites diferentes'],
    ['Relatório de vendas semanal', 'Montado à mão toda segunda-feira'],
    ['Comissão dos vendedores', 'Cálculo em planilha com muitas exceções'],
  ],
  'Atendimento': [
    ['Registro de reclamações', 'Sem histórico por cliente'],
    ['Segunda via de boleto', 'Pedido repetido pelo telefone'],
    ['Trocas e avarias', 'Aprovação depende de 3 pessoas'],
  ],
  'Recursos Humanos': [
    ['Admissão de colaboradores', 'Documentos coletados por e-mail'],
    ['Controle de ponto e horas extras', 'Ajustes manuais no fim do mês'],
    ['Escala de motoristas e ajudantes', 'Montada em quadro branco'],
    ['Folha de pagamento', 'Conferência linha a linha antes de fechar'],
  ],
  TI: [
    ['Cadastro de usuários no ERP', 'Pedidos por e-mail sem padrão'],
    ['Backup das planilhas críticas', 'Feito quando alguém lembra'],
  ],
  Diretoria: [
    ['Painel de indicadores da diretoria', 'Números chegam atrasados e divergentes'],
    ['Aprovação de compras acima do limite', 'Aprovação perdida no WhatsApp'],
  ],
};
const SETORES = Object.keys(MODELOS);
const SISTEMAS = ['ERP próprio', 'Planilha Excel', 'WhatsApp', 'E-mail', 'Internet Banking', 'Portal da SEFAZ', 'Power BI'];

let codigo = 1;
for (const s of sessoes) {
  const sessaoId = registro('sessoes', {
    cliente_id: cliente,
    data: s.data,
    titulo: s.titulo,
    participantes: s.participantes,
    status: s.status,
    validado_em: s.status === 'validada' ? agora : null,
    consentimento_gravacao: false,
    visita_acumulado_ms: 0,
  });
  const areas = {};
  for (let i = 0; i < s.n; i++) {
    const setor = um(SETORES);
    if (!areas[setor]) areas[setor] = registro('areas', { sessao_id: sessaoId, nome: setor, ordem: Object.keys(areas).length });
    const [base, gargalo] = um(MODELOS[setor]);
    const status = pesado([['pendente', 30], ['em_analise', 25], ['em_proposta', 20], ['em_execucao', 15], ['automatizado', 10]]);
    const frequencia = pesado([['diario', 45], ['semanal', 25], ['mensal', 25], ['sob_demanda', 5]]);
    const porMes = { diario: 22, semanal: 4.3, mensal: 1, sob_demanda: 1 }[frequencia];
    // Volumes de uma empresa de 180 pessoas: soma perto de 1.400 horas por mês.
    const noPeriodo = frequencia === 'diario' ? entre(1, 6) : frequencia === 'semanal' ? entre(1, 5) : entre(1, 3);
    const incompleto = sorte() < 0.12;
    const trabalho = status === 'em_execucao' || status === 'automatizado';
    const titulo = i < MODELOS[setor].length ? base : `${base} - ${um(['CD Ivaiporã', 'CD Apucarana', 'CD Londrina', 'matriz'])}`;
    registro('processos', {
      sessao_id: sessaoId,
      cliente_id: cliente,
      area_id: areas[setor],
      codigo: `PRC-${String(codigo++).padStart(3, '0')}`,
      titulo,
      descricao: descricaoDe(titulo),
      ponto_focal: um(['Paula Reis', 'Júlio Teixeira', 'Carla Nunes', 'Marcos Andrade', 'Rafael Lima']),
      status,
      frequencia,
      vezes_mes: Number((noPeriodo * porMes).toPrecision(12)),
      tempo_medio_min: incompleto ? null : pesado([[entre(3, 15), 60], [entre(15, 45), 32], [entre(45, 120), 8]]),
      sistemas: [um(SISTEMAS), um(SISTEMAS)].filter((v, k, a) => a.indexOf(v) === k),
      pessoas_envolvidas: entre(1, 6),
      gargalos: gargalo,
      eisenhower: pesado([[1, 15], [2, 35], [3, 35], [4, 15]]),
      origem_numero: pesado([['cliente', 50], ['medido', 20], ['estimativa', 30]]),
      // (sem perda/risco: o campo saiu do formulário em 11/11/2026)
      perda_mes: null,
      em_risco: trabalho && sorte() < 0.25,
      ganho_validado_pct: status === 'automatizado' ? pesado([[100, 50], [80, 30], [60, 20]]) : status === 'em_execucao' && sorte() < 0.4 ? 30 : null,
      responsaveis: [],
      documentado: pesado([['nao', 60], ['parcial', 30], ['sim', 10]]),
      nivel_automacao: status === 'automatizado' ? 'automatico' : pesado([['manual', 70], ['parcial', 30]]),
    });
  }
}

// Turso aceita lotes; manda em pedaços para não estourar o tamanho do pedido.
for (let i = 0; i < lote.length; i += 60) await db.batch(lote.slice(i, i + 60), 'write');
console.log(`Criado em ${url.startsWith('file:') ? url : 'Turso'}: ${NOME}, ${sessoes.length} sessões, ${codigo - 1} processos (${lote.length} registros).`);
