/* ---------- camada de dados (Supabase) ----------
   Substitui o servidor Node: api(path, opts) mantém as mesmas rotas e formas de resposta
   que as telas já usam. As regras de acesso ficam no banco (supabase/schema.sql). */

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const MSG_ERRO = {
  codigo_invalido: 'Código de discipulador inválido. Peça o código à liderança.',
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com este e-mail.'
};

function erro(msg, status = 400) { const e = new Error(msg); e.status = status; return e; }
function traduzirErro(e) {
  const msg = (e && (e.message || e.msg || e.error_description)) || 'Erro';
  if (/Database error saving new user/i.test(msg)) return erro('Não foi possível criar a conta. Confira o código de discipulador.', 400);
  return erro(MSG_ERRO[msg] || msg, e && e.status === 401 ? 401 : (e && e.status) || 400);
}
function hojeUTC() { return new Date().toISOString().slice(0, 10); }

async function usuarioLogado() {
  const { data } = await sb.auth.getSession();
  const u = data && data.session && data.session.user;
  if (!u) throw erro('não autenticado', 401);
  return u;
}
async function perfilDe(id) {
  const { data, error } = await sb.from('perfis').select('id,nome,email,papel,duplo').eq('id', id).maybeSingle();
  if (error) throw traduzirErro(error);
  if (!data) throw erro('Perfil não encontrado. Saia e entre de novo.', 401);
  return data;
}
function publico(p) { return { id: p.id, nome: p.nome, email: p.email, papel: p.papel }; }

/* ---------- sanitização (mesmas regras do servidor antigo) ----------- */
const texto = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const lista = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
function sanitizarEncontro(e) {
  const perg = {};
  if (e && e.perg && typeof e.perg === 'object') Object.keys(e.perg).slice(0, 10).forEach(k => { perg[k] = texto(e.perg[k], 3000); });
  return {
    bal: lista(e && e.bal, 3).map(Boolean),
    txt: lista(e && e.txt, 3).map(Boolean),
    perg,
    dias: lista(e && e.dias, 5).map(Boolean),
    reg: lista(e && e.reg, 5).map(r => lista(r, 4).map(c => texto(c, 500))),
    quiz: Number.isInteger(e && e.quiz) ? e.quiz : -1,
    comp: texto(e && e.comp, 3000),
    done: !!(e && e.done)
  };
}
function sanitizarNota(e) {
  return { percepcoes: texto(e && e.percepcoes, 3000), compromisso: texto(e && e.compromisso, 3000), acompanhamento: texto(e && e.acompanhamento, 3000), anotacoes: texto(e && e.anotacoes, 3000) };
}
function sanitizarDepois(e) { return { m: texto(e && e.m), c: texto(e && e.c), a: texto(e && e.a) }; }

/* ---------- atividade (dias) ----------- */
async function registrarDia(tabela, campo, id) {
  await sb.from(tabela).upsert({ [campo]: id, dia: hojeUTC() }, { onConflict: campo + ',dia', ignoreDuplicates: true });
}
function semanasDe(dias) {
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  const agora = Date.now();
  (dias || []).forEach(d => {
    const idade = Math.floor((agora - new Date(d).getTime()) / 864e5);
    if (idade >= 0 && idade < 56) out[Math.floor(idade / 7)]++;
  });
  return out.reverse();
}

/* ---------- métricas (função no banco: só números e datas) ----------- */
async function metricas(alunoId) {
  const { data, error } = await sb.rpc('metricas_aluno', { aluno: alunoId });
  if (error) throw traduzirErro(error);
  return data;
}
async function progressoDe(alunoId) {
  const { data, error } = await sb.from('encontros').select('n,dados').eq('aluno_id', alunoId);
  if (error) throw traduzirErro(error);
  const out = {};
  (data || []).forEach(r => { out[r.n] = r.dados; });
  return out;
}
async function discipulosDoDiscipulador(discId) {
  const { data: ds, error } = await sb.from('designacoes').select('aluno_id').eq('discipulador_id', discId);
  if (error) throw traduzirErro(error);
  const ids = (ds || []).map(d => d.aluno_id);
  if (!ids.length) return [];
  const { data: ps, error: e2 } = await sb.from('perfis').select('id,nome,email,papel').in('id', ids);
  if (e2) throw traduzirErro(e2);
  return ps || [];
}

