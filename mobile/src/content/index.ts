import data from './conteudo.json';

// Conteúdo dos 10 encontros (mesmo texto do site, exportado de public/content.js)
export const ENC: any[] = (data as any).ENC;
export const BLOCOS: Record<string, [string, string]> = (data as any).BLOCOS;
export const PILARES_DISC: any[] = (data as any).PILARES_DISC;

const LIVRO_YV: Record<string, string> = (data as any).LIVRO_YV;
const NVI_ID: string = (data as any).NVI_ID;

// Abre o versículo na NVI do YouVersion (aplicativo Bíblia)
export function linkVersiculo(ref: string): string {
  const m = ref.match(/^(.+?)\s+(\d+):(.+)$/);
  if (!m || !LIVRO_YV[m[1]]) return 'https://www.bible.com/';
  return 'https://www.bible.com/bible/' + NVI_ID + '/' + LIVRO_YV[m[1]] + '.' + m[2] + '.' + m[3];
}
