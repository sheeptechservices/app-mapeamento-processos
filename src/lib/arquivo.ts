// Arquivo anexado ao processo (PDF, planilha, documento...): lido no aparelho,
// convertido em base64 e partido em pedaços que cabem num pedido de
// sincronização (ver sync-protocolo.ts). Para abrir, as partes são montadas de
// volta num Blob.

/** Caracteres base64 por parte (múltiplo de 4: cada parte decodifica sozinha). Cerca de 675 KB do arquivo. */
export const TAMANHO_PARTE = 900_000;
/** Maior arquivo aceito. */
export const LIMITE_ARQUIVO = 20 * 1024 * 1024;

export const ACEITOS = '.pdf,.xlsx,.xls,.xlsm,.csv,.docx,.doc,.odt,.ods,.pptx,.ppt,.txt,.rtf,.zip,image/*';

export class ErroArquivo extends Error {}

export function partir(base64: string, tamanho = TAMANHO_PARTE): string[] {
  if (tamanho % 4) throw new Error('tamanho da parte precisa ser múltiplo de 4');
  const partes: string[] = [];
  for (let i = 0; i < base64.length; i += tamanho) partes.push(base64.slice(i, i + tamanho));
  return partes.length ? partes : [''];
}

/** Lê o arquivo e devolve as partes em base64. */
export async function lerEmPartes(arquivo: File): Promise<string[]> {
  if (arquivo.size > LIMITE_ARQUIVO) throw new ErroArquivo(`"${arquivo.name}" passa de ${tamanhoLegivel(LIMITE_ARQUIVO)}.`);
  const dataUrl = await new Promise<string>((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => falha(new ErroArquivo(`Não foi possível ler "${arquivo.name}".`));
    leitor.readAsDataURL(arquivo);
  });
  return partir(dataUrl.slice(dataUrl.indexOf(',') + 1));
}

/** Monta o arquivo de volta a partir das partes. */
export function montar(partes: string[], mime: string | null): Blob {
  const pedacos = partes.map(p => {
    const bin = atob(p);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  });
  return new Blob(pedacos, { type: mime || 'application/octet-stream' });
}

export function tamanhoLegivel(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

export type FamiliaArquivo = 'pdf' | 'planilha' | 'documento' | 'apresentacao' | 'outro';

/** Que tipo de arquivo é, pela extensão (o mime do navegador às vezes vem vazio). */
export function familiaDe(nome: string | null | undefined): FamiliaArquivo {
  const ext = (nome ?? '').toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'xlsm', 'csv', 'ods'].includes(ext)) return 'planilha';
  if (['docx', 'doc', 'odt', 'rtf', 'txt'].includes(ext)) return 'documento';
  if (['pptx', 'ppt'].includes(ext)) return 'apresentacao';
  return 'outro';
}

/** O navegador mostra sozinho (abre numa aba) em vez de só baixar. */
export function abreNoNavegador(mime: string | null | undefined, nome: string | null | undefined) {
  return familiaDe(nome) === 'pdf' || !!mime?.startsWith('image/') || !!mime?.startsWith('text/');
}
