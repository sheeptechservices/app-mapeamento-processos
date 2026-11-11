import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Processo } from '@/lib/dominio';
import { BancoLocal, banco, usarBanco } from './banco';
import { mesclarPorCampo } from './mesclar';
import {
  areaDoSetor,
  atualizar,
  criarArea,
  criarCliente,
  criarProcesso,
  criarSessao,
  dadosProcessoVazio,
  excluirArea,
  excluirCliente,
  excluirSessao,
  garantirConfiguracoes,
  lembrarOpcao,
  proximoCodigo,
  quandoGravar,
} from './repo';
import { apagarRascunho, guardarRascunho, lerRascunho } from './gravacao';
import { contarPendentesFora } from './sync';

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  usarBanco(new BancoLocal(`teste-${crypto.randomUUID()}`));
});

async function clienteComSessao(nome = 'Contabilidade Horizonte') {
  const cliente = await criarCliente({ nome, custo_hora: 48 });
  const sessao = await criarSessao(cliente.id);
  return { cliente, sessao };
}

describe('repo local', () => {
  it('cria cliente pendente e com carimbo por campo', async () => {
    const c = await criarCliente({ nome: 'Clínica Vida Plena', custo_hora: 38 });
    const salvo = await banco().clientes.get(c.id);
    expect(salvo).toMatchObject({ nome: 'Clínica Vida Plena', estagio: 'mapeando', _pendente: 1, excluido: 0 });
    expect(salvo?._ts.custo_hora).toBeGreaterThan(0);
  });

  it('sessão nasce ligada ao cliente e com o roteiro padrão', async () => {
    const { cliente, sessao } = await clienteComSessao();
    expect(sessao.cliente_id).toBe(cliente.id);
    expect(await banco().roteiro_blocos.where('sessao_id').equals(sessao.id).count()).toBe(7);
  });

  it('um cliente aceita várias sessões', async () => {
    const { cliente } = await clienteComSessao();
    await criarSessao(cliente.id, { titulo: 'Retorno da visita' });
    expect(await banco().sessoes.where('cliente_id').equals(cliente.id).count()).toBe(2);
  });

  it('processo herda o cliente da sessão e numera em sequência', async () => {
    const { cliente, sessao } = await clienteComSessao();
    const a = await criarProcesso(sessao.id, null, { titulo: 'Importação de XML' });
    const b = await criarProcesso(sessao.id, null);
    expect(a.cliente_id).toBe(cliente.id);
    expect([a.codigo, b.codigo]).toEqual(['PRC-001', 'PRC-002']);
    expect(proximoCodigo(['PRC-001', 'PRC-007', 'outro'])).toBe('PRC-008');
  });

  it('processo vindo do formulário (codigo vazio, outra sessão) ganha código e vínculo certos', async () => {
    const { cliente, sessao } = await clienteComSessao();
    const area = await criarArea(sessao.id, { nome: 'Fiscal' });
    const doFormulario = { ...dadosProcessoVazio('outra-sessao', 'outro-cliente', null), titulo: 'Faturamento de convênios' };
    const p = await criarProcesso(sessao.id, area.id, { ...doFormulario, area_id: area.id });
    expect(p).toMatchObject({ codigo: 'PRC-001', sessao_id: sessao.id, cliente_id: cliente.id, area_id: area.id });
  });

  it('atualizar carimba só os campos alterados', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);
    const { sessao } = await clienteComSessao();
    const p = await criarProcesso(sessao.id, null, { titulo: 'Agendamento' });
    vi.setSystemTime(5_000);
    await atualizar('processos', p.id, { vezes_mes: 800 });
    const salvo = await banco().processos.get(p.id);
    expect(salvo?._ts.vezes_mes).toBe(5_000);
    expect(salvo?._ts.titulo).toBe(1_000);
  });

  it('área do setor é reaproveitada pelo nome', async () => {
    const { sessao } = await clienteComSessao();
    const a = await areaDoSetor(sessao.id, 'Fiscal');
    const b = await areaDoSetor(sessao.id, 'fiscal');
    expect(b.id).toBe(a.id);
  });

  it('excluir área solta os processos dela', async () => {
    const { sessao } = await clienteComSessao();
    const area = await criarArea(sessao.id, { nome: 'Fiscal' });
    const p = await criarProcesso(sessao.id, area.id);
    await excluirArea(area.id);
    expect((await banco().processos.get(p.id))).toMatchObject({ area_id: null, excluido: 0 });
  });

  it('excluir sessão leva áreas, processos e roteiro junto', async () => {
    const { sessao } = await clienteComSessao();
    const area = await criarArea(sessao.id, { nome: 'RH' });
    const p = await criarProcesso(sessao.id, area.id);
    await excluirSessao(sessao.id);
    expect((await banco().sessoes.get(sessao.id))?.excluido).toBe(1);
    expect((await banco().processos.get(p.id))?.excluido).toBe(1);
    const blocos = await banco().roteiro_blocos.where('sessao_id').equals(sessao.id).toArray();
    expect(blocos.every(b => b.excluido === 1)).toBe(true);
  });

  it('excluir cliente apaga as sessões e os processos dele (LGPD)', async () => {
    const { cliente, sessao } = await clienteComSessao();
    const outra = await criarSessao(cliente.id);
    const p1 = await criarProcesso(sessao.id, null);
    const p2 = await criarProcesso(outra.id, null);
    const vizinho = await clienteComSessao('Metalúrgica Paraná');
    const p3 = await criarProcesso(vizinho.sessao.id, null);
    await excluirCliente(cliente.id);
    expect((await banco().clientes.get(cliente.id))?.excluido).toBe(1);
    expect((await banco().sessoes.get(outra.id))?.excluido).toBe(1);
    expect((await banco().processos.get(p1.id))?.excluido).toBe(1);
    expect((await banco().processos.get(p2.id))?.excluido).toBe(1);
    expect((await banco().processos.get(p3.id))?.excluido).toBe(0);
  });

  it('configurações nascem uma vez por organização, com os padrões', async () => {
    const a = await garantirConfiguracoes();
    const b = await garantirConfiguracoes();
    expect(b.id).toBe(a.id);
    expect(a).toMatchObject({ id: 'sheep', reducao_padrao_pct: 60, horizonte_meses: 12 });
    expect(a.setores).toContain('Fiscal');
    expect(await banco().configuracoes.count()).toBe(1);
  });
});

