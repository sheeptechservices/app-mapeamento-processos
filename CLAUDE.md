@AGENTS.md

# Sheep Levantamento

Sistema da Sheep Technology para mapear processos dos clientes e demonstrar o ROI da automação (PRD v6):
cliente -> sessões de mapeamento -> áreas e processos. **Página única: o Mapa de processos** (em `/`): pastas de
clientes, dentro as sessões de mapeamento, dentro de cada sessão a tabela de processos. Sem navegação (sem menu
lateral, barra inferior nem abas), a pedido do usuário em 11/11/2026; Ajustes é um painel aberto pela engrenagem do
topo. Não recriar abas, dashboard ou menu sem o usuário pedir.
Desktop-first e mobile-friendly, PWA offline-first.

Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind v4, Radix, motion, Lucide, Dexie, Turso (libsql).
Telas da versão anterior ao PRD v6 estão em `src/_legado/` só como referência (fora do build, do lint e dos testes):
roteiro, validação com o cliente e captura por texto serão reaproveitados nas fases seguintes.

## Arquitetura

- **Uma rota estática.** `src/app/(app)/page.tsx` é o app inteiro; sessão e processo abertos vão na query string
  (`?s=&p=`). Sempre monte endereço por `rotas.mapa()` (`src/lib/rotas.ts`). `PAGINAS_OFFLINE` e `public/sw.js`
  guardam só `/` (`src/lib/offline.test.ts` confere).
- **Casca** (`src/components/casca/`): só o `Topo` (logo da Sheep, sincronização, engrenagem de Ajustes, menu da
  conta) e `CabecalhoPagina`. Ajustes em `components/ajustes/painel-ajustes.tsx` (sub-telas: setores, status,
  frequências, modelos de roteiro, membro da equipe).
- **Mapa** (`src/lib/mapa.ts` monta a árvore, com teste; `components/processos/arvore-mapa.tsx` desenha): pastas
  de cliente abrem com `.revelar`, lembradas no aparelho (`sl_mapa_abertas`). Cada sessão é um cartão (resumo, barra
  das etapas, pasta que entreabre no hover e fica aberta com o quadro) que abre o **quadro da sessão** por cima do
  mapa (`?s=`, `components/processos/pagina-sessao.tsx`, Radix Dialog z-40; painéis de processo z-50 por cima):
  indicadores, gráficos simples (etapas, prioridade, ganho por setor em `graficos-sessao.tsx`), busca e filtros
  próprios, lista de processos (`lista-processos.tsx`, compartilhada com o mapa). Expandir (desktop) anima as margens
  do quadro até as bordas (`.quadro-sessao`/`.expandido`); Esc recolhe e depois fecha. No celular é folha de baixo
  em tela cheia. Abre por push (o voltar do celular fecha o quadro). Com busca ou filtro no mapa, os processos
  achados aparecem sob o cartão e a busca segue para a página da sessão. "Em risco" é filtro.
  Cores das etapas nos gráficos: rampa ordinal `--etapa-1..5` (validada com o validador de paletas).
- **Sobreposição** (`src/components/ui/painel.tsx` + `linhas.tsx`): todo formulário e filtro é um `Painel`
  (lateral 440px / bottom sheet) com `Grupo` e `Linha*`; sub-telas declaradas em `subtelas` (sempre atuais).
  No celular, folha de baixo fecha ao arrastar para baixo (`useArrastarParaFechar` em `ui/arrastar-fechar.ts`;
  com o conteúdo rolado, o gesto rola; `data-sem-arrastar` desliga numa área). Vale no `Painel` e no quadro da sessão.
  Exclusão sempre com `Confirmar` (`ui/confirmar.tsx`, botão vermelho).
- **Local-first** (`src/lib/local/`): `banco.ts` (Dexie `sheep-mapeamento`), `repo.ts` (escritas com carimbo por
  campo, exclusão em cascata de cliente e sessão), `consultas.ts` (leituras reativas), `carteira.ts`
  (`useCarteira`: tudo com o contexto de ROI de cada processo), `gravacao.ts` (`useRascunho`), `sync.ts`.
- **Configurações**: uma linha por organização (`configuracoes`, id = organização), sincronizada como as outras.
  Só nasce no aparelho depois da primeira sincronização (`garantirConfiguracoes`), para nunca criar padrões por
  cima do servidor. `configEfetiva()` dá os padrões enquanto ela não existe.
- **Servidor** (`src/lib/servidor/`): Turso, sessão, login, equipe e `sync.ts`. Sem RLS: **toda consulta filtra
  por `organizacao_id` da sessão**. Papel (admin, consultor, leitura) é lido do banco a cada chamada
  (`papelAtual`); leitura não grava nada na sincronização. O primeiro usuário da organização nasce admin.
