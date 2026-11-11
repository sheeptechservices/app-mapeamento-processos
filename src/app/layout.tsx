import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { RegistrarSW } from '@/components/registrar-sw';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: { default: 'Sheep Levantamento', template: '%s | Sheep Levantamento' },
  description: 'Mapa de processos e ROI da carteira de clientes da Sheep Technology.',
  applicationName: 'Sheep Levantamento',
  appleWebApp: { capable: true, title: 'Levantamento', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
  ],
};

// Aplica o tema antes da primeira pintura. 'sistema' (ou nada salvo) segue o
// aparelho; a troca em tempo real fica com o componente de tema.
const scriptTema = `try{var t=localStorage.getItem('tema');if(t!=='claro'&&t!=='escuro')t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';document.documentElement.dataset.theme=t==='escuro'?'dark':'light'}catch(e){}`;

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
