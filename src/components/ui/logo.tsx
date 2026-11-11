import { cn } from '@/lib/cn';

/**
 * Logo oficial da Sheep (mesmos arquivos do Sheep Indica): o carneiro em traço
 * com os nós de circuito, e a versão completa com "SHEEP / TECHNOLOGY SERVICES".
 * PNG preto; no tema escuro a classe .logo-sheep inverte para branco.
 */
export function LogoSheep({
  variante = 'completa',
  altura = 28,
  className,
}: {
  variante?: 'completa' | 'carneiro';
  altura?: number;
  className?: string;
}) {
  const completa = variante === 'completa';
  // Proporções dos arquivos: completa 350x100, carneiro 424x320.
  const largura = Math.round(altura * (completa ? 3.5 : 424 / 320));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={completa ? '/marca/sheep-logo.png' : '/marca/sheep-carneiro.png'}
      alt="Sheep Technology Services"
      width={largura}
      height={altura}
      className={cn('logo-sheep shrink-0 select-none', className)}
      style={{ width: largura, height: altura }}
      draggable={false}
    />
  );
}
