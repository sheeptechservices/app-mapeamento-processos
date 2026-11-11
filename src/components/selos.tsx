import { Selo, type TomSelo } from '@/components/ui/selo';
import {
  ESTAGIOS_CLIENTE,
  rotuloDe,
  rotuloStatus,
  type Configuracoes,
  type EstagioCliente,
  type StatusProcesso,
} from '@/lib/dominio';

// Cor de cada estado num lugar só: a lista de clientes, os cards de processo e
// o dashboard usam os mesmos selos.

const TOM_ESTAGIO: Record<EstagioCliente, TomSelo> = {
  mapeando: 'pendente',
  em_analise: 'analise',
  em_proposta: 'proposta',
  em_execucao: 'automatizado',
  em_risco: 'risco',
};

const TOM_STATUS: Record<StatusProcesso, TomSelo> = {
  pendente: 'pendente',
  em_analise: 'analise',
  em_proposta: 'proposta',
  em_execucao: 'verde',
  automatizado: 'automatizado',
};

export function SeloEstagio({ estagio }: { estagio: EstagioCliente }) {
  return <Selo tom={TOM_ESTAGIO[estagio]}>{rotuloDe(ESTAGIOS_CLIENTE, estagio)}</Selo>;
}

export function SeloStatus({ status, cfg }: { status: StatusProcesso; cfg?: Pick<Configuracoes, 'rotulos_status'> | null }) {
  return <Selo tom={TOM_STATUS[status]}>{rotuloStatus(status, cfg)}</Selo>;
}

export function SeloRisco() {
  return <Selo tom="risco">Em risco</Selo>;
}
