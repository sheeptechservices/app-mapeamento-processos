'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { CabecalhoPagina } from '@/components/casca/casca';
import { PainelCliente } from '@/components/clientes/painel-cliente';
import { IconAdicionar, IconBusca, IconClientes, IconFechar, IconFiltros } from '@/components/icons';
import { ArvoreMapa, type AcoesMapa } from '@/components/processos/arvore-mapa';
import { PaginaSessao } from '@/components/processos/pagina-sessao';
import { ORIGENS_FILTRO, PainelFiltros } from '@/components/processos/painel-filtros';
import { PainelProcesso } from '@/components/processos/painel-processo';
import { PainelSessao } from '@/components/processos/painel-sessao';
import { useSessao } from '@/components/sessao';
import { estiloBotao } from '@/components/ui/botao';
import { Confirmar } from '@/components/ui/confirmar';
import { Indicador, LinhaIndicadores } from '@/components/ui/indicadores';
import { NumeroAnimado } from '@/components/ui/numero-animado';
import { PRIORIDADES, rotuloDe, rotuloStatus, type Processo, type Sessao } from '@/lib/dominio';
import {
  casaBusca,
  contarFiltros,
  etiquetasAtivas,
  FILTROS_VAZIOS,
  filtrando,
  filtrarProcessos,
  semAcento,
  type FiltrosProcesso,
} from '@/lib/filtros';
import { horas, numero, percentual } from '@/lib/formato';
import { useCarteira } from '@/lib/local/carteira';
import { comIndicador } from '@/lib/local/gravacao';
import { excluir, excluirCliente } from '@/lib/local/repo';
import { montarMapa } from '@/lib/mapa';
import { rotas } from '@/lib/rotas';
import { cn } from '@/lib/cn';

const CHAVE_ABERTAS = 'sl_mapa_abertas';

function lerAbertas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ABERTAS) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * A página única do sistema: o Mapa de processos. Pastas de clientes; dentro,
 * as sessões de mapeamento; dentro de cada sessão, a tabela de processos.
 * Tudo se cria, edita e exclui daqui, pelos painéis.
 */
