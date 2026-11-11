// Servidor do Manual do Discipulado JNI União. Sem dependências externas (Node 18+).
// Uso: INVITE_CODE=... ADMIN_EMAIL=... node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || ('http://localhost:' + PORT);
const INVITE_CODE = process.env.INVITE_CODE || '';          // código que o ADM fornece ao discipulador
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || '';        // configurar depois
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const DATA_FILE = path.join(__dirname, 'data', 'db.json');
const PUBLIC = path.join(__dirname, 'public');

if (!INVITE_CODE) console.warn('[aviso] INVITE_CODE não definido: cadastro de discipulador ficará bloqueado.');
if (!ADMIN_EMAIL) console.warn('[aviso] ADMIN_EMAIL não definido: ninguém terá perfil de administrador.');

/* ---------- banco (arquivo JSON) ---------- */
// users: id -> {id,nome,email,papel,hash,salt,criado}
// sessions: token -> userId
// assign: alunoId -> discipuladorId
// progress: alunoId -> {n: {bal,txt,perg,dias,reg,quiz,comp,done}}   (visível ao aluno e ao discipulador designado)
// notas: discipuladorId -> alunoId -> {n: {...}}                       (privado do discipulador)
// depois: alunoId -> {m,c,a}
// atividade: alunoId -> ["AAAA-MM-DD", ...] (dias em que o aluno registrou algo; usado nos relatórios)
let db = { users: {}, sessions: {}, assign: {}, progress: {}, notas: {}, depois: {}, atividade: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) { /* primeiro uso */ }
function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const oauthStates = new Map(); // state -> {papel, codigo, t}

/* ---------- utilidades ---------- */
const id = () => crypto.randomBytes(8).toString('hex');
function hashSenha(senha, salt) { return crypto.scryptSync(senha, salt, 64).toString('hex'); }
function publico(u) { return { id: u.id, nome: u.nome, email: u.email, papel: u.papel }; }
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function usuarioAtual(req) {
  const tok = cookies(req).sid;
  const uid = tok && db.sessions[tok];
  return uid ? db.users[uid] : null;
}
function criarSessao(res, userId) {
  const tok = crypto.randomBytes(32).toString('hex');
  db.sessions[tok] = userId;
  persist();
  res.setHeader('Set-Cookie', 'sid=' + tok + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000');
}
function enviar(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) { reject(new Error('corpo grande demais')); req.destroy(); } });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(new Error('JSON inválido')); } });
  });
}
const texto = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const lista = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);