- **Sincronização** (`src/lib/sync-protocolo.ts` é o contrato): last write wins por campo; conflito marcado em
  `_conflitos` quando outro aparelho gravou o mesmo campo depois do cursor.
- **ROI** (`src/lib/roi.ts`): custo da hora herdado (processo, cliente, padrão), redução e horizonte das
  Configurações, ganho validado, agregados por área/cliente/carteira (`consolidar`, `agregarPor`). Campo vazio
  é "não informado", nunca zero. Mudou a conta, mudou o teste.
- **Estética v6** (`globals.css`), seguindo a referência visual que o usuário mandou (app monocromático: saudação
  grande com a data em cima, indicadores compactos com divisórias, card escuro de IA com esfera, abas sublinhadas,
  barras pretas, avatares empilhados, barra inferior com botão central preto). Tokens `fundo`, `superficie`,
  `sutil`, `borda`, `tinta`, `tinta-2/3`, selos (`risco`, `analise`, `pendente`, `automatizado` + `-fundo`).
  **Verde Sheep** `--verde` #BEFF01 (o lima do Sheep Indica) é acento de verdade: ganho validado, variação
  positiva, aba ativa, ícone de IA. Para texto sobre fundo claro use `verde-tinta` (o lima puro não tem
  contraste); fundo suave `verde-suave`. Classes: `.card`, `.card-clicavel`, `.card-ia` + `.esfera`, `.barra`
  (`.verde`), `.barra-dupla`, `.titulo-pagina`, `.entra`, `.cascata`, `.troca`. Selos em `ui/selo.tsx`.
- **Logo oficial** em `public/marca/` (copiada do Sheep Indica): `sheep-logo.png` (completa), `sheep-carneiro.png`
  (símbolo), `sheep-carneiro-branco.png` (ícone do app). Use `<LogoSheep>` (`ui/logo.tsx`); a classe
  `.logo-sheep` inverte para branco no tema escuro.
- Schema: `db/schema.sql` + `npm run db:migrar` (idempotente; acrescenta colunas novas por ALTER).
- Login: Google Identity Services + ID token verificado com `node:crypto`; sem Client ID, "Entrar em modo local"
  (só em dev, ou build local com `PERMITIR_MODO_LOCAL=1`; nunca na Vercel).

## Publicação

