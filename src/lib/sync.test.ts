// Sincronização de ponta a ponta: dois aparelhos (IndexedDB falsos e separados)
// falando com o servidor real (processarSync) sobre um libsql em memória.
import 'fake-indexeddb/auto';
import { createClient, type Client } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { partir } from './arquivo';
import { BancoLocal, usarBanco } from './local/banco';
import { lerConteudoAnexo } from './local/consultas';
import {
  atualizar,
  criarAnexo,
  criarArea,
  criarCliente,
  criarProcesso,
  criarSessao,
  criarTermo,
  definirAutor,
  excluir,
  excluirAnexo,
  excluirCliente,
  excluirProcesso,
} from './local/repo';
import { rodadaSync, type Transporte } from './local/sync';
import { processarSync, type SessaoSync } from './servidor/sync';

let servidor: Client;
let relogio = 1_000_000;

function transporte(sessao: SessaoSync): Transporte {
  // JSON ida e volta, como na rede: nada de objeto compartilhado por referência.
  return async pedido => JSON.parse(JSON.stringify(await processarSync(servidor, sessao, JSON.parse(JSON.stringify(pedido)))));
}

const ORG = { org: 'sheep', uid: 'consultor-a' };
const ORG_B = { org: 'sheep', uid: 'consultor-b' };

interface Aparelho {
  db: BancoLocal;
  sessao: SessaoSync;
}

function aparelho(sessao: SessaoSync): Aparelho {
  return { db: new BancoLocal(`aparelho-${crypto.randomUUID()}`), sessao };
}

/** Executa ações "no" aparelho: escritas do repo vão para o banco dele. */
async function em<T>(a: Aparelho, fn: () => Promise<T>): Promise<T> {
  usarBanco(a.db);
  definirAutor({ organizacao_id: a.sessao.org, usuario_id: a.sessao.uid });
  return fn();
}

/** Avança o relógio: cada passo do teste acontece num milissegundo diferente. */
function passo(ms = 1_000) {
  relogio += ms;
  vi.setSystemTime(relogio);
}

const sync = (a: Aparelho) => em(a, () => rodadaSync(transporte(a.sessao), a.db));

/** Cliente com uma sessão aberta: o ponto de partida de todo mapeamento. `id` é o da sessão. */
async function clienteComSessao(nome: string, dados: Record<string, unknown> = {}) {
  const cliente = await criarCliente({ nome, ...dados });
  const sessao = await criarSessao(cliente.id);
  return { cliente, sessao, id: sessao.id };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  passo();
  servidor = createClient({ url: ':memory:' });
  await servidor.executeMultiple(readFileSync('db/schema.sql', 'utf8'));
  // No app a organização nasce no primeiro login (upsertUsuario).
  await servidor.execute(`INSERT INTO organizacoes (id, nome, criado_em) VALUES ('sheep', 'Sheep', 0), ('outra-consultoria', 'Outra', 0)`);
});

afterEach(() => {
  vi.useRealTimers();
  servidor.close();
});