export default function MapaDeProcessos() {
  const router = useRouter();
  const params = useSearchParams();
  const { usuario } = useSessao();
  const carteira = useCarteira();
  const podeEditar = usuario?.papel !== 'leitura';

  const [filtros, setFiltros] = useState<FiltrosProcesso>(FILTROS_VAZIOS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // Pastas de cliente abertas: lembradas no aparelho; o cliente da sessão da URL chega aberto.
  const [abertas, setAbertas] = useState<Set<string> | null>(null);
  const [cliente, setCliente] = useState<{ aberto: boolean; id: string | null }>({ aberto: false, id: null });
  const [sessao, setSessao] = useState<{ aberto: boolean; sessao: Sessao | null; clienteId: string | null }>({
    aberto: false,
    sessao: null,
    clienteId: null,
  });
  const [novoProcesso, setNovoProcesso] = useState<{ aberto: boolean; sessao: Sessao | null }>({ aberto: false, sessao: null });
  const [excluirProc, setExcluirProc] = useState<Processo | null>(null);
  const [excluirCli, setExcluirCli] = useState<string | null>(null);

  const sessaoAtiva = params.get('s');
  const processoAberto = params.get('p') ? (carteira?.processos.find(p => p.id === params.get('p')) ?? null) : null;

  // Primeira vez com a carteira carregada: abre o que estava aberto e a sessão da URL.
  if (abertas === null && carteira) {
    const inicial = new Set(lerAbertas());
    const s = sessaoAtiva ? carteira.sessaoPorId.get(sessaoAtiva) : null;
    if (s) {
      inicial.add(s.cliente_id);
    } else if (!inicial.size && carteira.sessoes[0]) {
      // Primeira visita: abre o cliente da sessão mais recente para o mapa não começar fechado.
      inicial.add(carteira.sessoes[0].cliente_id);
    }
    setAbertas(inicial);
  }

  const alternar = (id: string) =>
    setAbertas(atual => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      try {
        localStorage.setItem(CHAVE_ABERTAS, JSON.stringify([...nova]));
      } catch {
        /* sem armazenamento: vale nesta visita */
      }
      return nova;
    });

  const setorDe = (p: Processo) => (p.area_id ? (carteira?.areaPorId.get(p.area_id)?.nome ?? null) : null);

  const { mapa, visiveis } = useMemo(() => {
    if (!carteira) return { mapa: [], visiveis: [] as Processo[] };
    const info = { setor: setorDe, ganhoMes: (p: Processo) => carteira.roiDe(p).ganho_mes };
    const termo = semAcento(filtros.busca.trim());
    // A busca acha processo (nome, ID, gargalo), cliente (nome) e sessão (título).
    const clientesAchados = new Set(termo ? carteira.clientes.filter(c => semAcento(c.nome).includes(termo)).map(c => c.id) : []);
    const sessoesAchadas = new Set(termo ? carteira.sessoes.filter(s => semAcento(s.titulo ?? '').includes(termo)).map(s => s.id) : []);
    const porFiltro = filtrarProcessos(carteira.processos, { ...filtros, busca: '' }, 'todos', info);
    const lista = termo
      ? porFiltro.filter(p => casaBusca(p, filtros.busca) || clientesAchados.has(p.cliente_id) || sessoesAchadas.has(p.sessao_id))
      : porFiltro;
    return {
      visiveis: lista,
      mapa: montarMapa(
        carteira.clientes,
        carteira.sessoes,
        lista,
        filtrando(filtros),
        contarFiltros(filtros) ? new Set() : clientesAchados,
      ),
    };
    // setorDe depende só de carteira.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carteira, filtros]);

  // Com busca ou filtro, todo cliente com resultado aparece aberto.
  const abertasEfetivas = filtrando(filtros) ? new Set(mapa.map(c => c.cliente.id)) : (abertas ?? new Set<string>());

  // Quadro da sessão (?s=) por cima do mapa: abre por push, para o voltar do
  // celular e do navegador fechar o quadro. A última sessão aberta fica guardada
  // para o quadro ter o que mostrar enquanto anima a saída.
  const sessaoAberta = sessaoAtiva && carteira ? (carteira.sessaoPorId.get(sessaoAtiva) ?? null) : null;
  const [sessaoNoQuadro, setSessaoNoQuadro] = useState<Sessao | null>(null);
  if (sessaoAberta && sessaoAberta !== sessaoNoQuadro) setSessaoNoQuadro(sessaoAberta);
  const retorno = useRef({ porPush: false });
  const [filtrosDaSessao, setFiltrosDaSessao] = useState<FiltrosProcesso | undefined>(undefined);
  const abrirSessao = (s: Sessao) => {
    retorno.current = { porPush: true };
    // Quem chegou buscando no mapa abre a sessão com a mesma busca e filtros.
    setFiltrosDaSessao(filtrando(filtros) ? filtros : undefined);
    router.push(rotas.mapa({ sessao: s.id }), { scroll: false });
  };
  const voltarAoMapa = () => {
    if (retorno.current.porPush) {
      retorno.current.porPush = false;
      router.back();
    } else router.replace(rotas.mapa({}), { scroll: false });
  };

  const irPara = (o: { sessao?: string | null; processo?: string | null }) =>
    router.replace(rotas.mapa({ sessao: o.sessao === undefined ? sessaoAtiva : o.sessao, processo: o.processo }), { scroll: false });

  const acoes: AcoesMapa = {
    editarCliente: id => setCliente({ aberto: true, id }),
    excluirCliente: id => setExcluirCli(id),
    novaSessao: clienteId => setSessao({ aberto: true, sessao: null, clienteId }),
    editarSessao: s => setSessao({ aberto: true, sessao: s, clienteId: s.cliente_id }),
    abrirSessao,
    novoProcesso: s => setNovoProcesso({ aberto: true, sessao: s }),
    // No mapa abre só o painel; na página da sessão, o painel por cima dela.
    abrirProcesso: p => irPara({ processo: p.id }),
    excluirProcesso: p => setExcluirProc(p),
  };

  const ativos = contarFiltros(filtros);
  const etiquetas = etiquetasAtivas(filtros, {
    status: s => rotuloStatus(s, carteira?.config),
    prioridade: e => rotuloDe(PRIORIDADES, e),
    origem: o => ORIGENS_FILTRO.find(x => x.valor === o)?.rotulo ?? o,
  });
  const clienteEditado = cliente.id ? (carteira?.clientePorId.get(cliente.id) ?? null) : null;
  const clienteExcluir = excluirCli ? carteira?.clientePorId.get(excluirCli) : null;
  const sessaoDoProcesso = processoAberto ? carteira?.sessaoPorId.get(processoAberto.sessao_id) : null;

  const botaoNovoCliente = podeEditar && (
    // Espaço curto (cabeçalho com menos de 32rem): só o ícone; o texto fica para o leitor de tela.
    <button
      type="button"
      title="Novo cliente"
      onClick={() => setCliente({ aberto: true, id: null })}
      className={cn(estiloBotao({ variante: 'primario' }), '@max-lg:w-[var(--toque)] @max-lg:px-0')}
    >
      <IconAdicionar size={18} />
      <span className="@max-lg:sr-only">Novo cliente</span>
    </button>
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Mapa de processos"
        contagem={carteira?.processos.length}
        acao={carteira?.clientes.length ? botaoNovoCliente : undefined}
      />

      {carteira && sessaoNoQuadro && (
        <PaginaSessao
          key={sessaoNoQuadro.id}
          aberto={!!sessaoAberta}
          sessao={sessaoAberta ?? sessaoNoQuadro}
          carteira={carteira}
          podeEditar={podeEditar}
          filtrosIniciais={filtrosDaSessao}
          aoVoltar={voltarAoMapa}
          acoes={acoes}
        />
      )}

      {carteira === undefined ? (
        <div className="spinner-linha">
          <span className="spinner" />
        </div>
      ) : carteira.clientes.length === 0 ? (
        <section className="card entra px-6 py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-pilula bg-sutil text-tinta-2">
            <IconClientes />
          </span>
          <p className="titulo-secao mt-4">O mapa ainda está vazio</p>
          <p className="mt-1.5 text-sm text-tinta-2">Cadastre o primeiro cliente para começar.</p>
          {podeEditar && <div className="mt-6 flex justify-center">{botaoNovoCliente}</div>}
        </section>
      ) : (
        <div className="cascata space-y-5">
          <LinhaIndicadores>
            <Indicador
              destaque
              rotulo={carteira.clientes.length === 1 ? 'cliente' : 'clientes'}
              valor={<NumeroAnimado deZero valor={carteira.clientes.length} formatar={n => numero(Math.round(n))} />}
              detalhe={`${carteira.sessoes.length} ${carteira.sessoes.length === 1 ? 'sessão' : 'sessões'} de mapeamento`}
            />
            <Indicador
              rotulo="processos"
              valor={<NumeroAnimado deZero valor={carteira.roi.processos} formatar={n => numero(Math.round(n))} />}
              detalhe={
                carteira.roi.processos
                  ? `${percentual(carteira.roi.completos / carteira.roi.processos)} com números completos`
                  : 'nenhum mapeado ainda'
              }
            />
            <Indicador
              rotulo="horas por mês"
              valor={<NumeroAnimado deZero valor={carteira.roi.horas_mes} formatar={horas} />}
              detalhe="tempo gasto hoje nos processos mapeados"
            />
          </LinhaIndicadores>

          {/* Busca e filtros */}
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <IconBusca size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-tinta-3" />
              <input
                className="campo !rounded-pilula !pl-11"
                placeholder="Buscar cliente, sessão, processo, ID ou gargalo"
                value={filtros.busca}
                onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
                aria-label="Buscar no mapa"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltrosAbertos(true)}
              className={cn(
                'foco inline-flex min-h-[var(--toque)] shrink-0 items-center gap-2 rounded-pilula border px-4 text-[14px] font-semibold transition-colors',
                ativos ? 'border-tinta bg-tinta text-sobre-tinta' : 'border-borda bg-superficie hover:bg-sutil',
              )}
            >
              <IconFiltros size={18} />
              <span className="max-tablet:sr-only">Filtros</span>
              {ativos > 0 && (
                <span className="numeros grid h-5 min-w-5 place-items-center rounded-pilula bg-verde px-1 text-[11px] text-sobre-verde">
                  {ativos}
                </span>
              )}
            </button>
          </div>

          {etiquetas.length > 0 && (
            <div key={etiquetas.map(e => e.chave).join()} className="cascata flex flex-wrap items-center gap-2">
              {etiquetas.map(e => (
                <button
                  key={e.chave}
                  type="button"
                  onClick={() => setFiltros(f => e.remover(f))}
                  aria-label={`Remover filtro ${e.rotulo}`}
                  className="foco inline-flex h-8 items-center gap-1.5 rounded-pilula bg-sutil pr-2.5 pl-3 text-[13px] font-medium transition-colors hover:bg-borda"
                >
                  {e.rotulo} <IconFechar size={14} className="text-tinta-2" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFiltros(f => ({ ...FILTROS_VAZIOS, busca: f.busca, ordem: f.ordem }))}
                className="foco h-8 rounded-pilula px-2 text-[13px] font-semibold text-tinta-2 underline-offset-2 hover:text-tinta hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {mapa.length ? (
            <ArvoreMapa
              mapa={mapa}
              abertas={abertasEfetivas}
              alternar={alternar}
              filtrando={filtrando(filtros)}
              sessaoAtiva={sessaoAberta?.id ?? null}
              carteira={carteira}
              podeEditar={podeEditar}
              acoes={acoes}
            />
          ) : (
            <section className="rounded-[var(--raio-card)] border border-dashed border-borda-forte px-6 py-10 text-center">
              <p className="font-semibold">Nada encontrado com essa busca ou filtro</p>
              <button
                type="button"
                onClick={() => setFiltros(FILTROS_VAZIOS)}
                className="foco mt-3 text-[13px] font-semibold text-tinta-2 underline-offset-2 hover:text-tinta hover:underline"
              >
                Limpar busca e filtros
              </button>
            </section>
          )}
        </div>
      )}

      {/* Painéis */}
      <PainelCliente
        aberto={cliente.aberto}
        aoFechar={() => setCliente(c => ({ ...c, aberto: false }))}
        cliente={clienteEditado}
        podeEditar={podeEditar}
        aoCriar={c => {
          // Cliente novo já aparece com a pasta aberta.
          setAbertas(a => new Set(a).add(c.id));
          setCliente({ aberto: false, id: null });
        }}
      />
      <PainelSessao
        aberto={sessao.aberto}
        aoFechar={() => setSessao(s => ({ ...s, aberto: false }))}
        sessao={sessao.sessao}
        clienteInicial={sessao.clienteId}
        aoCriar={s => {
          setAbertas(a => new Set(a).add(s.cliente_id));
          abrirSessao(s);
        }}
        aoExcluir={() => router.replace(rotas.mapa({}), { scroll: false })}
      />
      {novoProcesso.sessao && (
        <PainelProcesso
          aberto={novoProcesso.aberto}
          aoFechar={() => setNovoProcesso(n => ({ ...n, aberto: false }))}
          processo={null}
          sessao={novoProcesso.sessao}
        />
      )}
      {sessaoDoProcesso && (
        <PainelProcesso
          aberto={!!processoAberto}
          aoFechar={() => irPara({ processo: null })}
          processo={processoAberto}
          sessao={sessaoDoProcesso}
          podeEditar={podeEditar}
        />
      )}
      {carteira && (
        <PainelFiltros
          aberto={filtrosAbertos}
          aoFechar={() => setFiltrosAbertos(false)}
          filtros={filtros}
          aoMudar={setFiltros}
          processos={carteira.processos}
          setorDe={setorDe}
          previa={visiveis.length}
          cfg={carteira.config}
        />
      )}

      <Confirmar
        aberto={!!excluirProc}
        aoFechar={() => setExcluirProc(null)}
        titulo={`Excluir ${excluirProc?.codigo}?`}
        texto={`"${excluirProc?.titulo || 'Sem título'}" sai do mapa e do ROI, em todos os aparelhos. O código não é reaproveitado.`}
        rotuloConfirmar="Excluir processo"
        aoConfirmar={() => excluirProc && comIndicador(() => excluir('processos', excluirProc.id))}
      />
      <Confirmar
        aberto={!!clienteExcluir}
        aoFechar={() => setExcluirCli(null)}
        titulo={`Excluir ${clienteExcluir?.nome}?`}
        texto={(() => {
          if (!clienteExcluir || !carteira) return '';
          const s = carteira.sessoes.filter(x => x.cliente_id === clienteExcluir.id).length;
          const p = carteira.processos.filter(x => x.cliente_id === clienteExcluir.id).length;
          return `As ${s} ${s === 1 ? 'sessão' : 'sessões'} e os ${p} ${p === 1 ? 'processo' : 'processos'} deste cliente também serão apagados, em todos os aparelhos. Não dá para desfazer.`;
        })()}
        rotuloConfirmar="Excluir cliente"
        pedirSenha
        aoConfirmar={() => clienteExcluir && comIndicador(() => excluirCliente(clienteExcluir.id))}
      />
    </>
  );
}