- GitHub: `sheeptechservices/app-mapeamento-processos` (público), sempre pela conta **guifzaidan** (`gh auth switch -u guifzaidan`).
- Vercel: projeto `app-mapeamento-processos` no escopo pessoal (não no time Dux), produção em
  https://app-mapeamento-processos.vercel.app. Variáveis de produção: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `SESSION_SECRET`, `GOOGLE_ALLOWED_DOMAIN`, `ACESSO_ABERTO=1`. **Acesso aberto** (decisão do usuário em 11/11/2026):
  sem login, quem abre o link entra direto como a equipe (`acessoAberto()` em `servidor/sessao.ts`); fora dos
  buscadores (`robots` noindex). Se um dia configurar `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, o login volta a ser exigido.
  A ligação Git da Vercel ainda não está feita (a Vercel não tem acesso ao repositório da organização); até lá,
  publicar com `npx vercel deploy --prod`. `.vercelignore` impede enviar `.env*` e `local.db`.
- `npm run db:exemplo` cria o cliente fictício "Exemplo - Atacadista Vale do Ivaí" (3 sessões, 100 processos).

## Comandos

- `npm run dev` (preview na porta 3010; o service worker não registra em dev)
- `npm run build && npm start -- -p 3011` para testar PWA/offline (usa `.env.production.local`)
- `npm test` (Vitest: ROI, filtros, formato, repo local, mescla, sincronização ponta a ponta com libsql em
  memória, extração de texto, lista offline)
- `npm run db:migrar`
- `npm run build`

## Padrões obrigatórios

- Nunca emoji nem dingbat em nenhuma superfície. Ícones só de `src/components/icons.tsx` (Lucide encapsulado,
  traço 1.7, `currentColor`). Nenhuma tela importa `lucide-react` direto.
- Nunca travessão longo nem médio em texto, comentário, commit ou prompt de IA. Use ` - `.
- Cores, raios, sombras e tempos só por token da v6 (`globals.css`: `fundo`, `superficie`, `tinta`, `verde`...).
  Nada de hex solto em componente (exceção: o ícone gerado em `lib/icone.tsx`).
- Formulário e filtro: sempre `Painel` + `Grupo`/`Linha*` (`ui/painel.tsx`, `ui/linhas.tsx`). Nada de `<select>`
  nativo, `<input type="date">` cru (use `LinhaData`: calendário da casa em `ui/seletor-data.tsx`, popover no desktop e
  embutido no celular ou em tela baixa) ou `window.confirm` (use `Confirmar`). Escolha por toque:
  `Segmentado` ou sub-tela com `ListaEscolha`. Alvo de toque >= 44px.
  Espaço curto: botão com texto vira só ícone por container query (`@container` no pai, texto com
  `@max-*:sr-only`, `title` no botão); ações de pasta viram menu "..." (`MenuAcoes` em `arvore-mapa.tsx`).
- Criar e editar usam o mesmo formulário (`useFormulario`): editando salva sozinho; criando, salva no botão.
  Criando, passe `chaveRascunho` (ex.: `processo:<sessaoId>`): o que se digita fica num rascunho no aparelho
  (tabela local `meta`) até o Salvar, que chama `concluir()`; reabrir mostra `AvisoRascunho`.
- Opção criada em campo de escolha (setor, segmento, sistema) chama `lembrarOpcao` (vai para a lista da
  organização em Configurações, sincronizada) e a lista da tela soma padrões + Configurações + valores em uso.
  Nenhum dado de negócio fica só em localStorage ou só na tela.
  Excluir sempre pede `Confirmar`, dizendo o que vai junto (cascata).
  Cliente e sessão (cascata) pedem também a senha de exclusão: `Confirmar pedirSenha`; só o hash fica no código
  (`lib/senha-exclusao.ts`, PBKDF2, conferido no aparelho). Nunca gravar a senha em texto em arquivo nenhum.
- Linha ou card inteiro clicável = link esticado (o título é o botão com `after:absolute after:inset-0`); ações por cima
  com `relative z-10`. Nunca `onClick` em `<li>`/`<div>`.
- Nada aparece de estalo: `.entra` (peça que nasce), `.troca` (mesma área muda), `.revelar` (bloco que empurra o
  resto), `.cascata` + `key` do resultado (lista filtrada), `Painel` e `Confirmar` (saída animada).
  Listas que ganham e perdem itens: `ItemVivo` (`ui/vivo.tsx`, altura anima, dentro de `AnimatePresence
  initial={false}`; espaço entre itens é padding do item). Item que mudou acende com `Pulso` (pai `relative isolate`).
  Número que muda corre com `NumeroAnimado` (`deZero` só nos indicadores do topo). Toque: `.aperta` ou
  `active:scale-*`. Ícone se mexe no hover/foco do botão em volta: o movimento vem de `icons.tsx` (3º argumento
  de `traco`, regras `.mov-*` em globals.css); ícone novo ganha um movimento lá. Pasta de cliente com `.brilho` (luz que segue o ponteiro). Sincronizado: `.ponto-vivo`.
  Tudo com `prefers-reduced-motion` respeitado.
- Espera é spinner (`.spinner`), nunca texto de "Carregando".
- React 19 + lint: nada de `setState` síncrono dentro de `useEffect`; ajuste no render ou `useSyncExternalStore`.
- Papel "leitura": telas escondem incluir/editar/excluir (`usuario.papel`); o servidor recusa as escritas.
- Interface em pt-BR; conteúdo de exemplo realista (ver `src/lib/local/exemplo.ts`), nunca lorem ipsum.

## Fases (PRD v6)

1. Fundação - feita: tokens v6, casca responsiva das 4 abas, painel sobreposto, modelo cliente/sessão,
   configurações, papéis, ROI com herança e agregados, Ajustes.
2. Clientes e sessões - feita: CRUD de clientes com logo (`lib/logo.ts`, 256px em data URL), ficha da empresa (razão social, CNAE, porte,
   abertura, endereço, canais, sócios e observações da pesquisa) e de sessões
   (`components/processos/painel-sessao.tsx`), tudo pelas pastas do mapa.
3. Processos - feita: tabela de processos por sessão, busca, filtros (`lib/filtros.ts`, com testes) com contador
   e etiquetas, formulário completo com cálculo ao vivo (`components/processos/painel-processo.tsx`).
4. Relatório da sessão (aberto pela pasta da sessão, em painel): ganho por área, top 3 gargalos, validação com o
   cliente, exportações .xlsx/PDF/WhatsApp. Sem dashboard.
   A "Captura com IA" saiu da tela até existir de verdade (volta na fase 5 como ação da pasta da sessão).
5. IA: retomar `src/lib/ia/esquemas.ts` (extração com `claude-haiku-5-5`, análise e relatório com
   `claude-opus-5-5` + `fallbacks: 'default'`), voz com ElevenLabs `scribe_v2`, análise da carteira.
6. Offline e PWA: já funciona; revalidar com as rotas novas.

Testar no painel do navegador exige o painel visível: oculto, o requestAnimationFrame para e o React não revela
o conteúdo em streaming (a página parece presa no spinner).
