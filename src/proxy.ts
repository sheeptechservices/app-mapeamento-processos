import { NextResponse, type NextRequest } from 'next/server';

// Checagem otimista: sem cookie de sessão, a tela manda para /entrar. A
// assinatura do cookie é conferida nas rotas de API, que são quem lê e grava
// dado no servidor.
export function proxy(req: NextRequest) {
  if (!req.cookies.has('sl_sessao')) {
    const url = new URL('/entrar', req.url);
    // Volta para o mesmo ponto do mapa (sessão e processo da query string) depois de entrar.
    if (req.nextUrl.pathname !== '/' || req.nextUrl.search) url.searchParams.set('voltar', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!entrar|api|_next|favicon.ico|icones|apple-icon|manifest.webmanifest|sw.js).*)'],
};