function processo(campos: Partial<Processo>, ts: Record<string, number>): Processo {
  return {
    ...dadosProcessoVazio('sessao', 'cliente', null),
    id: 'p1',
    organizacao_id: 'sheep',
    criado_por: 'a',
    criado_em: 0,
    atualizado_em: Math.max(0, ...Object.values(ts)),
    excluido: 0,
    _pendente: 0,
    _ts: ts,
    ...campos,
  };
}

describe('aviso de escrita', () => {
  // Criar sessão grava sessão e roteiro numa transação só dessas tabelas; o
  // aviso de escrita chega de dentro dela e conta pendências de todas.
  // (Contar ali dentro com contarPendentes dava NotFoundError: era o erro da tela.)
  it('conta pendências sem erro mesmo vindo de dentro da transação da sessão', async () => {
    const contagens: Promise<number>[] = [];
    quandoGravar(() => contagens.push(contarPendentesFora()));
    try {
      await clienteComSessao();
      const n = await Promise.all(contagens);
      expect(n.length).toBeGreaterThan(0);
      expect(n.at(-1)).toBeGreaterThan(0);
    } finally {
      quandoGravar(null);
    }
  });
});

describe('opções criadas e rascunhos', () => {
  it('opção criada entra na lista da organização, sem repetir e marcada para sincronizar', async () => {
    await garantirConfiguracoes();
    await lembrarOpcao('segmentos', 'Laticínios');
    await lembrarOpcao('segmentos', 'laticínios ');
    await lembrarOpcao('sistemas', 'Sankhya');
    await lembrarOpcao('setores', 'Captação de leite');
    const cfg = await banco().configuracoes.get('sheep');
    expect(cfg?.segmentos).toEqual(['Laticínios']);
    expect(cfg?.sistemas).toEqual(['Sankhya']);
    expect(cfg?.setores).toContain('Captação de leite');
    expect(cfg?._pendente).toBe(1);
  });

  it('sem configurações ainda (antes da 1a sincronização) não cria a linha por cima do servidor', async () => {
    await lembrarOpcao('segmentos', 'Laticínios');
    expect(await banco().configuracoes.count()).toBe(0);
  });

  it('rascunho de cadastro novo fica no aparelho até ser apagado', async () => {
    await guardarRascunho('processo:s1', { titulo: 'Captação de leite' }, { setor: 'Qualidade' });
    expect(await lerRascunho('processo:s1')).toMatchObject({ dados: { titulo: 'Captação de leite' }, extras: { setor: 'Qualidade' } });
    await apagarRascunho('processo:s1');
    expect(await lerRascunho('processo:s1')).toBeNull();
  });
});

describe('mesclarPorCampo', () => {
  it('campos diferentes alterados nos dois lados são preservados', () => {
    const local = processo({ vezes_mes: 300, titulo: 'Importar XML' }, { vezes_mes: 20, titulo: 5 });
    const remoto = processo({ vezes_mes: null, titulo: 'Importar XML de clientes' }, { vezes_mes: 5, titulo: 30 });
    const { registro, disputados } = mesclarPorCampo(local, remoto, 10);
    expect(registro.vezes_mes).toBe(300);
    expect(registro.titulo).toBe('Importar XML de clientes');
    expect(disputados).toEqual([]);
    expect(registro._pendente).toBe(1);
  });

  it('o mesmo campo alterado nos dois lados vira disputa e vence o mais novo', () => {
    const local = processo({ tempo_medio_min: 10 }, { tempo_medio_min: 40 });
    const remoto = processo({ tempo_medio_min: 15 }, { tempo_medio_min: 50 });
    const { registro, disputados } = mesclarPorCampo(local, remoto, 30);
    expect(registro.tempo_medio_min).toBe(15);
    expect(disputados).toEqual(['tempo_medio_min']);
  });

  it('empate de carimbo fica com o remoto', () => {
    const local = processo({ gargalos: 'local' }, { gargalos: 10 });
    const remoto = processo({ gargalos: 'remoto' }, { gargalos: 10 });
    expect(mesclarPorCampo(local, remoto).registro.gargalos).toBe('remoto');
  });

  it('valores iguais nos dois lados não são disputa', () => {
    const local = processo({ sistemas: ['ERP'] }, { sistemas: 40 });
    const remoto = processo({ sistemas: ['ERP'] }, { sistemas: 50 });
    expect(mesclarPorCampo(local, remoto, 30).disputados).toEqual([]);
  });
});
