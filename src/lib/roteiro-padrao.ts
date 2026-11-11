// Roteiro padrão Sheep para a visita de levantamento. Cada bloco tem tempo
// previsto e perguntas; as essenciais (estrela) são as que não podem faltar
// quando a visita aperta, porque sem elas não há número para o ROI.

export interface PerguntaModelo {
  texto: string;
  essencial?: boolean;
}

export interface BlocoModelo {
  titulo: string;
  minutos: number;
  perguntas: PerguntaModelo[];
}

export const ROTEIRO_PADRAO: BlocoModelo[] = [
  {
    titulo: 'Abertura',
    minutos: 10,
    perguntas: [
      { texto: 'Apresentar o objetivo da visita e como o levantamento vira proposta', essencial: true },
      { texto: 'O que motivou a conversa com a Sheep agora?', essencial: true },
      { texto: 'Pedir autorização para gravar áudio durante a visita' },
      { texto: 'Quem decide a contratação e quem vai usar no dia a dia?' },
    ],
  },
  {
    titulo: 'Visão geral das áreas',
    minutos: 15,
    perguntas: [
      { texto: 'Quais são as áreas da empresa e quantas pessoas tem cada uma?', essencial: true },
      { texto: 'Quem é o responsável de cada área?' },
      { texto: 'O que cada área entrega para as outras?' },
      { texto: 'Qual área está mais sobrecarregada hoje?', essencial: true },
    ],
  },
  {
    titulo: 'Processos por área',
    minutos: 40,
    perguntas: [
      { texto: 'Quais tarefas se repetem toda semana ou todo mês?', essencial: true },
      { texto: 'Quantas vezes por mês cada uma acontece?', essencial: true },
      { texto: 'Quanto tempo leva cada execução, do começo ao fim?', essencial: true },
      { texto: 'Quantas pessoas participam e quem é o ponto focal?' },
      { texto: 'O que dispara o processo (pedido, data, e-mail, sistema)?' },
      { texto: 'Existe passo a passo documentado?' },
    ],
  },
  {
    titulo: 'Gargalos e custo',
    minutos: 20,
    perguntas: [
      { texto: 'Onde o processo trava, atrasa ou depende de uma pessoa só?', essencial: true },
      { texto: 'Quais erros acontecem e quanto custa corrigir (retrabalho, multa, retificação)?', essencial: true },
      { texto: 'Qual o custo médio da hora da equipe, com encargos?', essencial: true },
      { texto: 'Existe hora extra recorrente? Em que época do mês?' },
      { texto: 'Já perderam cliente, prazo ou venda por causa disso?' },
    ],
  },
  {
    titulo: 'Ganho real e ROI',
    minutos: 15,
    perguntas: [
      { texto: 'Se esse processo andasse sozinho, o que a equipe faria com o tempo?', essencial: true },
      { texto: 'Quanto de receita está em risco ou deixa de entrar por mês?', essencial: true },
      { texto: 'Qual o faturamento mensal aproximado? (opcional)' },
      { texto: 'Planejam crescer sem contratar? Quanto?' },
    ],
  },
  {
    titulo: 'Sistemas e dados',
    minutos: 15,
    perguntas: [
      { texto: 'Quais sistemas usam (ERP, planilhas, portais) e quem tem acesso?', essencial: true },
      { texto: 'Os sistemas têm API ou exportação de dados?' },
      { texto: 'A mesma informação é digitada em mais de um lugar?', essencial: true },
      { texto: 'Onde ficam os arquivos e documentos (pasta, nuvem, e-mail, WhatsApp)?' },
    ],
  },
  {
    titulo: 'Validação e fechamento',
    minutos: 10,
    perguntas: [
      { texto: 'Ler em voz alta os 3 maiores gargalos e o custo de cada um', essencial: true },
      { texto: 'Confirmar os números que vieram de estimativa', essencial: true },
      { texto: 'Combinar quem envia os dados que faltaram e até quando' },
      { texto: 'Combinar a data de apresentação do diagnóstico', essencial: true },
    ],
  },
];