describe('sincronização entre aparelhos', () => {
  it('fotos grandes vão e voltam em partes, sem passar do limite de um pedido', async () => {
    const celular = aparelho(ORG);
    const desktop = aparelho(ORG_B);
    const lev = await em(celular, () => clienteComSessao('Atacadista'));
    const p = await em(celular, () => criarProcesso(lev.id, null, { titulo: 'Recebimento de mercadorias' }));
    const foto = `data:image/webp;base64,${'A'.repeat(300_000)}`;
    for (let i = 0; i < 20; i++) await em(celular, () => criarAnexo(p.id, { tipo: 'foto', imagem: foto, descricao: `Doca ${i + 1}` }));
    await em(celular, () => criarAnexo(p.id, { tipo: 'link', url: 'https://exemplo.com/planilha', descricao: 'Planilha de recebimento' }));

    // Mede o tamanho de cada pedido e de cada resposta, como a Vercel veria.
    const idas: number[] = [];
    const voltas: number[] = [];
    const medindo =
      (s: SessaoSync): Transporte =>
      async pedido => {
        idas.push(JSON.stringify(pedido).length);
        const r = await transporte(s)(pedido);
        voltas.push(JSON.stringify(r).length);
        return r;
      };

    passo();
    await em(celular, () => rodadaSync(medindo(celular.sessao), celular.db));
    expect(idas.length).toBeGreaterThan(2);
    expect(Math.max(...idas)).toBeLessThan(4_500_000);
    expect(await celular.db.anexos.where('_pendente').equals(1).count()).toBe(0);

    passo();
    idas.length = 0;
    voltas.length = 0;
    await em(desktop, () => rodadaSync(medindo(desktop.sessao), desktop.db));
    expect(voltas.length).toBeGreaterThan(2);
    expect(Math.max(...voltas)).toBeLessThan(4_500_000);
    const anexos = await desktop.db.anexos.where('processo_id').equals(p.id).toArray();
    expect(anexos).toHaveLength(21);
    expect(anexos.filter(a => a.tipo === 'foto').every(a => a.imagem === foto)).toBe(true);
    expect(anexos.find(a => a.tipo === 'link')).toMatchObject({
      url: 'https://exemplo.com/planilha',
      descricao: 'Planilha de recebimento',
    });

    // Sincronizar de novo não traz as fotos outra vez.
    passo(10_000);
    voltas.length = 0;
    await em(desktop, () => rodadaSync(medindo(desktop.sessao), desktop.db));
    expect(Math.max(...voltas)).toBeLessThan(50_000);
  });

  it('foto que chegou sem o arquivo (janela de sobreposição) é pedida inteira na rodada seguinte', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Clínica'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Recepção' }));
    const foto = await em(a, () => criarAnexo(p.id, { tipo: 'foto', imagem: 'data:image/webp;base64,QUJD', descricao: 'Balcão' }));
    passo();
    await sync(a);
    passo();
    await sync(b);
    // Simula o caso raro: o aparelho perdeu o registro que está dentro da janela do cursor.
    await b.db.anexos.delete(foto.id);
    passo();
    await sync(b);
    expect(await b.db.anexos.get(foto.id)).toMatchObject({ descricao: 'Balcão' });
    expect((await b.db.anexos.get(foto.id))?.imagem ?? null).toBeNull();
    passo();
    await sync(b);
    expect(await b.db.anexos.get(foto.id)).toMatchObject({ imagem: 'data:image/webp;base64,QUJD', _pendente: 0 });
  });

  it('arquivo grande (PDF, planilha) vai em partes e chega inteiro no outro aparelho', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Distribuidora'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Fechamento de caixa' }));
    // Arquivo de uns 6 MB em base64, partido como o app parte.
    const base64 = Buffer.from(new Uint8Array(4_500_000).map((_, i) => i % 251)).toString('base64');
    const partes = partir(base64);
    const anexo = await em(a, () =>
      criarAnexo(p.id, { tipo: 'arquivo', nome: 'caixa.xlsx', mime: 'application/vnd.ms-excel', tamanho: 4_500_000 }, partes),
    );
    passo();
    await sync(a);
    passo();
    await sync(b);
    expect(await b.db.anexos.get(anexo.id)).toMatchObject({ tipo: 'arquivo', nome: 'caixa.xlsx', partes: partes.length });
    const conteudo = await em(b, () => lerConteudoAnexo({ id: anexo.id, partes: partes.length }));
    expect(conteudo?.join('')).toBe(base64);

    // Excluir o anexo leva as partes e solta o conteúdo.
    passo();
    await em(a, () => excluirAnexo(anexo.id));
    await sync(a);
    passo();
    await sync(b);
    const restantes = await b.db.anexos_partes.where('anexo_id').equals(anexo.id).toArray();
    expect(restantes.every(r => r.excluido === 1 && !r.dados)).toBe(true);
  });

  it('glossário do cliente sincroniza e sai junto quando o cliente é excluído', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Laticínio'));
    const termo = await em(a, () => criarTermo(lev.cliente.id, ' Romaneio ', 'Lista da carga de cada caminhão'));
    passo();
    await sync(a);
    passo();
    await sync(b);
    expect(await b.db.glossario.get(termo.id)).toMatchObject({ termo: 'Romaneio', definicao: 'Lista da carga de cada caminhão', excluido: 0 });

    passo();
    await em(b, () => atualizar('glossario', termo.id, { definicao: 'Lista da carga e da rota de cada caminhão' }));
    await sync(b);
    passo();
    await sync(a);
    expect(await a.db.glossario.get(termo.id)).toMatchObject({ definicao: 'Lista da carga e da rota de cada caminhão' });

    passo();
    await em(a, () => excluirCliente(lev.cliente.id));
    await sync(a);
    passo();
    await sync(b);
    expect(await b.db.glossario.get(termo.id)).toMatchObject({ excluido: 1 });
  });

  it('excluir o processo leva os anexos junto, nos dois aparelhos', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Clínica'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Agendamento' }));
    const anexo = await em(a, () => criarAnexo(p.id, { tipo: 'link', url: 'https://exemplo.com', descricao: 'Agenda' }));
    passo();
    await sync(a);
    passo();
    await sync(b);
    expect(await b.db.anexos.get(anexo.id)).toMatchObject({ excluido: 0 });

    passo();
    await em(a, () => excluirProcesso(p.id));
    await sync(a);
    passo();
    await sync(b);
    expect(await b.db.anexos.get(anexo.id)).toMatchObject({ excluido: 1 });
    expect(await b.db.processos.get(p.id)).toMatchObject({ excluido: 1 });
  });

  it('o que foi criado offline num aparelho chega no outro', async () => {
    const celular = aparelho(ORG);
    const desktop = aparelho(ORG_B);

    const lev = await em(celular, () => clienteComSessao('Contabilidade Horizonte', { custo_hora: 48 }));
    const area = await em(celular, () => criarArea(lev.id, { nome: 'Fiscal' }));
    const p = await em(celular, () => criarProcesso(lev.id, area.id, { titulo: 'Importação de XML', vezes_mes: 300, tempo_medio_min: 10 }));

    passo();
    const r1 = await sync(celular);
    expect(r1.enviados).toBeGreaterThan(4); // cliente, sessão, área, processo e o roteiro padrão
    expect(await celular.db.processos.get(p.id)).toMatchObject({ _pendente: 0 });

    passo();
    await sync(desktop);
    const noDesktop = await desktop.db.processos.get(p.id);
    expect(noDesktop).toMatchObject({ titulo: 'Importação de XML', vezes_mes: 300, area_id: area.id, _pendente: 0 });
    expect(await desktop.db.clientes.get(lev.cliente.id)).toMatchObject({ nome: 'Contabilidade Horizonte', custo_hora: 48 });
    expect(await desktop.db.sessoes.get(lev.id)).toMatchObject({ cliente_id: lev.cliente.id });
    expect(noDesktop?.cliente_id).toBe(lev.cliente.id);
    expect(await desktop.db.roteiro_perguntas.where('sessao_id').equals(lev.id).count()).toBeGreaterThan(20);
  });

  it('campos diferentes editados nos dois aparelhos convivem sem conflito', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Clínica Vida'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Agendamento' }));
    passo();
    await sync(a);
    passo();
    await sync(b);

    passo();
    await em(a, () => atualizar('processos', p.id, { vezes_mes: 800 }));
    passo();
    await em(b, () => atualizar('processos', p.id, { gargalos: 'Paciente falta e a agenda fica vazia' }));

    passo();
    await sync(a);
    passo();
    const rb = await sync(b);
    passo();
    await sync(a);

    for (const ap of [a, b]) {
      const reg = await ap.db.processos.get(p.id);
      expect(reg).toMatchObject({ vezes_mes: 800, gargalos: 'Paciente falta e a agenda fica vazia', _pendente: 0 });
      expect(reg?._conflitos).toBeUndefined();
    }
    expect(rb.conflitos).toBe(0);
  });

  it('o mesmo campo editado nos dois vira conflito marcado e vence a escrita mais nova', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Metalúrgica Paraná'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Apontamento de produção' }));
    passo();
    await sync(a);
    passo();
    await sync(b);

    passo();
    await em(a, () => atualizar('processos', p.id, { tempo_medio_min: 15 }));
    passo();
    await em(b, () => atualizar('processos', p.id, { tempo_medio_min: 25 }));

    passo();
    await sync(a); // A chega primeiro: sem conflito
    passo();
    const rb = await sync(b); // B chega depois e mexeu no mesmo campo: conflito

    expect(rb.conflitos).toBe(1);
    const emB = await b.db.processos.get(p.id);
    expect(emB?.tempo_medio_min).toBe(25);
    expect(emB?._conflitos).toEqual(['tempo_medio_min']);

    passo();
    await sync(a);
    expect((await a.db.processos.get(p.id))?.tempo_medio_min).toBe(25);

    // Editar o campo resolve o conflito.
    passo();
    await em(b, () => atualizar('processos', p.id, { tempo_medio_min: 20 }));
    expect((await b.db.processos.get(p.id))?._conflitos).toBeUndefined();
  });

  it('exclusão propaga para o outro aparelho', async () => {
    const a = aparelho(ORG);
    const b = aparelho(ORG_B);
    const lev = await em(a, () => clienteComSessao('Distribuidora Norte'));
    const area = await em(a, () => criarArea(lev.id, { nome: 'Compras' }));
    passo();
    await sync(a);
    passo();
    await sync(b);
    passo();
    await em(b, () => excluir('areas', area.id));
    passo();
    await sync(b);
    passo();
    await sync(a);
    expect((await a.db.areas.get(area.id))?.excluido).toBe(1);
  });

  it('o que foi digitado durante a ida e volta não é atropelado e continua pendente', async () => {
    const a = aparelho(ORG);
    const lev = await em(a, () => clienteComSessao('Escritório Alfa'));
    const p = await em(a, () => criarProcesso(lev.id, null, { titulo: 'Folha' }));
    passo();
    await sync(a);

    passo();
    await em(a, () => atualizar('processos', p.id, { vezes_mes: 85 }));
    const lento: Transporte = async pedido => {
      const resp = await transporte(a.sessao)(pedido);
      passo();
      await atualizar('processos', p.id, { tempo_medio_min: 35 }); // digitou enquanto a rede respondia
      return resp;
    };
    passo();
    await em(a, () => rodadaSync(lento, a.db));
    const reg = await a.db.processos.get(p.id);
    expect(reg).toMatchObject({ vezes_mes: 85, tempo_medio_min: 35, _pendente: 1 });

    passo();
    await sync(a);
    expect((await a.db.processos.get(p.id))?._pendente).toBe(0);
  });

  it('isola organizações: não lê nem sobrescreve dado de outra', async () => {
    const sheep = aparelho(ORG);
    const outra = aparelho({ org: 'outra-consultoria', uid: 'x' });
    const lev = await em(sheep, () => clienteComSessao('Cliente Sigiloso'));
    passo();
    await sync(sheep);

    passo();
    await sync(outra);
    expect(await outra.db.clientes.count()).toBe(0);
    expect(await outra.db.sessoes.count()).toBe(0);

    // A outra organização tenta gravar por cima usando o mesmo id.
    passo();
    await em(outra, async () => {
      await outra.db.clientes.put({ ...lev.cliente, nome: 'Invadido', _ts: { nome: Date.now() }, _pendente: 1 });
    });
    passo();
    await sync(outra);
    const { rows } = await servidor.execute({ sql: 'SELECT nome, organizacao_id FROM clientes WHERE id = ?', args: [lev.cliente.id] });
    expect(rows[0]).toMatchObject({ nome: 'Cliente Sigiloso', organizacao_id: 'sheep' });
    expect((await outra.db.clientes.get(lev.cliente.id))?._pendente).toBe(0);
  });

  it('reenviar o mesmo pedido (resposta perdida na rede) não gera conflito', async () => {
    const a = aparelho(ORG);
    const lev = await em(a, () => clienteComSessao('Clínica Sorriso'));
    passo();
    await sync(a);
    passo();
    await em(a, () => atualizar('clientes', lev.cliente.id, { custo_hora: 52 }));
    const perdeResposta: Transporte = async pedido => {
      await transporte(a.sessao)(pedido);
      throw new Error('conexão caiu');
    };
    passo();
    await expect(em(a, () => rodadaSync(perdeResposta, a.db))).rejects.toThrow('conexão caiu');
    passo();
    const r = await sync(a);
    expect(r.conflitos).toBe(0);
    expect(await a.db.clientes.get(lev.cliente.id)).toMatchObject({ custo_hora: 52, _pendente: 0 });
  });
  it('usuário só de leitura não grava nada no servidor', async () => {
    const leitor = aparelho({ org: 'sheep', uid: 'gestor', papel: 'leitura' });
    await em(leitor, () => clienteComSessao('Cliente que não deveria entrar'));
    passo();
    const r = await sync(leitor);
    expect(r.enviados).toBeGreaterThan(0);
    const { rows } = await servidor.execute('SELECT COUNT(*) AS n FROM clientes');
    expect(Number(rows[0].n)).toBe(0);
    expect(await leitor.db.clientes.where('_pendente').equals(1).count()).toBe(0);
  });

  it('configurações só são aceitas com o id da própria organização', async () => {
    const a = aparelho(ORG);
    await em(a, async () => {
      const { garantirConfiguracoes } = await import('./local/repo');
      await garantirConfiguracoes();
      const cfg = (await a.db.configuracoes.get('sheep'))!;
      await a.db.configuracoes.put({ ...cfg, id: 'outra-consultoria', reducao_padrao_pct: 10 });
    });
    passo();
    await sync(a);
    const { rows } = await servidor.execute('SELECT id FROM configuracoes');
    expect(rows.map(r => r.id)).toEqual(['sheep']);
  });
});
