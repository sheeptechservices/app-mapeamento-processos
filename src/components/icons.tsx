// Fonte única de ícones. Desenhos do Lucide (open source), traço 1.7 como pede
// a estética v6, sempre `currentColor`. Nenhuma tela importa lucide-react
// direto: assim o traço é igual em todo o sistema.
import type { LucideProps } from 'lucide-react';
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  CloudCheck,
  CloudOff,
  Ellipsis,
  Folder,
  FolderKanban,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Layers,
  RefreshCw,
  Link2,
  LogOut,
  Mail,
  Maximize2,
  Minimize2,
  MapPin,
  Mic,
  Monitor,
  Moon,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

type Icone = ComponentType<LucideProps>;

/**
 * Movimento do ícone quando o botão, link ou rótulo em volta recebe hover ou
 * foco (regras `.mov-*` em globals.css, só sem movimento reduzido). Cada ícone
 * já nasce com o seu: o lápis rabisca, a lixeira treme, o mais gira.
 */
type Movimento =
  | 'gira'
  | 'engrenagem'
  | 'rabisca'
  | 'treme'
  | 'avanca'
  | 'volta'
  | 'desce'
  | 'diagonal'
  | 'lupa'
  | 'desliza'
  | 'pula'
  | 'sino'
  | 'sol'
  | 'lua';

function traco(Componente: Icone, nome: string, mov?: Movimento) {
  function IconeDaCasa({ size = 20, strokeWidth = 1.7, className, ...resto }: LucideProps) {
    return (
      <Componente
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        className={mov ? `mov mov-${mov}${className ? ` ${className}` : ''}` : className}
        {...resto}
      />
    );
  }
  IconeDaCasa.displayName = nome;
  return IconeDaCasa;
}

// Navegação
/** Aba Processos (mapa de processos). */
export const IconProcessos = traco(FolderKanban, 'IconProcessos', 'pula');
/** Aba Clientes. */
export const IconClientes = traco(Building2, 'IconClientes', 'pula');
/** Aba Ajustes. */
export const IconAjustes = traco(Settings, 'IconAjustes', 'engrenagem');
/** Captura com IA e tudo que é sugestão da IA. */
export const IconIA = traco(Sparkles, 'IconIA', 'pula');
export const IconNotificacao = traco(Bell, 'IconNotificacao', 'sino');

// Ações
export const IconVoltar = traco(ArrowLeft, 'IconVoltar', 'volta');
export const IconAnterior = traco(ChevronLeft, 'IconAnterior', 'volta');
/** Linha que abre sub-tela, e seta de abrir/recolher (gira, não troca). */
export const IconSeta = traco(ChevronRight, 'IconSeta', 'avanca');
export const IconSetaBaixo = traco(ChevronDown, 'IconSetaBaixo', 'desce');
export const IconFechar = traco(X, 'IconFechar', 'gira');
export const IconAdicionar = traco(Plus, 'IconAdicionar', 'gira');
export const IconEditar = traco(Pencil, 'IconEditar', 'rabisca');
export const IconExcluir = traco(Trash2, 'IconExcluir', 'treme');
export const IconBusca = traco(Search, 'IconBusca', 'lupa');
/** Botão Filtros. */
export const IconFiltros = traco(SlidersHorizontal, 'IconFiltros', 'desliza');
/** Ordenação. */
export const IconOrdenar = traco(ArrowDownWideNarrow, 'IconOrdenar', 'desce');
export const IconAgrupar = traco(Layers, 'IconAgrupar', 'pula');
export const IconAtualizar = traco(RefreshCw, 'IconAtualizar', 'gira');
export const IconMais = traco(Ellipsis, 'IconMais', 'pula');
export const IconCheck = traco(Check, 'IconCheck', 'pula');
export const IconCheckCirculo = traco(CircleCheck, 'IconCheckCirculo', 'pula');
export const IconSair = traco(LogOut, 'IconSair', 'avanca');
/** Upload de logo. */
export const IconImagem = traco(ImagePlus, 'IconImagem', 'pula');
export const IconCamera = traco(Camera, 'IconCamera', 'pula');
/** Integração (conectar). */
export const IconLink = traco(Link2, 'IconLink', 'gira');
export const IconExterno = traco(ArrowUpRight, 'IconExterno', 'diagonal');
/** Expandir o quadro para a tela toda e recolher. */
export const IconExpandir = traco(Maximize2, 'IconExpandir', 'pula');
export const IconRecolher = traco(Minimize2, 'IconRecolher', 'pula');

// Conteúdo
export const IconProcesso = traco(Workflow, 'IconProcesso', 'pula');
/** Pasta de sessão no Mapa de processo (fechada e aberta). */
export const IconPasta = traco(Folder, 'IconPasta', 'pula');
export const IconPastaAberta = traco(FolderOpen, 'IconPastaAberta', 'pula');
export const IconRoteiro = traco(ClipboardList, 'IconRoteiro', 'pula');
export const IconRelogio = traco(Clock, 'IconRelogio', 'pula');
export const IconCalendario = traco(CalendarDays, 'IconCalendario', 'pula');
export const IconCronometro = traco(Timer, 'IconCronometro', 'pula');
export const IconPessoas = traco(Users, 'IconPessoas', 'pula');
export const IconTelefone = traco(Phone, 'IconTelefone', 'sino');
export const IconEmail = traco(Mail, 'IconEmail', 'pula');
export const IconLocal = traco(MapPin, 'IconLocal', 'pula');
export const IconTendencia = traco(TrendingUp, 'IconTendencia', 'pula');
/** Quick win. */
export const IconRaio = traco(Zap, 'IconRaio', 'pula');
/** Papel e permissão. */
export const IconPapel = traco(ShieldCheck, 'IconPapel', 'pula');
export const IconMicrofone = traco(Mic, 'IconMicrofone', 'pula');

// Estados
export const IconAlerta = traco(TriangleAlert, 'IconAlerta');
export const IconAviso = traco(CircleAlert, 'IconAviso');
export const IconOffline = traco(CloudOff, 'IconOffline');
export const IconSalvo = traco(CloudCheck, 'IconSalvo');
export const IconAparelho = traco(HardDrive, 'IconAparelho');

// Tema
export const IconLua = traco(Moon, 'IconLua', 'lua');
export const IconSol = traco(Sun, 'IconSol', 'sol');
export const IconSistema = traco(Monitor, 'IconSistema', 'pula');