// Sanitiza o progresso de um encontro enviado pelo aluno
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
function registrarAtividade(uid) {
  const d = new Date().toISOString().slice(0, 10);
  const a = db.atividade[uid] || [];
  if (!a.includes(d)) a.push(d);
  db.atividade[uid] = a.slice(-90);
}
// Métricas de atividade: só números e datas, nunca respostas ou registro
function metricasAluno(alunoId) {
  const prog = db.progress[alunoId] || {};
  const dias7 = new Set();
  const hoje = Date.now();
  (db.atividade[alunoId] || []).forEach(d => { if (hoje - new Date(d).getTime() <= 7 * 864e5) dias7.add(d); });
  const encontros = [];
  let concluidos = 0, dias = 0, respostas = 0, registros = 0;
  for (let n = 1; n <= 10; n++) {
    const e = prog[n];
    if (!e) { encontros.push({ n, done: false, dias: 0, respostas: 0, registros: 0, balizas: 0, textos: 0 }); continue; }
    const r = {
      n, done: !!e.done,
      dias: (e.dias || []).filter(Boolean).length,
      respostas: Object.values(e.perg || {}).filter(v => v && v.trim()).length,
      registros: (e.reg || []).filter(row => row.some(c => c && c.trim())).length,
      balizas: (e.bal || []).filter(Boolean).length,
      textos: (e.txt || []).filter(Boolean).length
    };
    if (r.done) concluidos++;
    dias += r.dias; respostas += r.respostas; registros += r.registros;
    encontros.push(r);
  }
  const ultima = (db.atividade[alunoId] || []).slice(-1)[0] || null;
  return { ultimaAtividade: ultima, diasAtivos7: dias7.size, concluidos, dias, respostas, registros, encontros };
}
function notasPreenchidas(discId, alunoId) {
  const n = (db.notas[discId] || {})[alunoId] || {};
  return Object.values(n).filter(x => x && Object.values(x).some(v => v && v.trim())).length;
}
function discipulosDe(discId) {
  return Object.keys(db.assign).filter(a => db.assign[a] === discId).map(a => db.users[a]).filter(Boolean).map(publico);
}
function podeVerAluno(user, alunoId) {
  if (!user) return false;
  if (user.id === alunoId) return true;                          // o próprio aluno
  return user.papel === 'discipulador' && db.assign[alunoId] === user.id; // discipulador designado
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;
  const user = usuarioAtual(req);

  if (p === '/api/config' && m === 'GET') return enviar(res, 200, { googleAtivo: !!GOOGLE_ID, conviteConfigurado: !!INVITE_CODE });

  if (p === '/api/register' && m === 'POST') {
    const b = await lerCorpo(req);
    const nome = texto(b.nome, 120).trim(), email = texto(b.email, 200).trim().toLowerCase(), senha = texto(b.senha, 200);
    let papel = b.papel === 'discipulador' ? 'discipulador' : 'aluno';
    if (!nome || !email.includes('@') || senha.length < 6) return enviar(res, 400, { erro: 'Preencha nome, e-mail válido e senha com 6+ caracteres.' });
    if (papel === 'discipulador' && (!INVITE_CODE || texto(b.codigo, 100) !== INVITE_CODE)) return enviar(res, 403, { erro: 'Código de discipulador inválido. Peça o código à liderança.' });
    if (ADMIN_EMAIL && email === ADMIN_EMAIL) papel = 'admin';
    if (Object.values(db.users).some(u => u.email === email)) return enviar(res, 409, { erro: 'Já existe uma conta com este e-mail.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { id: id(), nome, email, papel, salt, hash: hashSenha(senha, salt), criado: new Date().toISOString() };
    db.users[u.id] = u; criarSessao(res, u.id); persist();
    return enviar(res, 200, { usuario: publico(u) });
  }

  if (p === '/api/login' && m === 'POST') {
    const b = await lerCorpo(req);
    const email = texto(b.email, 200).trim().toLowerCase(), senha = texto(b.senha, 200);
    const u = Object.values(db.users).find(x => x.email === email);
    if (!u || !u.hash || hashSenha(senha, u.salt) !== u.hash) return enviar(res, 401, { erro: 'E-mail ou senha incorretos.' });
    criarSessao(res, u.id);
    return enviar(res, 200, { usuario: publico(u) });
  }

  if (p === '/api/logout' && m === 'POST') {
    const tok = cookies(req).sid; if (tok) { delete db.sessions[tok]; persist(); }
    res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/; HttpOnly');
    return enviar(res, 200, { ok: true });
  }

  if (p === '/api/me' && m === 'GET') {
    if (!user) return enviar(res, 401, { erro: 'não autenticado' });
    const info = { usuario: publico(user) };
    if (user.papel === 'aluno') {
      const dId = db.assign[user.id];
      info.discipulador = dId && db.users[dId] ? publico(db.users[dId]) : null;
    }
    return enviar(res, 200, info);
  }

  if (!user) return enviar(res, 401, { erro: 'Entre na sua conta para continuar.' });

  // Aluno: o próprio progresso
  if (p === '/api/meu-progresso' && m === 'GET') return enviar(res, 200, db.progress[user.id] || {});
  const mp = p.match(/^\/api\/meu-progresso\/(\d+)$/);
  if (mp && m === 'PUT') {
    if (user.papel !== 'aluno') return enviar(res, 403, { erro: 'Somente alunos preenchem o próprio registro.' });
    const n = +mp[1]; if (n < 1 || n > 10) return enviar(res, 400, { erro: 'encontro inválido' });
    const b = await lerCorpo(req);
    db.progress[user.id] = db.progress[user.id] || {};
    db.progress[user.id][n] = sanitizarEncontro(b);
    registrarAtividade(user.id);
    persist();
    return enviar(res, 200, { ok: true });
  }

  if (p === '/api/meu-depois' && m === 'GET') return enviar(res, 200, db.depois[user.id] || { m: '', c: '', a: '' });
  if (p === '/api/meu-depois' && m === 'PUT') {
    const b = await lerCorpo(req);
    db.depois[user.id] = { m: texto(b.m), c: texto(b.c), a: texto(b.a) };
    registrarAtividade(user.id); persist();
    return enviar(res, 200, { ok: true });
  }

  // Discipulador: lista dos seus discípulos
  if (p === '/api/meus-discipulos' && m === 'GET') {
    if (user.papel !== 'discipulador') return enviar(res, 403, { erro: 'Apenas discipuladores.' });
    return enviar(res, 200, { discipulos: discipulosDe(user.id) });
  }

  // Registro de um aluno: visível só ao próprio aluno e ao discipulador designado
  const mal = p.match(/^\/api\/aluno\/([a-f0-9]+)\/progresso$/);
  if (mal && m === 'GET') {
    if (!podeVerAluno(user, mal[1])) return enviar(res, 403, { erro: 'Este registro é privado.' });
    return enviar(res, 200, db.progress[mal[1]] || {});
  }

  // Notas privadas do discipulador sobre um aluno seu
  const mnotas = p.match(/^\/api\/discipulo\/([a-f0-9]+)\/notas\/(\d+)$/);
  if (mnotas) {
    if (user.papel !== 'discipulador' || db.assign[mnotas[1]] !== user.id) return enviar(res, 403, { erro: 'Notas privadas do discipulador.' });
    const n = +mnotas[2];
    if (m === 'GET') return enviar(res, 200, ((db.notas[user.id] || {})[mnotas[1]] || {})[n] || sanitizarNota({}));
    if (m === 'PUT') {
      const b = await lerCorpo(req);
      db.notas[user.id] = db.notas[user.id] || {};
      db.notas[user.id][mnotas[1]] = db.notas[user.id][mnotas[1]] || {};
      db.notas[user.id][mnotas[1]][n] = sanitizarNota(b);
      persist();
      return enviar(res, 200, { ok: true });
    }
  }

  // Relatório do discipulador: atividades dos seus discípulos (registro completo, pois ele é designado)
  if (p === '/api/relatorio/discipulador' && m === 'GET') {
    if (user.papel !== 'discipulador') return enviar(res, 403, { erro: 'Apenas discipuladores.' });
    const discipulos = discipulosDe(user.id).map(d => {
      const met = metricasAluno(d.id);
      return { ...d, ...met, notas: notasPreenchidas(user.id, d.id) };
    });
    return enviar(res, 200, { discipulos });
  }

  // Relatório do administrador: só números e datas, sem respostas nem registro
  if (p === '/api/relatorio/admin' && m === 'GET') {
    if (user.papel !== 'admin') return enviar(res, 403, { erro: 'Somente o administrador.' });
    const alunos = Object.values(db.users).filter(u => u.papel === 'aluno').map(u => {
      const d = db.assign[u.id] ? db.users[db.assign[u.id]] : null;
      const { encontros, ...met } = metricasAluno(u.id);
      return { id: u.id, nome: u.nome, email: u.email, discipulador: d ? d.nome : null, ...met };
    });
    const discipuladores = Object.values(db.users).filter(u => u.papel === 'discipulador').map(d => {
      const meus = alunos.filter(a => a.discipulador === d.nome);
      const media = meus.length ? Math.round(meus.reduce((s, a) => s + a.concluidos, 0) / meus.length * 10) / 10 : 0;
      const semAtividade = meus.filter(a => a.diasAtivos7 === 0).length;
      return { id: d.id, nome: d.nome, discipulos: meus.length, mediaConcluidos: media, semAtividade7: semAtividade };
    });
    return enviar(res, 200, { alunos, discipuladores });
  }

  // Administrador
  if (p === '/api/admin/usuarios' && m === 'GET') {
    if (user.papel !== 'admin') return enviar(res, 403, { erro: 'Somente o administrador.' });
    // Só o status de conclusão de cada encontro; nunca respostas ou registro
    const lista2 = Object.values(db.users).map(u => {
      const prog = db.progress[u.id] || {};
      const concluidos = Object.keys(prog).filter(n => prog[n] && prog[n].done).map(Number).sort((a, b) => a - b);
      return { ...publico(u), discipuladorId: db.assign[u.id] || null, concluidos };
    });
    return enviar(res, 200, { usuarios: lista2 });
  }
  if (p === '/api/admin/atribuir' && m === 'POST') {
    if (user.papel !== 'admin') return enviar(res, 403, { erro: 'Somente o administrador.' });
    const b = await lerCorpo(req);
    const a = db.users[b.alunoId], d = db.users[b.discipuladorId];
    if (!a || a.papel !== 'aluno') return enviar(res, 400, { erro: 'aluno inválido' });
    if (b.discipuladorId && (!d || d.papel !== 'discipulador')) return enviar(res, 400, { erro: 'discipulador inválido' });
    if (b.discipuladorId) db.assign[a.id] = d.id; else delete db.assign[a.id];
    persist();
    return enviar(res, 200, { ok: true });
  }

  return enviar(res, 404, { erro: 'rota não encontrada' });
}

/* ---------- Login com Google (ativo quando GOOGLE_CLIENT_ID estiver configurado) ---------- */
function redirect(res, loc) { res.writeHead(302, { Location: loc }); res.end(); }
async function googleStart(req, res, url) {
  if (!GOOGLE_ID) return enviar(res, 503, { erro: 'Login com Google ainda não configurado.' });
  const papel = url.searchParams.get('papel') === 'discipulador' ? 'discipulador' : 'aluno';
  const codigo = url.searchParams.get('codigo') || '';
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { papel, codigo, t: Date.now() });
  const q = new URLSearchParams({ client_id: GOOGLE_ID, redirect_uri: BASE_URL + '/auth/google/callback', response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  return redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString());
}
async function googleCallback(req, res, url) {
  const st = oauthStates.get(url.searchParams.get('state'));
  oauthStates.delete(url.searchParams.get('state'));
  if (!st || !url.searchParams.get('code')) return redirect(res, '/#login-erro');
  try {
    const tk = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: url.searchParams.get('code'), client_id: GOOGLE_ID, client_secret: GOOGLE_SECRET, redirect_uri: BASE_URL + '/auth/google/callback', grant_type: 'authorization_code' })
    }).then(r => r.json());
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tk.access_token } }).then(r => r.json());
    const email = (info.email || '').toLowerCase();
    if (!email) return redirect(res, '/#login-erro');
    let u = Object.values(db.users).find(x => x.email === email);
    if (!u) {
      let papel = st.papel;
      if (papel === 'discipulador' && (!INVITE_CODE || st.codigo !== INVITE_CODE)) return redirect(res, '/#login-codigo');
      if (ADMIN_EMAIL && email === ADMIN_EMAIL) papel = 'admin';
      u = { id: id(), nome: info.name || email, email, papel, criado: new Date().toISOString() };
      db.users[u.id] = u;
    }
    criarSessao(res, u.id);
    return redirect(res, '/#home');
  } catch (e) {
    return redirect(res, '/#login-erro');
  }
}

/* ---------- arquivos estáticos e roteamento ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, BASE_URL);
    if (url.pathname === '/auth/google') return await googleStart(req, res, url);
    if (url.pathname === '/auth/google/callback') return await googleCallback(req, res, url);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    const full = path.normalize(path.join(PUBLIC, file));
    if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); return res.end('não encontrado'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    enviar(res, 500, { erro: 'erro interno' });
  }
});
server.listen(PORT, () => console.log('Manual do Discipulado em http://localhost:' + PORT));
