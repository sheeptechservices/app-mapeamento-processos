// Logo do cliente: reduzida no aparelho para no máximo 256px e guardada como
// data URL no próprio registro. Assim funciona offline, sincroniza junto com o
// cliente e não precisa de serviço de arquivos. Uma logo de 256px em WebP fica
// entre 5 e 30 KB.

export const LADO_LOGO = 256;
const LIMITE_ARQUIVO = 8 * 1024 * 1024;

export class ErroLogo extends Error {}

export async function reduzirLogo(arquivo: File, lado = LADO_LOGO): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new ErroLogo('Escolha uma imagem (PNG, JPG, SVG ou WebP).');
  if (arquivo.size > LIMITE_ARQUIVO) throw new ErroLogo('A imagem passa de 8 MB. Use uma versão menor da logo.');

  // <img> em vez de createImageBitmap: também abre SVG.
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth || lado;
    const h = img.naturalHeight || lado;
    const escala = Math.min(1, lado / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ErroLogo('Não foi possível ler a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL('image/webp', 0.88);
    // Safari antigo não gera WebP e devolve PNG mesmo pedindo WebP.
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } catch (e) {
    if (e instanceof ErroLogo) throw e;
    throw new ErroLogo('Não foi possível ler a imagem.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
