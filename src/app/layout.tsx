import { MODO_ESCURO_LIBERADO } from '@/lib/tema-config';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { RegistrarSW } from '@/components/registrar-sw';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  // Ferramenta interna: fora dos buscadores (o link fica aberto, mas não é divulgado).
  robots: { index: false, follow: false },
  title: { default: 'Sheep Levantamento', template: '%s | Sheep Levantamento' },
  description: 'Mapa de processos e ROI da carteira de clientes da Sheep Technology.',
  applicationName: 'Sheep Levantamento',
  appleWebApp: { capable: true, title: 'Levantamento', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: MODO_ESCURO_LIBERADO
    ? [
        { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
        { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
      ]
    : '#f7f7f7',
};

// Aplica o tema antes da primeira pintura. 'sistema' (ou nada salvo) segue o
// aparelho; a troca em tempo real fica com o componente de tema. Com o modo
// escuro bloqueado (lib/tema-config.ts), é sempre claro.
const scriptTema = !MODO_ESCURO_LIBERADO
  ? `document.documentElement.dataset.theme='light'`
  : `try{var t=localStorage.getItem('tema');if(t!=='claro'&&t!=='escuro')t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';document.documentElement.dataset.theme=t==='escuro'?'dark':'light'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
