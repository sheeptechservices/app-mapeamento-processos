// Foto de anexo: reduzida no aparelho (lado maior 1600px, WebP ou JPEG) e
// guardada como data URL no registro do anexo. Funciona offline e sincroniza
// como o resto (em páginas, ver sync-protocolo.ts). Uma foto de celular de 4 MB
// vira algo entre 150 e 400 KB, nítida o bastante para ilustrar o processo.

export const LADO_FOTO = 1600;
const LIMITE_ARQUIVO = 25 * 1024 * 1024;

export class ErroFoto extends Error {}

export async function reduzirFoto(arquivo: File, lado = LADO_FOTO): Promise<string> {
  if (!arquivo.type.startsWith('image/') && arquivo.type !== '') throw new ErroFoto('Escolha uma imagem (foto ou print).');
  if (arquivo.size > LIMITE_ARQUIVO) throw new ErroFoto('A imagem passa de 25 MB.');

  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new ErroFoto('Não foi possível ler a imagem.');
    const escala = Math.min(1, lado / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ErroFoto('Não foi possível ler a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL('image/webp', 0.8);
    // Safari antigo não gera WebP (devolve PNG, bem maior): usa JPEG.
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
  } catch (e) {
    if (e instanceof ErroFoto) throw e;
    throw new ErroFoto('Não foi possível ler a imagem. Se for do iPhone (HEIC), tente pela câmera ou mande como JPG.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Link digitado sem protocolo ganha https://. Devolve null se não parecer um endereço. */
export function normalizarLink(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const comProtocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(comProtocolo);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Nome curto do link para mostrar (domínio sem www). */
export function dominioDe(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