/* ---------- rotas ----------- */
async function api(path, opts = {}) {
  const m = opts.method || 'GET';
  const b = opts.body || {};
  try {
    let r;
    if (path === '/api/config' && m === 'GET') return { googleAtivo: false, conviteConfigurado: true };

    if (path === '/api/register' && m === 'POST') {
      if (b.papel === 'discipulador') {
        const { data: ok } = await sb.rpc('codigo_discipulador_valido', { codigo: b.codigo || '' });
        if (!ok) throw erro(MSG_ERRO.codigo_invalido, 400);
      }
      const { data, error } = await sb.auth.signUp({
        email: b.email, password: b.senha,
        options: { data: { nome: b.nome, papel: b.papel || 'aluno', codigo: b.codigo || '' } }
      });
      if (error) throw traduzirErro(error);
      if (!data.session) throw erro('Conta criada. Confirme o e-mail e depois entre. (Para entrar direto, desative a confirmação de e-mail em Authentication no Supabase.)', 400);
      return { usuario: {} };
    }

    if (path === '/api/login' && m === 'POST') {
      const { error } = await sb.auth.signInWithPassword({ email: b.email, password: b.senha });
      if (error) throw traduzirErro(error);
      return { ok: true };
    }

    if (path === '/api/logout' && m === 'POST') { await sb.auth.signOut(); return { ok: true }; }

    if (path === '/api/me' && m === 'GET') {
      const u = await usuarioLogado();
      const p = await perfilDe(u.id);
      const out = {
        usuario: publico(p),
        capacidades: {
          curso: p.papel !== 'admin' || !!p.duplo,
          conduzir: p.papel === 'discipulador' || (p.papel === 'admin' && !!p.duplo),
          admin: p.papel === 'admin'
        }
      };
      if (p.papel === 'aluno') {
        const { data: d } = await sb.from('designacoes').select('discipulador_id').eq('aluno_id', u.id).maybeSingle();
        if (d && d.discipulador_id) out.discipulador = publico(await perfilDe(d.discipulador_id));
      }
      return out;
    }

    if (path === '/api/meu-progresso' && m === 'GET') { const u = await usuarioLogado(); return progressoDe(u.id); }

    let mm = path.match(/^\/api\/meu-progresso\/(\d+)$/);
    if (mm && m === 'PUT') {
      const u = await usuarioLogado();
      const n = +mm[1];
      const { error } = await sb.from('encontros').upsert({ aluno_id: u.id, n, dados: sanitizarEncontro(b), atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id,n' });
      if (error) throw traduzirErro(error);
      await registrarDia('atividade', 'user_id', u.id);
      return { ok: true };
    }

    if (path === '/api/meu-depois' && m === 'GET') {
      const u = await usuarioLogado();
      const { data } = await sb.from('depois').select('dados').eq('aluno_id', u.id).maybeSingle();
      return (data && data.dados) || { m: '', c: '', a: '' };
    }
    if (path === '/api/meu-depois' && m === 'PUT') {
      const u = await usuarioLogado();
      const { error } = await sb.from('depois').upsert({ aluno_id: u.id, dados: sanitizarDepois(b) });
      if (error) throw traduzirErro(error);
      return { ok: true };
    }

    if (path === '/api/meus-discipulos' && m === 'GET') {
      const u = await usuarioLogado();
      return { discipulos: await discipulosDoDiscipulador(u.id) };
    }

    mm = path.match(/^\/api\/aluno\/([0-9a-f-]+)\/progresso$/);
    if (mm && m === 'GET') { return progressoDe(mm[1]); }

    mm = path.match(/^\/api\/discipulo\/([0-9a-f-]+)\/notas\/(\d+)$/);
    if (mm) {
      const u = await usuarioLogado();
      const [, alunoId, nStr] = mm;
      const n = +nStr;
      if (m === 'GET') {
        const { data } = await sb.from('notas').select('dados').eq('discipulador_id', u.id).eq('aluno_id', alunoId).eq('n', n).maybeSingle();
        return (data && data.dados) || sanitizarNota({});
      }
      if (m === 'PUT') {
        const { error } = await sb.from('notas').upsert({ discipulador_id: u.id, aluno_id: alunoId, n, dados: sanitizarNota(b) });
        if (error) throw traduzirErro(error);
        await registrarDia('atividade_notas', 'discipulador_id', u.id);
        return { ok: true };
      }
    }

    if (path === '/api/relatorio/discipulador' && m === 'GET') {
      const u = await usuarioLogado();
      const p = await perfilDe(u.id);
      if (!(p.papel === 'discipulador' || (p.papel === 'admin' && p.duplo))) throw erro('Apenas discipuladores.', 403);
      const alunos = await discipulosDoDiscipulador(u.id);
      const discipulos = [];
      for (const a of alunos) {
        const met = await metricas(a.id);
        const { data: ns } = await sb.from('notas').select('dados').eq('discipulador_id', u.id).eq('aluno_id', a.id);
        const notas = (ns || []).filter(r => r.dados && Object.values(r.dados).some(v => v && String(v).trim())).length;
        discipulos.push({ ...publico(a), ...met, notas });
      }
      const { data: at } = await sb.from('atividade_notas').select('dia').eq('discipulador_id', u.id);
      const dias = (at || []).map(r => r.dia).sort();
      return { discipulos, minhasNotas: { ultimaAtividade: dias.length ? dias[dias.length - 1] : null, semanas: semanasDe(dias) } };
    }

    if (path === '/api/relatorio/admin' && m === 'GET') {
      const u = await usuarioLogado();
      const p = await perfilDe(u.id);
      if (p.papel !== 'admin') throw erro('Somente o administrador.', 403);
      const { data: perfis } = await sb.from('perfis').select('id,nome,email,papel');
      const { data: des } = await sb.from('designacoes').select('aluno_id,discipulador_id');
      const porId = Object.fromEntries((perfis || []).map(x => [x.id, x]));
      const alunos = [];
      for (const a of (perfis || []).filter(x => x.papel === 'aluno')) {
        const met = await metricas(a.id);
        const dId = ((des || []).find(d => d.aluno_id === a.id) || {}).discipulador_id || null;
        const { encontros, ...resto } = met;
        alunos.push({ id: a.id, nome: a.nome, email: a.email, discipulador: dId && porId[dId] ? porId[dId].nome : null, discipuladorId: dId, ...resto });
      }
      const discipuladores = (perfis || []).filter(x => x.papel === 'discipulador').map(d => {
        const meus = alunos.filter(a => a.discipuladorId === d.id);
        const media = meus.length ? Math.round(meus.reduce((s, a) => s + a.concluidos, 0) / meus.length * 10) / 10 : 0;
        return { id: d.id, nome: d.nome, discipulos: meus.length, mediaConcluidos: media, semAtividade7: meus.filter(a => a.diasAtivos7 === 0).length };
      });
      return { alunos, discipuladores };
    }

    if (path === '/api/admin/usuarios' && m === 'GET') {
      const u = await usuarioLogado();
      const p = await perfilDe(u.id);
      if (p.papel !== 'admin') throw erro('Somente o administrador.', 403);
      const { data: perfis } = await sb.from('perfis').select('id,nome,email,papel');
      const { data: des } = await sb.from('designacoes').select('aluno_id,discipulador_id');
      const { data: conc } = await sb.rpc('status_conclusao');
      const concMap = Object.fromEntries((conc || []).map(c => [c.aluno_id, c.encontros || []]));
      const usuarios = (perfis || []).map(x => ({
        ...publico(x),
        discipuladorId: ((des || []).find(d => d.aluno_id === x.id) || {}).discipulador_id || null,
        concluidos: concMap[x.id] || []
      }));
      return { usuarios };
    }

    if (path === '/api/admin/atribuir' && m === 'POST') {
      const u = await usuarioLogado();
      const p = await perfilDe(u.id);
      if (p.papel !== 'admin') throw erro('Somente o administrador.', 403);
      const { error } = await sb.rpc('designar_discipulador', { p_aluno: b.alunoId, p_disc: b.discipuladorId || null });
      if (error) throw traduzirErro(error);
      return { ok: true };
    }

    if (path === '/api/avisos' && m === 'GET') {
      const u = await usuarioLogado();
      const { data, error } = await sb.from('avisos').select('id,texto,criado_em').eq('destinatario_id', u.id).eq('lido', false).order('criado_em', { ascending: false }).limit(20);
      if (error) throw traduzirErro(error);
      return data || [];
    }
    mm = path.match(/^\/api\/avisos\/(\d+)\/lido$/);
    if (mm && m === 'POST') {
      const { error } = await sb.from('avisos').update({ lido: true }).eq('id', +mm[1]);
      if (error) throw traduzirErro(error);
      return { ok: true };
    }

    if (path === '/api/ativar-acesso' && m === 'POST') {
      const { error } = await sb.rpc('ativar_acesso', { codigo: b.codigo || '' });
      if (error) throw traduzirErro(error);
      return { ok: true, capacidades: { curso: true, conduzir: true, admin: true } };
    }

    throw erro('Rota não encontrada: ' + m + ' ' + path, 404);
  } catch (e) {
    if (e.status) throw e;
    throw traduzirErro(e);
  }
}
