/** Versão deste app aberto (do build). */
export const VERSAO_ATUAL = process.env.NEXT_PUBLIC_VERSAO ?? '';

/**
 * Há versão nova no ar? Só quando as duas são conhecidas e diferentes: resposta
 * vazia, erro ou rede fora nunca contam como atualização.
 */
export function haNovaVersao(atual: string, noAr: unknown): noAr is string {
  return typeof noAr === 'string' && noAr.length > 0 && atual.length > 0 && noAr !== atual;
}
