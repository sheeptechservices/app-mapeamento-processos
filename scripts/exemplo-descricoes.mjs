// Descrição ("como é feito hoje") de cada processo do cliente fictício, pelo
// título base (sem o " - CD ..." do fim). Usada por semear-exemplo.mjs e por
// descrever-exemplo.mjs (que preenche os processos que já existem no banco).
export const DESCRICOES = {
  'Conciliação bancária diária':
    'O analista baixa o extrato de cada um dos 6 bancos, abre no Excel e confere lançamento por lançamento com o razão do ERP, marcando o que bateu.',
  'Contas a pagar dos fornecedores':
    'Os boletos chegam por e-mail e WhatsApp; o financeiro lança um a um no ERP, confere com a nota e agenda o pagamento no internet banking.',
  'Cobrança de clientes em atraso':
    'Toda manhã alguém tira o relatório de títulos vencidos, monta a lista no Excel e liga ou manda mensagem para cada cliente.',
  'Fechamento de caixa das filiais':
    'Cada filial manda a planilha do dia no fim do expediente; a matriz junta tudo, confere com o depósito e lança no ERP.',
  'Baixa de recebimentos no ERP':
    'O retorno do banco é aberto em PDF e cada recebimento é baixado à mão no ERP, título por título.',
  'Antecipação de recebíveis':
    'Quando falta caixa, o financeiro liga para cada banco, pede a taxa, compara numa planilha e escolhe onde antecipar.',
  'Previsão de fluxo de caixa':
    'Toda sexta o gerente junta 4 planilhas (pagar, receber, folha e impostos) e monta a previsão das próximas semanas.',
  'Importação de XML de notas de entrada':
    'O fiscal baixa os XML no portal da SEFAZ, importa no ERP e confere CFOP e CST nota por nota antes de escriturar.',
  'Apuração de ICMS-ST':
    'A tabela de MVA é atualizada à mão a cada mudança e o cálculo do imposto por produto é feito em planilha.',
  'Conferência de notas de devolução':
    'Cada nota de devolução é comparada com o pedido original para achar diferença de valor, quantidade ou imposto.',
  'Emissão de guias de impostos':
    'No fim do mês o fiscal gera cada guia no portal, salva em PDF e manda para o financeiro pagar.',
  'Escrituração de notas de serviço':
    'As notas de serviço são baixadas no site de cada prefeitura, cada uma com um sistema diferente, e lançadas no ERP.',
  'Cotação com fornecedores':
    'O comprador manda o pedido de cotação por e-mail e WhatsApp, junta as respostas numa planilha e escolhe o melhor preço.',
  'Pedido de reposição de estoque':
    'O comprador olha o saldo de cada item no ERP, decide no olho quanto pedir e monta o pedido para o fornecedor.',
  'Conferência de pedido x nota':
    'Na chegada da nota, alguém abre o pedido, a nota e o recebimento lado a lado e confere item por item.',
  'Cadastro de novos produtos':
    'O fornecedor manda os dados por e-mail; o cadastro completa o que falta (NCM, peso, código de barras) e lança no ERP.',
  'Inventário rotativo':
    'Uma equipe conta um setor do armazém por dia, anota em papel e depois digita as diferenças no ERP.',
  'Recebimento de mercadorias':
    'O conferente confere a carga com a nota em papel, anota as faltas e só depois o estoque é atualizado no sistema.',
  'Controle de validade':
    'Uma pessoa percorre as prateleiras procurando lotes perto do vencimento e avisa o comercial por WhatsApp.',
  'Transferência entre CDs':
    'O CD que precisa manda a lista por planilha; o outro separa, emite a nota de transferência e avisa por e-mail.',
  'Roteirização das entregas':
    'No fim da tarde o encarregado monta as rotas do dia seguinte com os motoristas, pela experiência de cada um.',
  'Controle de entregas e canhotos':
    'O motorista traz os canhotos assinados em papel; o escritório confere, dá baixa no ERP e arquiva.',
  'Agendamento com redes de supermercado':
    'Cada rede tem seu portal; alguém entra em um por um para agendar a entrega e anota a janela numa planilha.',
  'Gestão de abastecimento da frota':
    'Os motoristas guardam as notas de combustível e entregam no fim da semana para lançar e conferir o consumo.',
  'Manutenção preventiva dos caminhões':
    'A quilometragem de cada caminhão é anotada num caderno e o encarregado decide quando mandar para a revisão.',
  'Digitação de pedidos dos vendedores':
    'Os vendedores mandam foto do pedido pelo WhatsApp e o comercial digita item por item no ERP.',
  'Tabela de preços por região':
    'A cada reajuste o comercial altera à mão o preço de centenas de itens em cada tabela regional.',
  'Análise de crédito de novos clientes':
    'O analista consulta o CNPJ em 3 sites diferentes, junta as informações e decide o limite numa planilha.',
  'Relatório de vendas semanal':
    'Toda segunda alguém exporta as vendas do ERP, monta as tabelas e gráficos no Excel e manda por e-mail.',
  'Comissão dos vendedores':
    'No fim do mês o RH cruza vendas, devoluções e metas numa planilha cheia de exceções para chegar na comissão.',
  'Registro de reclamações':
    'As reclamações chegam por telefone e WhatsApp e são anotadas numa planilha, sem histórico por cliente.',
  'Segunda via de boleto':
    'O cliente liga ou manda mensagem pedindo o boleto; o atendente procura no ERP, gera o PDF e envia.',
  'Trocas e avarias':
    'O cliente relata a avaria, o atendimento abre o pedido de troca e ele passa por 3 aprovações antes de seguir.',
  'Admissão de colaboradores':
    'O RH pede os documentos por e-mail, confere um a um, preenche a ficha e cadastra no sistema da folha.',
  'Controle de ponto e horas extras':
    'O ponto é exportado do relógio, conferido em planilha e os ajustes de horas extras são lançados à mão no fim do mês.',
  'Escala de motoristas e ajudantes':
    'A escala da semana é montada num quadro branco e fotografada para o grupo de WhatsApp da equipe.',
  'Folha de pagamento':
    'Antes de fechar a folha, o RH confere linha a linha os proventos e descontos de cada colaborador.',
  'Cadastro de usuários no ERP':
    'Os gestores pedem acesso por e-mail sem padrão e a TI cria cada usuário e perfil à mão.',
  'Backup das planilhas críticas':
    'As planilhas mais importantes são copiadas para um HD externo quando alguém lembra de fazer.',
  'Painel de indicadores da diretoria':
    'Cada área manda seus números por e-mail e alguém monta o painel no Power BI, sempre com dados atrasados.',
  'Aprovação de compras acima do limite':
    'O comprador manda o pedido para o diretor pelo WhatsApp e espera a aprovação, que às vezes se perde na conversa.',
};

/** Descrição de um título (com ou sem o sufixo de unidade). */
export function descricaoDe(titulo) {
  return DESCRICOES[titulo.split(' - ')[0]] ?? null;
}
