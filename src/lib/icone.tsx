import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Ícone do app: o carneiro da Sheep em branco sobre preto, com o ponto verde da
// marca. Sem cantos arredondados no desenho (o sistema aplica a máscara) e com o
// símbolo dentro da zona segura de 80% para o ícone maskable.
export async function desenharIcone(tamanho: number) {
  const carneiro = await readFile(join(process.cwd(), 'public/marca/sheep-carneiro-branco.png'));
  const src = `data:image/png;base64,${carneiro.toString('base64')}`;
  const largura = Math.round(tamanho * 0.6);
  const altura = Math.round(largura * (320 / 424));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: '#0E0E0F',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={largura} height={altura} alt="" />
        <div
          style={{
            position: 'absolute',
            right: tamanho * 0.2,
            bottom: tamanho * 0.22,
            width: tamanho * 0.075,
            height: tamanho * 0.075,
            borderRadius: '50%',
            background: '#BEFF01',
          }}
        />
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
