// Formatação leve para os textos longos (ficha do cliente, sócios): um pedaço
// pequeno de Markdown, lido sem HTML (nada de innerHTML, então não tem como
// injetar código). O que entende:
//   ## Título          - item de lista       **negrito**
//   linha comum        (2 espaços) - subitem  *itálico* ou _itálico_
// Linha em branco separa parágrafos e listas.

export type Trecho = { tipo: 'texto' | 'negrito' | 'italico'; valor: string };

export type Bloco =
  | { tipo: 'titulo'; trechos: Trecho[] }
  | { tipo: 'paragrafo'; linhas: Trecho[][] }
  | { tipo: 'lista'; itens: { nivel: 0 | 1; trechos: Trecho[] }[] };

const INLINE = /\*\*(.+?)\*\*|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g;

export function trechos(linha: string): Trecho[] {
  const out: Trecho[] = [];
  let fim = 0;
  for (const m of linha.matchAll(INLINE)) {
    if (m.index > fim) out.push({ tipo: 'texto', valor: linha.slice(fim, m.index) });
    if (m[1] !== undefined) out.push({ tipo: 'negrito', valor: m[1] });
    else out.push({ tipo: 'italico', valor: m[2] ?? m[3] });
    fim = m.index + m[0].length;
  }
  if (fim < linha.length) out.push({ tipo: 'texto', valor: linha.slice(fim) });
  return out;
}

export function lerTextoRico(texto: string | null | undefined): Bloco[] {
  const blocos: Bloco[] = [];
  let atual: Bloco | null = null;
  const fechar = () => {
    if (atual) blocos.push(atual);
    atual = null;
  };
  for (const bruta of (texto ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const linha = bruta.replace(/\s+$/, '');
    if (!linha.trim()) {
      fechar();
      continue;
    }
    const titulo = linha.match(/^\s*#{1,3}\s+(.+)$/);
    if (titulo) {
      fechar();
      blocos.push({ tipo: 'titulo', trechos: trechos(titulo[1]) });
      continue;
    }
    const item = linha.match(/^(\s*)[-*•]\s+(.+)$/);
    if (item) {
      if (atual?.tipo !== 'lista') {
        fechar();
        atual = { tipo: 'lista', itens: [] };
      }
      (atual as Extract<Bloco, { tipo: 'lista' }>).itens.push({ nivel: item[1].length >= 2 ? 1 : 0, trechos: trechos(item[2]) });
      continue;
    }
    if (atual?.tipo !== 'paragrafo') {
      fechar();
      atual = { tipo: 'paragrafo', linhas: [] };
    }
    (atual as Extract<Bloco, { tipo: 'paragrafo' }>).linhas.push(trechos(linha.trim()));
  }
  fechar();
  return blocos;
}
