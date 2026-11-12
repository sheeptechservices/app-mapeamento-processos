-- Schema do Sheep Levantamento no Turso (libsql / SQLite), modelo do PRD v6:
-- organização -> clientes -> sessões de mapeamento -> áreas e processos.
--
-- O Turso não tem Row Level Security: o isolamento por organização é feito nas
-- rotas de servidor, que sempre filtram e gravam com a `organizacao_id` da sessão.
-- Por isso toda tabela de dado carrega `organizacao_id`.
--
-- Colunas de controle em toda tabela sincronizada:
--   campos_ts       JSON com o carimbo (ms, relógio do aparelho) da última escrita de cada campo
--   campos_sync     JSON com o momento (relógio do servidor) em que cada campo foi gravado aqui;
--                   é o que diz se outro aparelho mexeu no mesmo campo desde a última sincronização
--   sincronizado_em cursor da sincronização: o aparelho puxa o que tiver valor maior que o seu
--   atualizado_em   carimbo da última escrita em qualquer campo
--   excluido        exclusão lógica, para a exclusão também sincronizar
-- Listas e objetos ficam em JSON.

CREATE TABLE IF NOT EXISTS organizacoes (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id             TEXT PRIMARY KEY,
  organizacao_id TEXT NOT NULL REFERENCES organizacoes(id),
  email          TEXT NOT NULL UNIQUE,
  nome           TEXT NOT NULL,
  foto           TEXT,
  papel          TEXT NOT NULL DEFAULT 'consultor' CHECK (papel IN ('admin', 'consultor', 'leitura')),
  ativo          INTEGER NOT NULL DEFAULT 1,
  criado_em      INTEGER NOT NULL,
  ultimo_acesso  INTEGER
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id                 TEXT PRIMARY KEY, -- = organizacao_id
  organizacao_id     TEXT NOT NULL REFERENCES organizacoes(id),
  criado_por         TEXT NOT NULL,
  custo_hora_padrao  REAL,
  reducao_padrao_pct REAL NOT NULL DEFAULT 60,
  horizonte_meses    INTEGER NOT NULL DEFAULT 12,
  setores            TEXT NOT NULL DEFAULT '[]',
  segmentos          TEXT NOT NULL DEFAULT '[]',
  sistemas           TEXT NOT NULL DEFAULT '[]',
  rotulos_status     TEXT NOT NULL DEFAULT '{}',
  rotulos_frequencia TEXT NOT NULL DEFAULT '{}',
  modelos_roteiro    TEXT NOT NULL DEFAULT '[]',
  ia                 TEXT NOT NULL DEFAULT '{}',
  criado_em          INTEGER NOT NULL,
  atualizado_em      INTEGER NOT NULL,
  excluido           INTEGER NOT NULL DEFAULT 0,
  campos_ts          TEXT NOT NULL DEFAULT '{}',
  campos_sync        TEXT NOT NULL DEFAULT '{}',
  sincronizado_em    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clientes (
  id                 TEXT PRIMARY KEY,
  organizacao_id     TEXT NOT NULL REFERENCES organizacoes(id),
  criado_por         TEXT NOT NULL,
  nome               TEXT NOT NULL,
  cnpj               TEXT,
  segmento           TEXT,
  cidade             TEXT,
  contato_nome       TEXT,
  contato_email      TEXT,
  contato_telefone   TEXT,
  logo               TEXT, -- data URL de até 256px, reduzida no aparelho
  custo_hora         REAL,
  funcionarios       INTEGER,
  faturamento_mensal REAL,
  estagio            TEXT NOT NULL DEFAULT 'mapeando',
  razao_social       TEXT,
  atividade          TEXT,
  porte              TEXT,
  abertura           TEXT,
  endereco           TEXT,
  telefone           TEXT,
  email              TEXT,
  site               TEXT,
  instagram          TEXT,
  socios             TEXT,
  observacoes        TEXT,
  contexto_especifico TEXT,
  criado_em          INTEGER NOT NULL,
  atualizado_em      INTEGER NOT NULL,
  excluido           INTEGER NOT NULL DEFAULT 0,
  campos_ts          TEXT NOT NULL DEFAULT '{}',
  campos_sync        TEXT NOT NULL DEFAULT '{}',
  sincronizado_em    INTEGER NOT NULL DEFAULT 0
);

-- Glossário do cliente: termos do vocabulário da empresa e o que cada um quer dizer.
CREATE TABLE IF NOT EXISTS glossario (
  id              TEXT PRIMARY KEY,
  organizacao_id  TEXT NOT NULL,
  criado_por      TEXT NOT NULL,
  cliente_id      TEXT NOT NULL REFERENCES clientes(id),
  termo           TEXT NOT NULL DEFAULT '',
  definicao       TEXT,
  criado_em       INTEGER NOT NULL,
  atualizado_em   INTEGER NOT NULL,
  excluido        INTEGER NOT NULL DEFAULT 0,
  campos_ts       TEXT NOT NULL DEFAULT '{}',
  campos_sync     TEXT NOT NULL DEFAULT '{}',
  sincronizado_em INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_glossario_cliente ON glossario (cliente_id);
CREATE INDEX IF NOT EXISTS idx_glossario_sync ON glossario (organizacao_id, sincronizado_em);

CREATE TABLE IF NOT EXISTS sessoes (
  id                     TEXT PRIMARY KEY,
  organizacao_id         TEXT NOT NULL REFERENCES organizacoes(id),
  criado_por             TEXT NOT NULL,
  cliente_id             TEXT NOT NULL REFERENCES clientes(id),
  data                   TEXT NOT NULL,
  titulo                 TEXT,
  participantes          TEXT NOT NULL DEFAULT '[]',
  status                 TEXT NOT NULL DEFAULT 'em_andamento',
  validado_em            INTEGER,
  consentimento_gravacao INTEGER NOT NULL DEFAULT 0,
  observacoes            TEXT,
  visita_inicio          INTEGER,
  visita_acumulado_ms    INTEGER NOT NULL DEFAULT 0,
  criado_em              INTEGER NOT NULL,
  atualizado_em          INTEGER NOT NULL,
  excluido               INTEGER NOT NULL DEFAULT 0,
  campos_ts              TEXT NOT NULL DEFAULT '{}',
  campos_sync            TEXT NOT NULL DEFAULT '{}',
  sincronizado_em        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessoes_cliente ON sessoes (cliente_id);

CREATE TABLE IF NOT EXISTS areas (
  id              TEXT PRIMARY KEY,
  organizacao_id  TEXT NOT NULL,
  criado_por      TEXT NOT NULL,
  sessao_id       TEXT NOT NULL REFERENCES sessoes(id),
  nome            TEXT NOT NULL,
  responsavel     TEXT,
  pessoas         INTEGER,
  entrega         TEXT,
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_em       INTEGER NOT NULL,
  atualizado_em   INTEGER NOT NULL,
  excluido        INTEGER NOT NULL DEFAULT 0,
  campos_ts       TEXT NOT NULL DEFAULT '{}',
  campos_sync     TEXT NOT NULL DEFAULT '{}',
  sincronizado_em INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_areas_sessao ON areas (sessao_id);

CREATE TABLE IF NOT EXISTS processos (
  id                  TEXT PRIMARY KEY,
  organizacao_id      TEXT NOT NULL,
  criado_por          TEXT NOT NULL,
  sessao_id           TEXT NOT NULL REFERENCES sessoes(id),
  cliente_id          TEXT NOT NULL,
  area_id             TEXT,
  codigo              TEXT NOT NULL,
  titulo              TEXT NOT NULL DEFAULT '',
  ponto_focal         TEXT,
  status              TEXT NOT NULL DEFAULT 'pendente',
  descricao           TEXT,
  gatilho             TEXT,
  fim                 TEXT,
  frequencia          TEXT,
  sistemas            TEXT NOT NULL DEFAULT '[]',
  pessoas_envolvidas  INTEGER,
  vezes_mes           REAL,
  tempo_medio_min     REAL,
  custo_hora_override REAL,
  perda_mes           REAL,
  reducao_pct         REAL,
  origem_numero       TEXT CHECK (origem_numero IS NULL OR origem_numero IN ('cliente', 'medido', 'estimativa')),
  nivel_automacao     TEXT,
  documentado         TEXT,
  gargalos            TEXT,
  pontos_atencao      TEXT,
  ganho_esperado      TEXT,
  observacoes         TEXT,
  eisenhower          INTEGER,
  em_risco            INTEGER NOT NULL DEFAULT 0,
  ganho_validado_pct  REAL,
  responsaveis        TEXT NOT NULL DEFAULT '[]',
  criado_em           INTEGER NOT NULL,
  atualizado_em       INTEGER NOT NULL,
  excluido            INTEGER NOT NULL DEFAULT 0,
  campos_ts           TEXT NOT NULL DEFAULT '{}',
  campos_sync         TEXT NOT NULL DEFAULT '{}',
  sincronizado_em     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_proc_sessao ON processos (sessao_id);
CREATE INDEX IF NOT EXISTS idx_proc_cliente ON processos (cliente_id);

CREATE TABLE IF NOT EXISTS roteiro_blocos (
  id                TEXT PRIMARY KEY,
  organizacao_id    TEXT NOT NULL,
  criado_por        TEXT NOT NULL,
  sessao_id         TEXT NOT NULL REFERENCES sessoes(id),
  titulo            TEXT NOT NULL,
  ordem             INTEGER NOT NULL DEFAULT 0,
  minutos_previstos INTEGER,
  anotacoes         TEXT,
  criado_em         INTEGER NOT NULL,
  atualizado_em     INTEGER NOT NULL,
  excluido          INTEGER NOT NULL DEFAULT 0,
  campos_ts         TEXT NOT NULL DEFAULT '{}',
  campos_sync       TEXT NOT NULL DEFAULT '{}',
  sincronizado_em   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS roteiro_perguntas (
  id              TEXT PRIMARY KEY,
  organizacao_id  TEXT NOT NULL,
  criado_por      TEXT NOT NULL,
  sessao_id       TEXT NOT NULL REFERENCES sessoes(id),
  bloco_id        TEXT NOT NULL REFERENCES roteiro_blocos(id),
  texto           TEXT NOT NULL,
  essencial       INTEGER NOT NULL DEFAULT 0,
  feita           INTEGER NOT NULL DEFAULT 0,
  anotacao        TEXT,
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_em       INTEGER NOT NULL,
  atualizado_em   INTEGER NOT NULL,
  excluido        INTEGER NOT NULL DEFAULT 0,
  campos_ts       TEXT NOT NULL DEFAULT '{}',
  campos_sync     TEXT NOT NULL DEFAULT '{}',
  sincronizado_em INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capturas (
  id                 TEXT PRIMARY KEY,
  organizacao_id     TEXT NOT NULL,
  criado_por         TEXT NOT NULL,
  sessao_id          TEXT NOT NULL REFERENCES sessoes(id),
  tipo               TEXT NOT NULL CHECK (tipo IN ('texto', 'audio')),
  conteudo           TEXT,
  processo_gerado_id TEXT,
  status             TEXT NOT NULL DEFAULT 'pendente',
  criado_em          INTEGER NOT NULL,
  atualizado_em      INTEGER NOT NULL,
  excluido           INTEGER NOT NULL DEFAULT 0,
  campos_ts          TEXT NOT NULL DEFAULT '{}',
  campos_sync        TEXT NOT NULL DEFAULT '{}',
  sincronizado_em    INTEGER NOT NULL DEFAULT 0
);

-- IA: análises da sessão e da carteira, e o log das chamadas (custo, latência, erro; nunca conteúdo).
CREATE TABLE IF NOT EXISTS ia_analises (
  id             TEXT PRIMARY KEY,
  organizacao_id TEXT NOT NULL,
  escopo         TEXT NOT NULL CHECK (escopo IN ('sessao', 'carteira')),
  ref_id         TEXT NOT NULL,
  tipo           TEXT NOT NULL,
  payload_json   TEXT NOT NULL,
  modelo         TEXT NOT NULL,
  hash_entrada   TEXT,
  criado_em      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ia_ref ON ia_analises (organizacao_id, escopo, ref_id, tipo, criado_em);

CREATE TABLE IF NOT EXISTS ia_chamadas (
  id             TEXT PRIMARY KEY,
  organizacao_id TEXT NOT NULL,
  ref_id         TEXT,
  usuario_id     TEXT,
  funcao         TEXT NOT NULL,
  modelo         TEXT NOT NULL,
  tokens_entrada INTEGER,
  tokens_saida   INTEGER,
  latencia_ms    INTEGER,
  erro           TEXT,
  criado_em      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ia_chamadas ON ia_chamadas (organizacao_id, ref_id, funcao, criado_em);

-- Cursor da sincronização: cada aparelho puxa por organização e sincronizado_em.
CREATE INDEX IF NOT EXISTS idx_cfg_sync ON configuracoes (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_cli_sync ON clientes (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_ses_sync ON sessoes (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_areas_sync ON areas (organizacao_id, sincronizado_em);
-- Anexos do processo: foto (data URL reduzida no aparelho), link ou arquivo (conteúdo em anexos_partes),
-- com descrição breve. Sem CHECK no tipo: tipo novo não exige recriar a tabela.
CREATE TABLE IF NOT EXISTS anexos (
  id              TEXT PRIMARY KEY,
  organizacao_id  TEXT NOT NULL,
  criado_por      TEXT NOT NULL,
  processo_id     TEXT NOT NULL REFERENCES processos(id),
  sessao_id       TEXT NOT NULL,
  cliente_id      TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'foto',
  url             TEXT,
  imagem          TEXT,
  descricao       TEXT,
  ordem           INTEGER NOT NULL DEFAULT 0,
  nome            TEXT,
  mime            TEXT,
  tamanho         INTEGER,
  partes          INTEGER,
  criado_em       INTEGER NOT NULL,
  atualizado_em   INTEGER NOT NULL,
  excluido        INTEGER NOT NULL DEFAULT 0,
  campos_ts       TEXT NOT NULL DEFAULT '{}',
  campos_sync     TEXT NOT NULL DEFAULT '{}',
  sincronizado_em INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_anexos_processo ON anexos (processo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_sync ON anexos (organizacao_id, sincronizado_em);

-- Partes (base64) do conteúdo de um anexo do tipo arquivo.
CREATE TABLE IF NOT EXISTS anexos_partes (
  id              TEXT PRIMARY KEY,
  organizacao_id  TEXT NOT NULL,
  criado_por      TEXT NOT NULL,
  anexo_id        TEXT NOT NULL REFERENCES anexos(id),
  processo_id     TEXT NOT NULL,
  sessao_id       TEXT NOT NULL,
  cliente_id      TEXT NOT NULL,
  ordem           INTEGER NOT NULL DEFAULT 0,
  dados           TEXT,
  criado_em       INTEGER NOT NULL,
  atualizado_em   INTEGER NOT NULL,
  excluido        INTEGER NOT NULL DEFAULT 0,
  campos_ts       TEXT NOT NULL DEFAULT '{}',
  campos_sync     TEXT NOT NULL DEFAULT '{}',
  sincronizado_em INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_partes_anexo ON anexos_partes (anexo_id);
CREATE INDEX IF NOT EXISTS idx_partes_sync ON anexos_partes (organizacao_id, sincronizado_em);

CREATE INDEX IF NOT EXISTS idx_proc_sync ON processos (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_blocos_sync ON roteiro_blocos (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_perg_sync ON roteiro_perguntas (organizacao_id, sincronizado_em);
CREATE INDEX IF NOT EXISTS idx_capt_sync ON capturas (organizacao_id, sincronizado_em);
