// Banco local do aparelho (IndexedDB via Dexie). É a fonte que a tela lê: o
// registro nunca depende de conexão. A sincronização com o Turso (sync.ts)
// trabalha em cima dos campos `_ts` e `_pendente` de cada registro.
//
// Banco novo para o modelo do PRD v6 (cliente -> sessão -> processo). O banco da
// versão anterior ('sheep-levantamento') é apagado na primeira abertura: ele só
// tinha dado de teste e o servidor também foi recriado.
import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  Area,
  Captura,
  Cliente,
  Configuracoes,
  Processo,
  Registro,
  RoteiroBloco,
  RoteiroPergunta,
  Sessao,
} from '@/lib/dominio';
import { TABELAS, type TabelaSyncNome } from '@/lib/sync-protocolo';

export interface Meta {
  chave: string;
  valor: unknown;
}

export const TABELAS_SYNC = TABELAS;
export type TabelaSync = TabelaSyncNome;

export class BancoLocal extends Dexie {
  configuracoes!: EntityTable<Configuracoes, 'id'>;
  clientes!: EntityTable<Cliente, 'id'>;
  sessoes!: EntityTable<Sessao, 'id'>;
  areas!: EntityTable<Area, 'id'>;
  processos!: EntityTable<Processo, 'id'>;
  roteiro_blocos!: EntityTable<RoteiroBloco, 'id'>;
  roteiro_perguntas!: EntityTable<RoteiroPergunta, 'id'>;
  capturas!: EntityTable<Captura, 'id'>;
  meta!: Table<Meta, string>;

  constructor(nome = 'sheep-mapeamento') {
    super(nome);
    this.version(1).stores({
      configuracoes: 'id, _pendente',
      clientes: 'id, atualizado_em, _pendente',
      sessoes: 'id, cliente_id, data, _pendente',
      areas: 'id, sessao_id, _pendente',
      processos: 'id, sessao_id, cliente_id, area_id, atualizado_em, _pendente',
      roteiro_blocos: 'id, sessao_id, _pendente',
      roteiro_perguntas: 'id, sessao_id, bloco_id, _pendente',
      capturas: 'id, sessao_id, _pendente',
      meta: 'chave',
    });
  }

  tabela(nome: TabelaSync) {
    return this.table(nome) as Table<Registro & Record<string, unknown>, string>;
  }
}

let instancia: BancoLocal | null = null;

export function banco(): BancoLocal {
  if (!instancia) {
    instancia = new BancoLocal();
    if (typeof indexedDB !== 'undefined') void Dexie.delete('sheep-levantamento').catch(() => {});
  }
  return instancia;
}

/** Apaga tudo o que está no aparelho (saída da conta). */
export async function apagarBancoLocal() {
  const b = banco();
  b.close();
  await b.delete();
  instancia = null;
}

/** Só para testes: troca o banco por um isolado. */
export function usarBanco(b: BancoLocal) {
  instancia = b;
}
