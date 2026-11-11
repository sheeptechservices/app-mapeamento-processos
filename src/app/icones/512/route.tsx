import { desenharIcone } from '@/lib/icone';

export async function GET() {
  return desenharIcone(512);
}
