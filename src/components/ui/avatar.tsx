import { cn } from '@/lib/cn';

export function iniciais(nome: string | null | undefined) {
  const partes = (nome ?? '')
    .replace(/\b(de|da|do|das|dos|e)\b/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return '?';
  return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Foto (ou logo) redonda; sem imagem, as iniciais sobre cinza. */
export function Avatar({
  nome,
  imagem,
  tamanho = 32,
  quadrado,
  className,
}: {
  nome: string | null | undefined;
  imagem?: string | null;
  tamanho?: number;
  /** Logos de cliente ficam em quadrado arredondado; pessoas, em círculo. */
  quadrado?: boolean;
  className?: string;
}) {
  const raio = quadrado ? 'rounded-[28%]' : 'rounded-pilula';
  return imagem ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagem}
      alt=""
      width={tamanho}
      height={tamanho}
      referrerPolicy="no-referrer"
      className={cn('shrink-0 border border-borda bg-superficie object-cover', raio, className)}
      style={{ width: tamanho, height: tamanho }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center bg-sutil font-semibold text-tinta-2 select-none', raio, className)}
      style={{ width: tamanho, height: tamanho, fontSize: Math.max(10, tamanho * 0.36) }}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Avatares empilhados (responsáveis do processo). */
export function AvataresEmpilhados({
  pessoas,
  maximo = 3,
  tamanho = 26,
}: {
  pessoas: { id: string; nome: string; foto?: string | null }[];
  maximo?: number;
  tamanho?: number;
}) {
  if (!pessoas.length) return null;
  const visiveis = pessoas.slice(0, maximo);
  const resto = pessoas.length - visiveis.length;
  return (
    <span className="flex items-center" aria-label={pessoas.map(p => p.nome).join(', ')} title={pessoas.map(p => p.nome).join(', ')}>
      {visiveis.map((p, i) => (
        <span key={p.id} className="rounded-pilula ring-2 ring-superficie" style={{ marginLeft: i ? -8 : 0, zIndex: maximo - i }}>
          <Avatar nome={p.nome} imagem={p.foto} tamanho={tamanho} />
        </span>
      ))}
      {resto > 0 && (
        <span
          className="numeros grid place-items-center rounded-pilula bg-sutil text-[11px] text-tinta-2 ring-2 ring-superficie"
          style={{ width: tamanho, height: tamanho, marginLeft: -8 }}
        >
          +{resto}
        </span>
      )}
    </span>
  );
}
