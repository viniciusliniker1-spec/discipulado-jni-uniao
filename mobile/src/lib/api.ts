// Camada de dados (Supabase). Mesmas regras de acesso do site: o banco é quem decide o que cada conta vê.
import { supabase } from './supabase';

export class ErroApp extends Error {}

const MSG: Record<string, string> = {
  codigo_invalido: 'Código de discipulador inválido. Peça o código à liderança.',
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com este e-mail.',
};
function traduzir(e: any): ErroApp {
  const msg = (e && (e.message || e.error_description)) || 'Erro';
  if (/Database error saving new user/i.test(msg)) return new ErroApp('Não foi possível criar a conta. Confira o código de discipulador.');
  if (/email rate limit/i.test(msg)) return new ErroApp('Muitas tentativas de e-mail. Aguarde cerca de uma hora e tente de novo.');
  return new ErroApp(MSG[msg] || msg);
}
async function uid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const u = data.session && data.session.user;
  if (!u) throw new ErroApp('Entre na sua conta para continuar.');
  return u.id;
}
const hojeUTC = () => new Date().toISOString().slice(0, 10);

const texto = (v: any, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const lista = (v: any, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
export function sanitizarEncontro(e: any) {
  const perg: Record<string, string> = {};
  if (e && e.perg && typeof e.perg === 'object') Object.keys(e.perg).slice(0, 10).forEach(k => { perg[k] = texto(e.perg[k], 3000); });
  return {
    bal: lista(e && e.bal, 3).map(Boolean), txt: lista(e && e.txt, 3).map(Boolean), perg,
    dias: lista(e && e.dias, 5).map(Boolean),
    reg: lista(e && e.reg, 5).map((r: any) => lista(r, 4).map((c: any) => texto(c, 500))),
    quiz: Number.isInteger(e && e.quiz) ? e.quiz : -1, comp: texto(e && e.comp, 3000), done: !!(e && e.done),
  };
}
export const notaVazia = () => ({ percepcoes: '', compromisso: '', acompanhamento: '', anotacoes: '' });
export function sanitizarNota(e: any) {
  return { percepcoes: texto(e && e.percepcoes, 3000), compromisso: texto(e && e.compromisso, 3000), acompanhamento: texto(e && e.acompanhamento, 3000), anotacoes: texto(e && e.anotacoes, 3000) };
}

async function registrarDia(tabela: string, campo: string, id: string) {
  await supabase.from(tabela).upsert({ [campo]: id, dia: hojeUTC() }, { onConflict: campo + ',dia', ignoreDuplicates: true });
}
export function semanasDe(dias: string[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  const agora = Date.now();
  dias.forEach(d => {
    const idade = Math.floor((agora - new Date(d).getTime()) / 864e5);
    if (idade >= 0 && idade < 56) out[Math.floor(idade / 7)]++;
  });
  return out.reverse();
}

export type Perfil = { id: string; nome: string; email: string; papel: 'aluno' | 'discipulador' | 'admin'; duplo?: boolean };

export const api = {
  async entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw traduzir(error);
  },
  async cadastrar(nome: string, email: string, senha: string, papel: string, codigo: string) {
    if (papel === 'discipulador') {
      const { data: ok } = await supabase.rpc('codigo_discipulador_valido', { codigo });
      if (!ok) throw new ErroApp('Código de discipulador inválido. Peça o código à liderança.');
    }
    const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome, papel, codigo } } });
    if (error) throw traduzir(error);
    if (!data.session) throw new ErroApp('Conta criada. Confirme o e-mail e depois entre (ou desative a confirmação no Supabase).');
  },
  async sair() { await supabase.auth.signOut(); },

  async eu(): Promise<{ usuario: Perfil; caps: { curso: boolean; conduzir: boolean; admin: boolean }; discipulador: Perfil | null } | null> {
    const { data } = await supabase.auth.getSession();
    const u = data.session && data.session.user;
    if (!u) return null;
    const { data: p, error } = await supabase.from('perfis').select('id,nome,email,papel,duplo').eq('id', u.id).maybeSingle();
    if (error) throw traduzir(error);
    if (!p) return null;
    const caps = {
      curso: p.papel !== 'admin' || !!p.duplo,
      conduzir: p.papel === 'discipulador' || (p.papel === 'admin' && !!p.duplo),
      admin: p.papel === 'admin',
    };
    let discipulador: Perfil | null = null;
    if (p.papel === 'aluno') {
      const { data: d } = await supabase.from('designacoes').select('discipulador_id').eq('aluno_id', u.id).maybeSingle();
      if (d && d.discipulador_id) {
        const { data: dp } = await supabase.from('perfis').select('id,nome,email,papel').eq('id', d.discipulador_id).maybeSingle();
        discipulador = dp as Perfil;
      }
    }
    return { usuario: p as Perfil, caps, discipulador };
  },

  async progressoDe(alunoId: string): Promise<Record<number, any>> {
    const { data, error } = await supabase.from('encontros').select('n,dados').eq('aluno_id', alunoId);
    if (error) throw traduzir(error);
    const out: Record<number, any> = {};
    (data || []).forEach((r: any) => { out[r.n] = r.dados; });
    return out;
  },
  async salvarEncontro(n: number, dados: any) {
    const id = await uid();
    const { error } = await supabase.from('encontros').upsert({ aluno_id: id, n, dados: sanitizarEncontro(dados), atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id,n' });
    if (error) throw traduzir(error);
    await registrarDia('atividade', 'user_id', id);
  },

  async metricas(alunoId: string): Promise<any> {
    const { data, error } = await supabase.rpc('metricas_aluno', { aluno: alunoId });
    if (error) throw traduzir(error);
    return data;
  },
  async discipulos(): Promise<Perfil[]> {
    const id = await uid();
    const { data: ds, error } = await supabase.from('designacoes').select('aluno_id').eq('discipulador_id', id);
    if (error) throw traduzir(error);
    const ids = (ds || []).map((d: any) => d.aluno_id);
    if (!ids.length) return [];
    const { data: ps, error: e2 } = await supabase.from('perfis').select('id,nome,email,papel').in('id', ids);
    if (e2) throw traduzir(e2);
    return (ps || []) as Perfil[];
  },
  async notasDe(alunoId: string, n: number) {
    const id = await uid();
    const { data } = await supabase.from('notas').select('dados').eq('discipulador_id', id).eq('aluno_id', alunoId).eq('n', n).maybeSingle();
    return data && data.dados ? data.dados : notaVazia();
  },
  async salvarNotas(alunoId: string, n: number, dados: any) {
    const id = await uid();
    const { error } = await supabase.from('notas').upsert({ discipulador_id: id, aluno_id: alunoId, n, dados: sanitizarNota(dados) });
    if (error) throw traduzir(error);
    await registrarDia('atividade_notas', 'discipulador_id', id);
  },

  async avisos(): Promise<{ id: number; texto: string; criado_em: string }[]> {
    const id = await uid();
    const { data, error } = await supabase.from('avisos').select('id,texto,criado_em').eq('destinatario_id', id).eq('lido', false).order('criado_em', { ascending: false }).limit(20);
    if (error) throw traduzir(error);
    return (data || []) as any;
  },
  async marcarAvisoLido(id: number) {
    const { error } = await supabase.from('avisos').update({ lido: true }).eq('id', id);
    if (error) throw traduzir(error);
  },

  async usuariosAdmin() {
    const { data: perfis } = await supabase.from('perfis').select('id,nome,email,papel');
    const { data: des } = await supabase.from('designacoes').select('aluno_id,discipulador_id');
    const { data: conc } = await supabase.rpc('status_conclusao');
    const concMap: Record<string, number[]> = Object.fromEntries((conc || []).map((c: any) => [c.aluno_id, c.encontros || []]));
    return (perfis || []).map((x: any) => ({
      ...x,
      discipuladorId: ((des || []).find((d: any) => d.aluno_id === x.id) || ({} as any)).discipulador_id || null,
      concluidos: concMap[x.id] || [],
    }));
  },
  async designar(alunoId: string, discipuladorId: string | null) {
    const { error } = await supabase.rpc('designar_discipulador', { p_aluno: alunoId, p_disc: discipuladorId });
    if (error) throw traduzir(error);
  },
  async depoisGet(): Promise<{ m: string; c: string; a: string }> {
    const id = await uid();
    const { data } = await supabase.from('depois').select('dados').eq('aluno_id', id).maybeSingle();
    return data && data.dados ? data.dados : { m: '', c: '', a: '' };
  },
  async depoisSalvar(d: { m: string; c: string; a: string }) {
    const id = await uid();
    const { error } = await supabase.from('depois').upsert({ aluno_id: id, dados: { m: texto(d.m), c: texto(d.c), a: texto(d.a) } });
    if (error) throw traduzir(error);
  },

  // Relatório do discipulador: só os discípulos designados a ele
  async relatorioDiscipulador() {
    const id = await uid();
    const alunos = await api.discipulos();
    const discipulos: any[] = [];
    for (const a of alunos) {
      const met = await api.metricas(a.id);
      const { data: ns } = await supabase.from('notas').select('dados').eq('discipulador_id', id).eq('aluno_id', a.id);
      const notas = (ns || []).filter((r: any) => r.dados && Object.values(r.dados).some((v: any) => v && String(v).trim())).length;
      discipulos.push({ ...a, ...met, notas });
    }
    const { data: at } = await supabase.from('atividade_notas').select('dia').eq('discipulador_id', id);
    const dias = (at || []).map((r: any) => r.dia).sort();
    return { discipulos, minhasNotas: { ultimaAtividade: dias.length ? dias[dias.length - 1] : null, semanas: semanasDe(dias) } };
  },

  // Relatório do administrador: só números e datas
  async relatorioAdmin() {
    const { data: perfis } = await supabase.from('perfis').select('id,nome,email,papel');
    const { data: des } = await supabase.from('designacoes').select('aluno_id,discipulador_id');
    const porId: Record<string, any> = Object.fromEntries((perfis || []).map((x: any) => [x.id, x]));
    const alunos: any[] = [];
    for (const a of (perfis || []).filter((x: any) => x.papel === 'aluno')) {
      const met = await api.metricas(a.id);
      const dId = ((des || []).find((d: any) => d.aluno_id === a.id) || ({} as any)).discipulador_id || null;
      const { encontros, ...resto } = met;
      alunos.push({ id: a.id, nome: a.nome, discipulador: dId && porId[dId] ? porId[dId].nome : null, discipuladorId: dId, ...resto });
    }
    const discipuladores = (perfis || []).filter((x: any) => x.papel === 'discipulador').map((d: any) => {
      const meus = alunos.filter(a => a.discipuladorId === d.id);
      const media = meus.length ? Math.round((meus.reduce((s, a) => s + a.concluidos, 0) / meus.length) * 10) / 10 : 0;
      return { id: d.id, nome: d.nome, discipulos: meus.length, mediaConcluidos: media, semAtividade7: meus.filter(a => a.diasAtivos7 === 0).length };
    });
    return { alunos, discipuladores };
  },

  async ativarAcesso(codigo: string) {
    const { error } = await supabase.rpc('ativar_acesso', { codigo });
    if (error) throw traduzir(error);
  },
};
