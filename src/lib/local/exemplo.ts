// Carteira de exemplo: três clientes de Maringá e região com números do tipo
// que aparece numa visita de verdade. Serve para demonstrar o sistema e testar
// as telas sem inventar dado na hora. As datas de registro ficam espalhadas
// nos últimos meses para o gráfico de ganho ter história.
import type { Dados, Processo } from '@/lib/dominio';
import { banco } from './banco';
import { areaDoSetor, criarCliente, criarProcesso, criarSessao, garantirConfiguracoes } from './repo';

const DIA = 24 * 60 * 60 * 1000;

function isoDiasAtras(dias: number) {
  const d = new Date(Date.now() - dias * DIA);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Semente = Partial<Dados<Processo>> & { setor: string; diasAtras: number };

async function semear(sessaoId: string, processos: Semente[]) {
  for (const { setor, diasAtras, ...dados } of processos) {
    const area = await areaDoSetor(sessaoId, setor);
    const p = await criarProcesso(sessaoId, area.id, dados);
    // Data de registro no passado: só para o exemplo contar uma história no gráfico.
    await banco().processos.update(p.id, { criado_em: Date.now() - diasAtras * DIA });
  }
}

export async function criarCarteiraExemplo() {
  await garantirConfiguracoes();

  // ── Contabilidade Horizonte ────────────────────────────────────────────
  const horizonte = await criarCliente({
    nome: 'Contabilidade Horizonte',
    cnpj: '12.345.678/0001-90',
    segmento: 'Contabilidade',
    cidade: 'Maringá/PR',
    contato_nome: 'Marcos Albuquerque',
    contato_email: 'marcos@horizontecontabil.com.br',
    contato_telefone: '(44) 99812-4410',
    custo_hora: 48,
    funcionarios: 26,
    faturamento_mensal: 410_000,
    estagio: 'em_analise',
  });
  const sHorizonte = await criarSessao(horizonte.id, {
    data: isoDiasAtras(62),
    titulo: 'Levantamento inicial',
    participantes: ['Marcos Albuquerque (sócio)', 'Juliana Prado (fiscal)', 'Renata Okada (DP)'],
    status: 'em_revisao',
    observacoes: 'Carteira de 320 clientes, a maioria Simples Nacional. Sócio quer crescer sem contratar no fiscal.',
  });
  await semear(sHorizonte.id, [
    {
      setor: 'Fiscal',
      diasAtras: 62,
      titulo: 'Importação de XML de notas',
      ponto_focal: 'Juliana Prado',
      status: 'em_proposta',
      descricao: 'Baixa os XML de entrada e saída de cada cliente na SEFAZ e importa no Domínio, conferindo CFOP e CST na mão.',
      gatilho: 'Fechamento do mês de cada cliente',
      fim: 'Notas escrituradas e conferidas',
      frequencia: 'mensal',
      sistemas: ['Domínio Sistemas', 'Portal da SEFAZ', 'Planilha Excel'],
      pessoas_envolvidas: 4,
      vezes_mes: 300,
      tempo_medio_min: 10,
      perda_mes: 1800,
      reducao_pct: 70,
      origem_numero: 'cliente',
      nivel_automacao: 'parcial',
      documentado: 'nao',
      gargalos: 'Erros de CFOP que só aparecem na validação do SPED e geram retificação.',
      pontos_atencao: 'Risco de multa por SPED com inconsistência. Só a Juliana trata as exceções.',
      ganho_esperado: 'Importação e conferência automáticas; equipe só trata exceções.',
      eisenhower: 1,
      em_risco: true,
      ganho_validado_pct: 80,
    },
    {
      setor: 'Fiscal',
      diasAtras: 60,
      titulo: 'Emissão e envio de guias DAS',
      ponto_focal: 'Juliana Prado',
      status: 'em_analise',
      descricao: 'Gera a guia no PGDAS, salva em PDF e manda para cada cliente pelo WhatsApp.',
      frequencia: 'mensal',
      sistemas: ['e-CAC', 'WhatsApp'],
      vezes_mes: 240,
      tempo_medio_min: 4,
      reducao_pct: 85,
      origem_numero: 'estimativa',
      nivel_automacao: 'manual',
      documentado: 'parcial',
      gargalos: 'Cliente diz que não recebeu a guia e paga com atraso.',
      eisenhower: 2,
    },
    {
      setor: 'Departamento Pessoal',
      diasAtras: 55,
      titulo: 'Fechamento da folha de pagamento',
      ponto_focal: 'Renata Okada',
      status: 'em_proposta',
      descricao: 'Recebe ponto e variáveis por e-mail e WhatsApp, digita no Domínio Folha e confere com o mês anterior.',
      gatilho: 'Dia 25 de cada mês',
      frequencia: 'mensal',
      sistemas: ['Domínio Sistemas', 'WhatsApp', 'E-mail'],
      pessoas_envolvidas: 4,
      vezes_mes: 85,
      tempo_medio_min: 35,
      perda_mes: 900,
      reducao_pct: 50,
      origem_numero: 'medido',
      nivel_automacao: 'parcial',
      documentado: 'sim',
      gargalos: 'Variáveis chegam fora do prazo e a equipe faz hora extra na última semana.',
      eisenhower: 1,
      ganho_validado_pct: 100,
    },
    {
      setor: 'Contábil',
      diasAtras: 40,
      titulo: 'Conciliação bancária',
      ponto_focal: 'Fernando Lima',
      status: 'pendente',
      descricao: 'Baixa o extrato OFX de cada banco e concilia lançamento a lançamento.',
      frequencia: 'mensal',
      sistemas: ['Domínio Sistemas', 'Planilha Excel'],
      vezes_mes: 180,
      nivel_automacao: 'parcial',
      documentado: 'nao',
      gargalos: 'Cliente manda extrato em PDF e alguém digita.',
    },
  ]);

  // ── Clínica Vida Plena ─────────────────────────────────────────────────
  const clinica = await criarCliente({
    nome: 'Clínica Vida Plena',
    cnpj: '23.456.789/0001-01',
    segmento: 'Clínica e saúde',
    cidade: 'Maringá/PR',
    contato_nome: 'Dra. Helena Duarte',
    contato_email: 'helena@vidaplena.med.br',
    contato_telefone: '(44) 3029-7781',
    custo_hora: 38,
    funcionarios: 34,
    faturamento_mensal: 620_000,
    estagio: 'mapeando',
  });
  const sClinica = await criarSessao(clinica.id, {
    data: isoDiasAtras(12),
    titulo: 'Recepção e faturamento',
    participantes: ['Dra. Helena Duarte (diretora)', 'Camila Rocha (recepção)', 'Paulo Nunes (faturamento)'],
  });
  await semear(sClinica.id, [
    {
      setor: 'Atendimento',
      diasAtras: 12,
      titulo: 'Agendamento pelo WhatsApp',
      ponto_focal: 'Camila Rocha',
      status: 'em_analise',
      descricao: 'Paciente pede horário no WhatsApp; a recepção consulta a agenda no sistema e responde à mão.',
      frequencia: 'diario',
      sistemas: ['WhatsApp', 'ERP'],
      pessoas_envolvidas: 3,
      vezes_mes: 900,
      tempo_medio_min: 4,
      perda_mes: 3200,
      reducao_pct: 60,
      origem_numero: 'cliente',
      nivel_automacao: 'manual',
      documentado: 'nao',
      gargalos: 'Mensagem fica sem resposta no horário de pico e o paciente marca em outra clínica.',
      eisenhower: 1,
      em_risco: true,
    },
    {
      setor: 'Financeiro',
      diasAtras: 10,
      titulo: 'Conferência de glosas de convênio',
      ponto_focal: 'Paulo Nunes',
      status: 'pendente',
      descricao: 'Confere o demonstrativo de cada convênio contra as guias enviadas e recorre das glosas.',
      frequencia: 'mensal',
      sistemas: ['Planilha Excel', 'Portal do convênio'],
      vezes_mes: 14,
      tempo_medio_min: 240,
      perda_mes: 6500,
      reducao_pct: 50,
      origem_numero: 'cliente',
      nivel_automacao: 'manual',
      documentado: 'parcial',
      gargalos: 'Glosa que passa do prazo de recurso vira perda.',
      eisenhower: 1,
    },
    {
      setor: 'Atendimento',
      diasAtras: 8,
      titulo: 'Confirmação de consultas do dia seguinte',
      ponto_focal: 'Camila Rocha',
      status: 'pendente',
      frequencia: 'diario',
      sistemas: ['WhatsApp'],
      vezes_mes: 22,
      tempo_medio_min: 50,
      origem_numero: 'estimativa',
      nivel_automacao: 'manual',
      gargalos: 'Faltas sem aviso deixam buraco na agenda.',
      eisenhower: 2,
    },
  ]);

  // ── Metalúrgica Paraná ─────────────────────────────────────────────────
  const metal = await criarCliente({
    nome: 'Metalúrgica Paraná',
    cnpj: '34.567.890/0001-12',
    segmento: 'Indústria',
    cidade: 'Sarandi/PR',
    contato_nome: 'Rogério Batista',
    contato_email: 'rogerio@metalurgicapr.ind.br',
    contato_telefone: '(44) 99731-2208',
    custo_hora: 42,
    funcionarios: 118,
    faturamento_mensal: 2_300_000,
    estagio: 'em_proposta',
  });
  const sMetal = await criarSessao(metal.id, {
    data: isoDiasAtras(30),
    titulo: 'Produção e compras',
    participantes: ['Rogério Batista (diretor industrial)', 'Ana Ferraz (PCP)', 'Luiz Matos (compras)'],
    status: 'validada',
    validado_em: Date.now() - 20 * DIA,
  });
  await semear(sMetal.id, [
    {
      setor: 'Produção',
      diasAtras: 30,
      titulo: 'Apontamento de produção em papel',
      ponto_focal: 'Ana Ferraz',
      status: 'automatizado',
      descricao: 'Operador anota peças e paradas em ficha de papel; o PCP digita na planilha no fim do turno.',
      frequencia: 'diario',
      sistemas: ['Papel', 'Planilha Excel'],
      pessoas_envolvidas: 6,
      vezes_mes: 1100,
      tempo_medio_min: 3,
      perda_mes: 4200,
      reducao_pct: 80,
      origem_numero: 'medido',
      nivel_automacao: 'automatico',
      documentado: 'sim',
      gargalos: 'Parada de máquina só aparece no relatório do dia seguinte.',
      eisenhower: 1,
      ganho_validado_pct: 100,
    },
    {
      setor: 'Compras',
      diasAtras: 28,
      titulo: 'Cotação de matéria-prima',
      ponto_focal: 'Luiz Matos',
      status: 'em_proposta',
      descricao: 'Pede preço por e-mail a três fornecedores e compara em planilha antes de aprovar.',
      frequencia: 'semanal',
      sistemas: ['E-mail', 'Planilha Excel', 'TOTVS'],
      vezes_mes: 120,
      tempo_medio_min: 25,
      reducao_pct: 60,
      origem_numero: 'cliente',
      nivel_automacao: 'manual',
      documentado: 'parcial',
      gargalos: 'Mesma cotação é digitada de novo no TOTVS.',
      eisenhower: 2,
      ganho_validado_pct: 60,
    },
    {
      setor: 'Qualidade',
      diasAtras: 26,
      titulo: 'Relatório de inspeção de lote',
      ponto_focal: 'Ana Ferraz',
      status: 'em_analise',
      frequencia: 'diario',
      sistemas: ['Planilha Excel'],
      vezes_mes: 66,
      tempo_medio_min: 30,
      perda_mes: 2500,
      origem_numero: 'estimativa',
      nivel_automacao: 'manual',
      gargalos: 'Lote reprovado só é descoberto depois de faturado.',
      eisenhower: 1,
      em_risco: true,
    },
  ]);

  return { clientes: [horizonte, clinica, metal], sessoes: [sHorizonte, sClinica, sMetal] };
}
