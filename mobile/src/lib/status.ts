// Textos de situação (datas, atividade) iguais aos do site
export function dataBR(d: string | null | undefined): string {
  if (!d) return '—';
  const [a, m, dd] = d.split('-');
  return dd + '/' + m + '/' + a;
}
export function statusAtividade(ultima: string | null, dias7: number): string {
  if (!ultima) return 'Sem atividade';
  return dias7 > 0 ? 'Em dia' : 'Parado há 7+ dias';
}
