/* Interface do Manual do Discipulado JNI União.
   Dados do registro ficam no servidor. Só o próprio aluno e o discipulador designado veem o registro. */

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHEV = '<svg class="chev" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 30 32 6l26 24v8L32 14 6 38z" fill="currentColor" stroke="#0b1020" stroke-width="3" stroke-linejoin="round"/><path d="M6 54 32 30l26 24v8L32 38 6 62z" fill="currentColor" stroke="#0b1020" stroke-width="3" stroke-linejoin="round"/></svg>';
const PAPEL = { aluno: 'Discípulo', discipulador: 'Discipulador', admin: 'Administração' };

const S = { me: null, discipulador: null, prog: {}, depois: null, discipulos: [], cfg: {}, authTab: 'entrar', papelCad: 'aluno', codigoCad: '', alunoProg: {}, notas: {}, usuarios: [], caps: {}, modo: null, progOk: false };
const MODOS = { aluno: 'Discípulo', discipulador: 'Discipulador', admin: 'Administração' };
const DEF = () => ({ bal: [false, false, false], txt: [false, false, false], perg: {}, dias: [false, false, false, false, false], reg: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']], quiz: -1, comp: '', done: false });
const encOf = (src, n) => Object.assign(DEF(), (src && src[n]) || {});
const timers = {};

function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => el.style.display = 'none', 2200); }
function debounceSave(key, fn, ms = 500) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }

/* ---------- carregamento ---------- */
async function carregarMe() {
  S.progOk = false; S.prog = {};
  try {
    const me = await api('/api/me');
    S.me = me.usuario; S.pendente = !!me.pendente; S.discipulador = me.discipulador || null; S.caps = me.capacidades || {};
  } catch (e) { S.me = null; S.caps = {}; }
}
// Modos disponíveis conforme a conta: discípulo (curso), discipulador (conduzir) e administração
function modosDisponiveis() {
  if (!S.me) return [];
  const m = [];
  if (S.caps.curso) m.push('aluno');
  if (S.caps.conduzir) m.push('discipulador');
  if (S.caps.admin) m.push('admin');
  return m;
}
function papelAtivo() {
  const m = modosDisponiveis();
  if (!m.length) return null;
  if (S.modo && m.includes(S.modo)) return S.modo;
  if (S.me.papel === 'admin') return 'admin';
  return m.includes('discipulador') ? 'discipulador' : m[0];
}
function modoBar(P) {
  return '<div class="tabs modo">' + modosDisponiveis().map(m => '<button class="' + (m === P ? 'on' : '') + '" data-act="modo" data-v="' + m + '">' + MODOS[m] + '</button>').join('') + '</div>';
}
function avisosHTML(lista) {
  if (!lista.length) return '';
  return '<div class="sec">' + CHEV + '<h2>Avisos</h2></div>' + lista.map(a =>
    '<div class="card aviso"><div><b>' + esc(a.texto) + '</b><p class="note" style="margin:4px 0 0">' + dataBR(a.criado_em.slice(0, 10)) + '</p></div>' +
    '<button class="btn ghost" data-act="aviso-ok" data-id="' + a.id + '">Entendi</button></div>').join('');
}
function semanasHTML(arr) {
  const s = arr || [0, 0, 0, 0, 0, 0, 0, 0];
  return '<div class="semanas" role="img" aria-label="Dias ativos nas últimas 8 semanas">' + s.map((v, i) =>
    '<i class="' + (v ? '' : 'zero') + '" style="height:' + (4 + Math.round(v / 7 * 48)) + 'px" title="Semana ' + (i + 1) + ': ' + v + ' dia(s)"></i>').join('')
    + '</div><p class="note" style="margin:2px 0 0;font-size:12px">Dias ativos nas últimas 8 semanas (a barra da direita é a mais recente; máximo 7 por semana).</p>';
}
async function carregarAluno(id) {
  S.alunoProg = await api('/api/aluno/' + id + '/progresso').catch(() => ({}));
}

/* ---------- rotas ---------- */
async function route(keep) {
  const y = window.scrollY;
  const h = (location.hash || '#home').slice(1);
  const P = papelAtivo();
  let html = '', side = '';
  try {
    if (P === 'aluno' && !S.progOk) { S.prog = await api('/api/meu-progresso').catch(() => ({})); S.progOk = true; }
    if (P === 'discipulador' && !S.discipulos.length) {
      S.discipulos = (await api('/api/meus-discipulos').catch(() => ({ discipulos: [] }))).discipulos;
    }
    if (!S.me) {
      html = viewLogin(h);
    } else if (S.pendente) {
      html = viewEscolher();
    } else if (P === 'admin') {
      html = await viewAdmin(); side = sideAdmin();
    } else if (/^enc-\d+$/.test(h)) {
      const n = +h.slice(4);
      if (n >= 1 && n <= 10) {
        if (P === 'aluno') { html = viewEncAluno(n); side = sideAluno('enc-' + n); }
        else { html = viewEncDisc(n); side = sideDisc(h); }
      }
    } else if (/^d-[a-f0-9]+-\d+$/.test(h) && P === 'discipulador') {
      const [, id, n] = h.match(/^d-([a-f0-9]+)-(\d+)$/);
      await carregarAluno(id);
      S.notas[id + '-' + n] = await api('/api/discipulo/' + id + '/notas/' + n).catch(() => ({}));
      html = viewDiscAluno(id, +n); side = sideDisc(h);
    } else if (/^d-[a-f0-9]+$/.test(h) && P === 'discipulador') {
      const id = h.slice(2);
      await carregarAluno(id);
      html = viewDiscAlunoOverview(id); side = sideDisc(h);
    } else if (h === 'relatorio' && P === 'discipulador') {
      html = await viewRelatorioDisc(); side = sideDisc(h);
    } else if (h === 'avaliacao' && P === 'discipulador') {
      html = viewAval(); side = sideDisc(h);
    } else if (h === 'depois' && P === 'aluno') {
      S.depois = await api('/api/meu-depois').catch(() => ({ m: '', c: '', a: '' })); html = viewDepois(); side = sideAluno('depois');
    } else {
      html = P === 'aluno' ? viewHomeAluno() : await viewHomeDisc();
      side = P === 'aluno' ? sideAluno('home') : sideDisc('home');
    }
    if (S.me && P !== 'admin' && (h === 'home' || h === '')) {
      const avisos = await api('/api/avisos').catch(() => []);
      html = avisosHTML(avisos) + html;
    }
    if (S.me && modosDisponiveis().length > 1) html = modoBar(P) + html;
  } catch (e) {
    html = '<div class="erro">' + esc(e.message) + '</div>';
  }
  $('#app').innerHTML = html;
  $('#side').innerHTML = side;
  $('#side').style.display = S.me ? '' : 'none';
  $('#layout').style.gridTemplateColumns = S.me ? '' : '1fr';
  $('#who').innerHTML = S.me
    ? '<b class="nome">' + esc(S.me.nome) + '</b><span class="papel">' + PAPEL[P || S.me.papel] + '</span><button class="btn ghost" data-act="sair">Sair</button>'
    : '';
  if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => route(false));

/* ---------- menus laterais ---------- */
function sideAluno(cur) {
  const blocos = [['Conhecendo Jesus', [1, 2, 3]], ['Caminhando com Jesus', [4, 5, 6, 7]], ['Vivendo como Jesus', [8, 9, 10]]];
  let h = '<a href="#home" class="' + (cur === 'home' ? 'on' : '') + '"><span class="num" style="background:#fff;border:2px solid var(--navy)">⌂</span>Início</a>';
  blocos.forEach(([nome, ns]) => {
    h += '<h4>' + nome + '</h4>';
    ns.forEach(n => {
      const e = S.prog[n] || {};
      h += '<a href="#enc-' + n + '" class="' + (cur === 'enc-' + n ? 'on' : '') + '"><span class="num" style="background:' + BLOCOS[n][1] + '">' + n + '</span>' + esc(ENC[n - 1].t) + (e.done ? '<span class="ok">✓</span>' : '') + '</a>';
    });
  });
  h += '<h4>Ferramentas</h4><a href="#depois" class="' + (cur === 'depois' ? 'on' : '') + '"><span class="num" style="background:var(--navy);color:#fff">→</span>Depois do décimo</a>';
  return h;
}
function sideDisc(cur) {
  let h = '<a href="#home" class="' + (cur === 'home' ? 'on' : '') + '"><span class="num" style="background:#fff;border:2px solid var(--navy)">⌂</span>Início</a>';
  h += '<h4>Meus discípulos</h4>';
  if (!S.discipulos.length) h += '<p class="note" style="padding:0 8px">Nenhum discípulo designado ainda.</p>';
  S.discipulos.forEach(d => { h += '<a href="#d-' + d.id + '" class="' + (cur.startsWith('d-' + d.id) ? 'on' : '') + '"><span class="num" style="background:var(--cy)">' + esc(d.nome[0]) + '</span>' + esc(d.nome) + '</a>'; });
  h += '<h4>Manual</h4>';
  [['Conhecendo Jesus', [1, 2, 3]], ['Caminhando com Jesus', [4, 5, 6, 7]], ['Vivendo como Jesus', [8, 9, 10]]].forEach(([nome, ns]) => {
    h += '<p class="note" style="margin:6px 8px 0;font-weight:700">' + nome + '</p>';
    ns.forEach(n => { h += '<a href="#enc-' + n + '" class="' + (cur === 'enc-' + n ? 'on' : '') + '"><span class="num" style="background:' + BLOCOS[n][1] + '">' + n + '</span>' + esc(ENC[n - 1].t) + '</a>'; });
  });
  h += '<h4>Ferramentas</h4><a href="#relatorio" class="' + (cur === 'relatorio' ? 'on' : '') + '"><span class="num" style="background:var(--bl);color:#fff">▤</span>Relatórios</a>';
  h += '<a href="#avaliacao" class="' + (cur === 'avaliacao' ? 'on' : '') + '"><span class="num" style="background:var(--mar);color:#fff">!</span>Avaliação pastoral</a>';
  return h;
}
function sideAdmin() { return '<a href="#admin" class="on"><span class="num" style="background:var(--or);color:#fff">A</span>Administração</a>'; }

/* ---------- login ---------- */
// Conta criada pelo Google: a pessoa escolhe o caminho uma única vez
function viewEscolher() {
  const p = S.papelEsc || 'aluno';
  return `
  <section class="login">
    <div class="card" style="padding:26px">
      ${CHEV}
      <h1>Bem-vindo${S.me && S.me.nome ? ', ' + esc(S.me.nome.split(' ')[0]) : ''}!</h1>
      <p class="muted">Antes de começar, diga qual é o seu caminho. Essa escolha é feita uma única vez.</p>
      <div class="tabs">
        <button class="tab ${p === 'aluno' ? 'on' : ''}" data-act="papel-esc" data-v="aluno">Discípulo</button>
        <button class="tab ${p === 'discipulador' ? 'on' : ''}" data-act="papel-esc" data-v="discipulador">Discipulador</button>
      </div>
      ${p === 'discipulador' ? `<label>Código de discipulador<input id="cod-esc" autocomplete="off"></label>` : ''}
      <div id="erro-esc" class="erro"></div>
      <button class="btn" data-act="confirmar-papel">Continuar</button>
    </div>
  </section>`;
}

function viewLogin(h) {
  const erro = h === 'login-erro' ? 'Não foi possível entrar com Google. Tente de novo ou use e-mail e senha.'
    : h === 'login-codigo' ? 'Código de discipulador inválido. Peça o código à liderança.' : '';
  const cad = S.authTab === 'cadastro';
  const papel = S.papelCad;
  const gHref = '/auth/google?papel=' + papel + (papel === 'discipulador' ? '&codigo=' + encodeURIComponent(S.codigoCad || '') : '');
  return `
  <section class="login">
    <div class="card" style="padding:26px">
      ${CHEV.replace('class="chev"', 'class="chev"')}
      <h1 class="disp" style="font-size:2rem">Manual do Discipulado</h1>
      <p class="note">Acompanhamento individual da JNI União</p>
      ${erro ? '<div class="erro">' + esc(erro) + '</div>' : ''}
      <div class="tabs">
        <button class="${!cad ? 'on' : ''}" data-act="tab" data-v="entrar">Entrar</button>
        <button class="${cad ? 'on' : ''}" data-act="tab" data-v="cadastro">Criar conta</button>
      </div>
      ${cad ? formCadastro(papel) : formEntrar()}
      <div class="sep">ou</div>
      <a class="gbtn" href="${gHref}" ${S.cfg.googleAtivo ? '' : 'aria-disabled="true"'}>Continuar com Google</a>
      ${S.cfg.googleAtivo ? '' : '<p class="note" style="text-align:center">O login com Google será ativado quando as chaves forem configuradas.</p>'}
      <div id="msgAuth"></div>
    </div>
  </section>`;
}
function formEntrar() {
  return `<form id="fEntrar">
    <div class="field"><label for="le">E-mail</label><input id="le" type="email" name="email" required autocomplete="email"></div>
    <div class="field"><label for="ls">Senha</label><input id="ls" type="password" name="senha" required autocomplete="current-password"></div>
    <button class="btn" style="width:100%;margin-top:6px">Entrar</button>
  </form>`;
}
function formCadastro(papel) {
  return `<form id="fCadastro">
    <div class="field"><label for="cn">Nome</label><input id="cn" type="text" name="nome" required></div>
    <div class="field"><label for="ce">E-mail</label><input id="ce" type="email" name="email" required autocomplete="email"></div>
    <div class="field"><label for="cs">Senha (mínimo 6 caracteres)</label><input id="cs" type="password" name="senha" minlength="6" required autocomplete="new-password"></div>
    <div class="field"><label>Eu sou</label>
      <div class="radios">
        <label class="${papel === 'aluno' ? 'on' : ''}"><input type="radio" name="papel" value="aluno" data-act="papel" data-v="aluno" ${papel === 'aluno' ? 'checked' : ''} style="display:none">Discípulo</label>
        <label class="${papel === 'discipulador' ? 'on' : ''}"><input type="radio" name="papel" value="discipulador" data-act="papel" data-v="discipulador" ${papel === 'discipulador' ? 'checked' : ''} style="display:none">Discipulador</label>
      </div>
    </div>
    ${papel === 'discipulador' ? `<div class="field"><label for="cc">Código de discipulador</label><input id="cc" type="text" name="codigo" required value="${esc(S.codigoCad)}"><p class="hint">Peça o código à liderança. Sem ele não é possível criar conta de discipulador.</p></div>` : ''}
    <button class="btn" style="width:100%;margin-top:6px">Criar conta</button>
  </form>`;
}

/* ---------- página inicial ---------- */
function mapaAluno() {
  return '<div class="map">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
    const e = S.prog[n] || {};
    const pct = e.done ? 100 : Math.round((((e.bal || []).filter(Boolean).length) + ((e.dias || []).filter(Boolean).length)) / 8 * 100);
    return '<a class="mapcard" href="#enc-' + n + '"><span class="num" style="background:' + BLOCOS[n][1] + ';width:34px;height:34px;font-size:1rem">' + n + '</span><div style="flex:1"><b>' + esc(ENC[n - 1].t) + '</b><small>' + BLOCOS[n][0] + ' · ' + (e.done ? 'concluído' : pct + '% do caminho') + '</small></div></a>';
  }).join('') + '</div>';
}
function viewHomeAluno() {
  const d = S.discipulador;
  return `
  <section class="hero">
    ${CHEV}
    <div class="tag">Em formação</div>
    <h1>Olá, ${esc(S.me.nome.split(' ')[0])}</h1>
    <p>10 encontros individuais para uma fé vivida.</p>
    <div class="blocks">
      <div style="border-color:var(--cy)"><b>Conhecendo Jesus</b>Encontros 1 a 3</div>
      <div style="border-color:var(--bl)"><b>Caminhando com Jesus</b>Encontros 4 a 7</div>
      <div style="border-color:var(--or)"><b>Vivendo como Jesus</b>Encontros 8 a 10</div>
    </div>
  </section>
  <div class="card" style="margin-top:14px"><b>Seu discipulador</b>
    <p style="margin:6px 0 0">${d ? esc(d.nome) + ' acompanha você nesta caminhada.' : 'Ainda não há um discipulador designado para você. A liderança fará essa indicação.'}</p>
  </div>
  <div class="card"><p style="margin:0">Você não vai fazer uma aula. Cada encontro tem três balizas que mostram por onde a conversa vai passar. Leia os textos em voz alta, escreva suas respostas, faça o desafio da semana e traga o que viveu para o próximo encontro.</p>
    <p class="note" style="margin:10px 0 0">Suas anotações são visíveis só para você e para o seu discipulador designado.</p></div>
  <div class="sec">${CHEV}<h2>Seu caminho</h2></div>
  ${mapaAluno()}`;
}
function painelDiscipulo(d) {
  return '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>' + esc(d.nome) + '</b><a href="#d-' + d.id + '" style="font-weight:700">Acompanhar →</a></div>' +
    '<p class="note" style="margin:4px 0 8px">' + statusAtividade(d.ultimaAtividade, d.diasAtivos7) + ' · última: ' + dataBR(d.ultimaAtividade) + '</p>' +
    '<p style="margin:0 0 6px"><b>Encontros concluídos</b></p>' + barraProg(d.concluidos) +
    '<div style="margin-top:12px">' + matrizEncontros(d.encontros) + '</div>' +
    '<p style="margin:14px 0 6px"><b>Atividade nas últimas 8 semanas</b></p>' + semanasHTML(d.semanas) + '</div>';
}
async function viewHomeDisc() {
  const r = await api('/api/relatorio/discipulador').catch(() => ({ discipulos: [] }));
  S.discipulos = r.discipulos;
  const lista = S.discipulos.length
    ? S.discipulos.map(painelDiscipulo).join('')
    : '<p class="note">Nenhum discípulo designado ainda. A liderança faz essa indicação.</p>';
  return `
  <section class="hero">
    ${CHEV}
    <div class="tag">Discipulador</div>
    <h1>Conduzir é viver junto</h1>
    <p>Você conduz conversas, não dá aulas. Sua vida com Deus e sua presença são o primeiro material que o discípulo vê.</p>
  </section>
  <div class="sec">${CHEV}<h2>Três pilares</h2></div>
  ${PILARES_DISC.map(p => '<div class="card"><b>' + esc(p[0]) + '</b><p style="margin:6px 0 0">' + esc(p[1]) + '</p></div>').join('')}
  <div class="sec">${CHEV}<h2>Progresso dos meus discípulos</h2></div>
  ${lista}
  <div class="sec">${CHEV}<h2>Manual</h2></div>
  <div class="map">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => '<a class="mapcard" href="#enc-' + n + '"><span class="num" style="background:' + BLOCOS[n][1] + ';width:34px;height:34px;font-size:1rem">' + n + '</span><div style="flex:1"><b>' + esc(ENC[n - 1].t) + '</b><small>Como conduzir este encontro</small></div></a>').join('')}</div>`;
}

/* ---------- blocos de conteúdo ---------- */
function blocoConteudo(c, n, e, modo) {
  // modo: 'aluno' (editável), 'leitura' (respostas do aluno, sem edição), 'modelo' (sem respostas)
  const edit = modo === 'aluno';
  const bal = c.bal.map((b, i) => edit
    ? '<label class="check ' + (e.bal[i] ? 'on' : '') + '"><input type="checkbox" data-act="bal" data-i="' + i + '" ' + (e.bal[i] ? 'checked' : '') + '><span>' + esc(b) + '</span></label>'
    : '<div class="check"><span>' + esc(b) + '</span></div>').join('');
  const txt = c.txt.map((t, i) => '<a class="verse ' + (e.txt[i] ? 'on' : '') + '" href="' + linkVersiculo(t) + '" target="_blank" rel="noopener" ' + (edit ? 'data-act="lido" data-i="' + i + '"' : '') + '>' + esc(t) + ' <small>NVI ↗</small></a>').join('');
  const perg = c.perg.map((p, i) => edit
    ? '<div class="perg"><label for="p' + i + '">' + (i + 1) + '. ' + esc(p) + '</label><textarea id="p' + i + '" data-field="perg" data-i="' + i + '" placeholder="Escreva sua resposta…">' + esc(e.perg[i] || '') + '</textarea></div>'
    : '<div class="perg"><b>' + (i + 1) + '. ' + esc(p) + '</b><div class="check" style="min-height:40px">' + (modo === 'leitura' ? (esc(e.perg[i] || '') || '<span class="note">Sem resposta ainda.</span>') : '<span class="note">Pergunta para a conversa</span>') + '</div></div>').join('');
  const reg = modo === 'modelo' ? '' : (edit
    ? '<div class="card" style="padding:8px"><table><thead><tr>' + regHead().map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + e.reg.map((r, i) => '<tr>' + r.map((v, j) => '<td><input data-field="reg" data-i="' + i + '" data-j="' + j + '" value="' + esc(v) + '"></td>').join('') + '</tr>').join('') + '</tbody></table></div>'
    : '<div class="card" style="padding:8px"><table><thead><tr>' + regHead().map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + e.reg.map(r => '<tr>' + r.map(v => '<td style="padding:9px">' + (esc(v) || '&nbsp;') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
  const dias = modo === 'modelo' ? '' : (edit
    ? '<div class="dias" style="margin-top:10px">' + e.dias.map((d, i) => '<button class="dia ' + (d ? 'on' : '') + '" data-act="dia" data-i="' + i + '">Dia ' + (i + 1) + '</button>').join('') + '</div><p class="hint">' + e.dias.filter(Boolean).length + '/5 dias</p>'
    : '<p class="hint">' + e.dias.filter(Boolean).length + '/5 dias praticados</p>');
  const comp = modo === 'modelo' ? '' : (edit
    ? '<div class="field"><label for="comp">Compromisso combinado</label><textarea id="comp" data-field="comp" placeholder="O que vocês combinaram para esta semana?">' + esc(e.comp) + '</textarea></div>'
    : '<div class="field"><b>Compromisso combinado</b><div class="check" style="min-height:40px">' + (esc(e.comp) || '<span class="note">Ainda não há compromisso registrado.</span>') + '</div></div>');
  const quiz = (edit) ? quizHTML(n, e) : '';
  return `
  <div class="sec">${CHEV}<h2>Conversa</h2></div>
  <div class="card">
    <b>Balizas da conversa</b><p class="hint">${edit ? 'Marque cada baliza quando a conversa passar por ela.' : 'Os marcos do encontro.'}</p>
    ${bal}
    <div class="abrir" style="margin-top:12px"><b style="font-style:normal">Para abrir a conversa:</b><br>${esc(c.abrir)}</div>
  </div>
  <div class="card">
    <b>Textos bíblicos da conversa</b>
    <p class="hint">Toque em um texto para abrir a Nova Versão Internacional (NVI) no app YouVersion, no versículo indicado. ${edit ? 'Depois de ler em voz alta, o texto fica marcado.' : ''}</p>
    <div class="chips">${txt}</div>
    <div class="obs"><b style="font-style:normal">Pergunta de observação:</b> ${esc(c.obs)}</div>
  </div>
  <div class="espirito"><h3>Espírito Santo neste encontro</h3><p>${esc(c.es)}</p></div>
  <div class="sec">${CHEV}<h2>Doutrina em diálogo</h2></div>
  <div class="grid2">
    <div class="nucleo"><h3>Núcleo teológico</h3><p>${esc(c.nuc)}</p></div>
    <div class="naz"><h3>Conexão com a doutrina nazarena</h3><p>${esc(c.naz)}</p></div>
  </div>
  <details><summary>Aprofundamento teológico</summary><p>${esc(c.aprof)}</p></details>
  <div class="sec">${CHEV}<h2>${edit ? 'Perguntas para a conversa' : 'Perguntas e respostas'}</h2></div>
  <div class="card">${perg}</div>
  ${quiz ? '<div class="sec">' + CHEV + '<h2>Verifique o entendimento</h2></div>' + quiz : ''}
  <div class="sec">${CHEV}<h2>Desafio da semana</h2></div>
  <div class="desafio"><h3>Seu desafio</h3><p>${esc(c.des)}</p></div>
  ${modo === 'modelo' ? '' : '<div class="card"><b>Dias praticados</b>' + dias + '</div>'}
  <div class="sec">${CHEV}<h2>${modo === 'aluno' ? 'Registro do discípulo' : 'Registro do discípulo'}</h2></div>
  ${reg}
  <div class="sec">${CHEV}<h2>Mensagem de meio de semana</h2></div>
  <div class="msg"><p>“${esc(c.msg)}”</p><button class="btn ghost" data-act="copy" data-msg="${esc(c.msg)}">Copiar mensagem</button></div>
  ${modo === 'modelo' ? '' : '<div class="sec">' + CHEV + '<h2>Oração e compromisso</h2></div><div class="card">' + comp + '</div>'}`;
}
function regHead() { return ['Data', 'O que percebi em Deus', 'O que pratiquei', 'Próximo passo']; }
function quizHTML(n, e) {
  const q = ENC[n - 1].quiz;
  const opts = q[1].map((o, i) => {
    let cls = '';
    if (e.quiz >= 0) { if (i === q[2]) cls = 'right'; else if (i === e.quiz) cls = 'wrong'; }
    return '<label class="' + cls + '"><input type="radio" name="q' + n + '" data-act="quiz" data-i="' + i + '" ' + (e.quiz === i ? 'checked' : '') + ' style="margin-right:8px">' + esc(o) + '</label>';
  }).join('');
  const fb = e.quiz >= 0 ? '<p class="fb" style="color:' + (e.quiz === q[2] ? 'var(--ok)' : 'var(--mar)') + '">' + (e.quiz === q[2] ? esc(q[3]) : 'Quase. Releia a ideia central e tente de novo.') + '</p>' : '';
  return '<div class="card quiz"><b>' + esc(q[0]) + '</b>' + opts + fb + '</div>';
}
function cabecalho(n) {
  return `<div class="encoding"><span class="pill" style="background:${BLOCOS[n][1]}">Encontro ${n} · ${BLOCOS[n][0]}</span></div>
  <div class="card" style="background:var(--navy);color:#fff;border:0">
    <div style="display:flex;gap:14px;align-items:center">
      <div style="font-family:Anton,Impact,sans-serif;font-size:4rem;color:${BLOCOS[n][1]};line-height:1">${n}</div>
      <div><h1 style="font-size:clamp(1.9rem,5vw,2.8rem)">${esc(ENC[n - 1].t)}</h1><p style="margin:6px 0 0;color:#c9d2ea">${esc(ENC[n - 1].s)}</p></div>
    </div>
  </div>`;
}
function navEnc(n, base) {
  const prev = n > 1 ? '<a href="' + base(n - 1) + '">← ' + esc(ENC[n - 2].t) + '</a>' : '<a href="#home">← Início</a>';
  const next = n < 10 ? '<a href="' + base(n + 1) + '">' + esc(ENC[n].t) + ' →</a>' : '<a href="#depois">Depois do décimo →</a>';
  return '<div class="nav2">' + prev + next + '</div>';
}

/* ---------- encontro: discípulo ---------- */
function viewEncAluno(n) {
  const e = encOf(S.prog, n);
  return cabecalho(n) + `
  <div class="sec">${CHEV}<h2>Antes do encontro</h2></div>
  <div class="card"><p class="note" style="margin:0">Ore pedindo ao Espírito Santo que abra o coração para a conversa. Revise o compromisso da semana anterior e leia os textos antes de começar.</p></div>
  ${blocoConteudo(ENC[n - 1], n, e, 'aluno')}
  <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
    <button class="btn ${e.done ? 'ghost' : 'or'}" data-act="done" data-n="${n}">${e.done ? '✓ Encontro concluído (desfazer)' : 'Marcar encontro como concluído'}</button>
  </div>
  ${navEnc(n, k => '#enc-' + k)}`;
}

/* ---------- encontro: discipulador (como conduzir) ---------- */
function conducaoHTML(n) {
  const c = ENC[n - 1];
  return `
  <div class="sec">${CHEV}<h2>Como conduzir</h2></div>
  <div class="conduzir"><h3>Passo a passo na conversa</h3><ol>${c.disc.conduzir.map(x => '<li>' + esc(x) + '</li>').join('')}</ol></div>
  <div class="dinamica"><h3>Dinâmica: ${esc(c.disc.dinamica.nome)} <span class="note">· ${esc(c.disc.dinamica.tempo)}</span></h3>
    <ol>${c.disc.dinamica.passos.map(x => '<li>' + esc(x) + '</li>').join('')}</ol></div>
  <div class="card"><b>Vida na vida</b><p style="margin:6px 0 0">${esc(c.disc.vida)}</p></div>
  <div class="espirito"><h3>Ponto de atenção: dependência do Espírito</h3><p>${esc(c.es)} Ore para que o próprio Espírito conduza a conversa e a vida do jovem, e não apenas o seu esforço.</p></div>`;
}
function viewEncDisc(n) {
  return cabecalho(n) + conducaoHTML(n) +
  '<div class="sec">' + CHEV + '<h2>Conteúdo que o jovem vê</h2></div>' +
  '<p class="note">Modelo do encontro, sem respostas de ninguém.</p>' +
  blocoConteudo(ENC[n - 1], n, DEF(), 'modelo') + navEnc(n, k => '#enc-' + k);
}

/* ---------- discípulo visto pelo discipulador ---------- */
function nomeDoAluno(id) { const d = S.discipulos.find(x => x.id === id); return d ? d.nome : 'Discípulo'; }
function viewDiscAlunoOverview(id) {
  const nome = nomeDoAluno(id);
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
    const e = encOf(S.alunoProg, n);
    const st = e.done ? '<span class="ok">concluído</span>' : (e.dias.filter(Boolean).length + '/5 dias');
    return '<a href="#d-' + id + '-' + n + '"><span><b>' + n + '. ' + esc(ENC[n - 1].t) + '</b><br><small>' + BLOCOS[n][0] + '</small></span><span>' + st + '</span></a>';
  }).join('');
  return `
  <section class="hero"><div class="tag">Discípulo</div><h1>${esc(nome)}</h1><p>Acompanhe o caminho. Você vê as respostas e o registro dele; suas notas são só suas.</p></section>
  <div class="sec">${CHEV}<h2>Encontros</h2></div>
  <div class="lista">${items}</div>`;
}
function viewDiscAluno(id, n) {
  const e = encOf(S.alunoProg, n);
  const nota = Object.assign({ percepcoes: '', compromisso: '', acompanhamento: '', anotacoes: '' }, S.notas[id + '-' + n] || {});
  return cabecalho(n) + `
  <div class="card" style="background:#fff7ef;border-color:#f5d9b5"><b>Discípulo: ${esc(nomeDoAluno(id))}</b><p class="note" style="margin:4px 0 0">Respostas e registro abaixo são somente leitura.</p></div>
  ${conducaoHTML(n)}
  <div class="sec">${CHEV}<h2>Respostas e registro do discípulo</h2></div>
  ${blocoConteudo(ENC[n - 1], n, e, 'leitura')}
  <div class="sec">${CHEV}<h2>Minhas notas (privadas)</h2></div>
  <div class="card">
    <p class="hint" style="margin-top:0">Só você vê estas notas. O discípulo não tem acesso.</p>
    <div class="field"><label>O que percebi no jovem</label><textarea data-field="nota" data-k="percepcoes" data-id="${id}" data-n="${n}">${esc(nota.percepcoes)}</textarea></div>
    <div class="field"><label>Compromisso combinado</label><textarea data-field="nota" data-k="compromisso" data-id="${id}" data-n="${n}">${esc(nota.compromisso)}</textarea></div>
    <div class="field"><label>Acompanhamento e próximos passos</label><textarea data-field="nota" data-k="acompanhamento" data-id="${id}" data-n="${n}">${esc(nota.acompanhamento)}</textarea></div>
    <div class="field"><label>Anotações gerais</label><textarea data-field="nota" data-k="anotacoes" data-id="${id}" data-n="${n}">${esc(nota.anotacoes)}</textarea></div>
  </div>
  ${navEnc(n, k => '#d-' + id + '-' + k)}`;
}

/* ---------- outras páginas ---------- */
function viewAval() {
  const rows = AREAS.map(a => '<tr><td style="border-left:6px solid ' + a[3] + ';font-weight:700">' + a[0] + '</td><td>' + a[1] + '</td><td>' + a[2] + '</td></tr>').join('');
  return `
  <div class="sec">${CHEV}<h2>Avaliação pastoral do percurso</h2></div>
  <div class="card"><p style="margin:0">Use esta avaliação para discernir próximos passos, não para dar uma nota espiritual. O discípulo pode avançar mesmo com dúvidas. O critério principal é disposição para caminhar com Cristo, receber cuidado e praticar obediência.</p>
  <div style="margin-top:12px"><table><thead><tr><th>Área</th><th>Sinais observáveis</th><th>Próximo cuidado</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="warn"><b style="color:var(--mar)">Encaminhamentos</b>
    <ul style="margin:8px 0 0;padding-left:18px">
      <li>Em risco de violência, abuso, automutilação, ideação suicida ou ameaça, envolva imediatamente a liderança responsável e os serviços competentes.</li>
      <li>Em sofrimento emocional persistente, transtornos alimentares, uso problemático de substâncias ou sintomas intensos, incentive avaliação profissional.</li>
      <li>Em conflitos doutrinários, não responda com improviso. Registre a dúvida e procure a liderança pastoral para uma resposta responsável.</li>
    </ul></div>`;
}
function viewDepois() {
  const d = S.depois || { m: '', c: '', a: '' };
  return `
  <div class="sec">${CHEV}<h2>Depois do décimo encontro</h2></div>
  <div class="card"><p style="margin:0">O encerramento não é o fim da caminhada. Converse com seu discipulador e com a liderança sobre o próximo passo: continuar em acompanhamento, entrar em uma equipe de serviço, iniciar outro percurso de formação ou acompanhar alguém que está começando.</p></div>
  <div class="grid2">
    <div class="card"><b style="color:var(--bl)">Minha decisão</b><textarea data-field="dep" data-k="m" style="margin-top:8px">${esc(d.m)}</textarea></div>
    <div class="card"><b style="color:var(--bl)">Como vou praticar</b><textarea data-field="dep" data-k="c" style="margin-top:8px">${esc(d.c)}</textarea></div>
  </div>
  <div class="card"><b style="color:var(--or)">Quem vai caminhar comigo</b><textarea data-field="dep" data-k="a" style="margin-top:8px">${esc(d.a)}</textarea></div>
  <p class="disp" style="text-align:center;color:var(--or);font-size:1.6rem;margin:24px 0">Marche! Em frente!</p>`;
}
/* ---------- relatórios ---------- */
function dataBR(d) { if (!d) return '—'; const [a, m, dd] = d.split('-'); return dd + '/' + m + '/' + a; }
function statusAtividade(ultima, dias7) {
  if (!ultima) return '<span class="pill" style="background:var(--mar)">sem atividade</span>';
  return dias7 > 0 ? '<span class="pill" style="background:var(--ok)">em dia</span>' : '<span class="pill" style="background:var(--or)">parado 7+ dias</span>';
}
function barraProg(n) { return '<div class="bar-prog" style="width:120px;display:inline-block;vertical-align:middle;margin:0 6px 0 0"><i style="width:' + (n * 10) + '%"></i></div>' + n + '/10'; }
function matrizEncontros(encontros) {
  return '<div class="chips">' + encontros.map(e => '<span class="pill" title="Encontro ' + e.n + '" style="background:' + (e.done ? 'var(--ok)' : (e.dias || e.respostas || e.registros || e.balizas ? 'var(--cy)' : '#c9d2ea')) + ';color:#0b1020;min-width:30px;text-align:center">' + e.n + '</span>').join('') + '</div><p class="note" style="margin:4px 0 0">Verde: concluído · Azul: em andamento · Cinza: não iniciado</p>';
}
async function viewRelatorioDisc() {
  const r = await api('/api/relatorio/discipulador');
  S.discipulos = r.discipulos;
  const minhas = r.minhasNotas || {};
  const bloco = '<div class="card"><b>Suas anotações nos discípulos</b><p class="note" style="margin:4px 0 8px">Última vez que você salvou notas: ' + dataBR(minhas.ultimaAtividade) + '</p>' + semanasHTML(minhas.semanas) + '</div>';
  if (!r.discipulos.length) return '<div class="sec">' + CHEV + '<h2>Relatórios</h2></div>' + bloco + '<div class="card">Nenhum discípulo designado ainda.</div>';
  const linhas = r.discipulos.map(d => '<tr><td><a href="#d-' + d.id + '" style="font-weight:700">' + esc(d.nome) + '</a></td><td>' + statusAtividade(d.ultimaAtividade, d.diasAtivos7) + '<br><small class="note">última: ' + dataBR(d.ultimaAtividade) + '</small></td><td>' + barraProg(d.concluidos) + '</td><td>' + d.dias + '/50</td><td>' + d.respostas + '</td><td>' + d.registros + '</td><td>' + d.notas + '</td></tr>').join('');
  const detalhes = r.discipulos.map(d => '<div class="card"><b>' + esc(d.nome) + '</b> <span class="note">· ' + (d.diasAtivos7 ? d.diasAtivos7 + ' dia(s) ativo(s) nos últimos 7' : 'nenhuma atividade nos últimos 7 dias') + '</span>' + matrizEncontros(d.encontros) + '<div style="margin-top:12px">' + semanasHTML(d.semanas) + '</div></div>').join('');
  return `
  <div class="sec">${CHEV}<h2>Relatórios</h2></div>
  ${bloco}
  <div class="sec">${CHEV}<h2>Relatórios dos discípulos</h2></div>
  <div class="card" style="padding:8px"><table><thead><tr><th>Discípulo</th><th>Atividade</th><th>Encontros</th><th>Dias do desafio</th><th>Respostas</th><th>Registros</th><th>Notas suas</th></tr></thead><tbody>${linhas}</tbody></table></div>
  <div class="sec">${CHEV}<h2>Encontro a encontro</h2></div>
  ${detalhes}`;
}
async function relatorioAdminHTML() {
  const r = await api('/api/relatorio/admin');
  const disc = r.discipuladores.length ? r.discipuladores.map(d => '<tr><td>' + esc(d.nome) + '</td><td>' + d.discipulos + '</td><td>' + d.mediaConcluidos + '/10</td><td>' + d.semAtividade7 + '</td></tr>').join('') : '<tr><td colspan="4">Nenhum discipulador ainda.</td></tr>';
  const al = r.alunos.length ? r.alunos.map(a => '<tr><td>' + esc(a.nome) + '</td><td>' + esc(a.discipulador || '—') + '</td><td>' + statusAtividade(a.ultimaAtividade, a.diasAtivos7) + '<br><small class="note">última: ' + dataBR(a.ultimaAtividade) + '</small></td><td>' + barraProg(a.concluidos) + '</td><td>' + a.dias + '/50</td><td style="min-width:150px">' + semanasHTML(a.semanas) + '</td></tr>').join('') : '<tr><td colspan="6">Nenhum discípulo ainda.</td></tr>';
  return `
  <div class="sec">${CHEV}<h2>Relatório por discipulador</h2></div>
  <div class="card" style="padding:8px"><table><thead><tr><th>Discipulador</th><th>Discípulos</th><th>Média de encontros</th><th>Sem atividade (7 dias)</th></tr></thead><tbody>${disc}</tbody></table></div>
  <div class="sec">${CHEV}<h2>Relatório por discípulo</h2></div>
  <div class="card" style="padding:8px"><table><thead><tr><th>Discípulo</th><th>Discipulador</th><th>Atividade</th><th>Encontros</th><th>Dias do desafio</th><th>Últimas 8 semanas</th></tr></thead><tbody>${al}</tbody></table></div>
  <p class="note">O relatório mostra só números e datas. Respostas e registros não aparecem para o administrador.</p>`;
}
async function viewAdmin() {
  const r = await api('/api/admin/usuarios');
  S.usuarios = r.usuarios;
  const relatorio = await relatorioAdminHTML();
  const discs = r.usuarios.filter(u => u.papel === 'discipulador');
  const linhas = r.usuarios.filter(u => u.papel !== 'admin').map(u => {
    const sel = u.papel === 'aluno'
      ? '<select id="sel-' + u.id + '"><option value="">— sem discipulador —</option>' + discs.map(d => '<option value="' + d.id + '" ' + (u.discipuladorId === d.id ? 'selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select> <button class="btn" data-act="designar" data-id="' + u.id + '">Designar</button>'
      : '<span class="note">—</span>';
    const conc = u.papel === 'aluno' ? (u.concluidos.length ? u.concluidos.join(', ') + ' (' + u.concluidos.length + '/10)' : 'nenhum ainda') : '—';
    return '<tr><td>' + esc(u.nome) + '</td><td>' + esc(u.email) + '</td><td>' + PAPEL[u.papel] + '</td><td>' + sel + '</td><td>' + conc + '</td></tr>';
  }).join('');
  const acesso = S.caps.curso ? '' : `<div class="card"><h3 style="margin-top:0">Liberar versão completa</h3><p class="note" style="margin-top:0">Digite o código de acesso para usar também as funções de discípulo e discipulador nesta conta.</p><div class="field"><label for="codAcesso">Código de acesso</label><input id="codAcesso" type="text" autocomplete="off"></div><button class="btn or" data-act="ativar">Liberar acesso</button></div>`;
  return `
  <div class="sec">${CHEV}<h2>Administração</h2></div>
  ${acesso}
  <div class="card"><p style="margin:0">Aqui você designa um discipulador para cada discípulo e vê quais encontros cada um já concluiu. Respostas, registro e notas não aparecem aqui.</p>
  <div style="margin-top:12px"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Discipulador designado</th><th>Encontros concluídos</th></tr></thead><tbody>${linhas || '<tr><td colspan="5">Nenhum usuário ainda.</td></tr>'}</tbody></table></div></div>
  ${relatorio}`;
}

/* ---------- ações ---------- */
function salvarEncAluno(n) {
  debounceSave('e' + n, () => api('/api/meu-progresso/' + n, { method: 'PUT', body: S.prog[n] }).catch(() => toast('Não foi possível salvar. Verifique a conexão.')), 300);
}
function salvarNota(id, n) {
  const k = id + '-' + n, nota = S.notas[k];
  debounceSave('n' + k, () => api('/api/discipulo/' + id + '/notas/' + n, { method: 'PUT', body: nota }).catch(() => toast('Não foi possível salvar as notas.')), 500);
}
function garantirEnc(n) { S.prog[n] = encOf(S.prog, n); return S.prog[n]; }

document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act;
  if (a === 'sair') { await api('/api/logout', { method: 'POST' }).catch(() => {}); S.me = null; S.discipulador = null; S.prog = {}; S.progOk = false; S.caps = {}; S.discipulos = []; location.hash = '#login'; route(false); return; }
  if (a === 'aviso-ok') { await api('/api/avisos/' + el.dataset.id + '/lido', { method: 'POST' }).catch(() => {}); return route(true); }
  if (a === 'designar') {
    const sel = document.getElementById('sel-' + el.dataset.id);
    const nomeAluno = (S.usuarios.find(x => x.id === el.dataset.id) || {}).nome || 'este discípulo';
    const opcao = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
    const discId = sel ? sel.value : '';
    const msg = discId ? 'Designar ' + opcao + ' para acompanhar ' + nomeAluno + '?' : 'Remover o discipulador de ' + nomeAluno + '?';
    if (!confirm(msg)) return;
    try { await api('/api/admin/atribuir', { method: 'POST', body: { alunoId: el.dataset.id, discipuladorId: discId || null } }); toast('Designação salva'); }
    catch (e) { toast('Não foi possível salvar: ' + e.message); }
    return route(true);
  }
  if (a === 'modo') { S.modo = el.dataset.v; try { localStorage.setItem('modo', S.modo); } catch (e) {} location.hash = '#home'; return route(false); }
  if (a === 'ativar') {
    const cod = (document.getElementById('codAcesso') || {}).value || '';
    try { const r = await api('/api/ativar-acesso', { method: 'POST', body: { codigo: cod } }); S.caps = r.capacidades; S.modo = 'admin'; toast('Acesso completo liberado'); }
    catch (e) { toast(e.message); }
    return route(true);
  }
  if (a === 'tab') { S.authTab = el.dataset.v; return route(true); }
  if (a === 'ritmoToggle') { $('#ritmoPanel').classList.toggle('open'); return; }
  if (a === 'tick') return tick();
  if (a === 'reset') return resetClock();
  if (a === 'stage') return selStage(+el.dataset.i);
  if (a === 'copy') return copyText(el.dataset.msg);
  if (a === 'copyNotes') return copyNotes(+el.dataset.n);
  if (a === 'lido') { // não re-renderiza: o link precisa seguir para o YouVersion
    const n = +location.hash.slice(5), e = garantirEnc(n), i = +el.dataset.i;
    e.txt[i] = !e.txt[i]; el.classList.toggle('on', e.txt[i]); salvarEncAluno(n); return;
  }
  if (a === 'dia') { const n = +location.hash.slice(5), e = garantirEnc(n), i = +el.dataset.i; e.dias[i] = !e.dias[i]; salvarEncAluno(n); return route(true); }
  if (a === 'done') { const n = +el.dataset.n, e = garantirEnc(n); e.done = !e.done; await api('/api/meu-progresso/' + n, { method: 'PUT', body: e }).catch(() => {}); toast(e.done ? 'Encontro concluído' : 'Conclusão desfeita'); return route(true); }
  if (a === 'papel') { S.papelCad = el.dataset.v; return route(true); }
  if (a === 'papel-esc') { S.papelEsc = el.dataset.v; return route(true); }
  if (a === 'confirmar-papel') {
    const papel = S.papelEsc || 'aluno', cod = (document.getElementById('cod-esc') || {}).value || '';
    if (papel === 'discipulador' && !cod.trim()) { document.getElementById('erro-esc').textContent = 'Digite o código de discipulador.'; return; }
    try { await api('/api/escolher-papel', { method: 'POST', body: { papel, codigo: cod.trim() } }); S.pendente = false; await carregarMe(); location.hash = '#home'; route(false); }
    catch (e) { document.getElementById('erro-esc').textContent = e.message || 'Não foi possível salvar sua escolha.'; }
    return;
  }
});

document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.dataset.act === 'bal') {
    const n = +location.hash.slice(5), e = garantirEnc(n), i = +el.dataset.i;
    e.bal[i] = el.checked; el.parentElement.classList.toggle('on', el.checked); salvarEncAluno(n); return;
  }
  if (el.dataset.act === 'quiz') {
    const n = +location.hash.slice(5), e = garantirEnc(n);
    e.quiz = +el.dataset.i; salvarEncAluno(n); return route(true);
  }
  if (el.dataset.act === 'atribuir') {
    try { await api('/api/admin/atribuir', { method: 'POST', body: { alunoId: el.dataset.id, discipuladorId: el.value || null } }); toast('Designação salva'); }
    catch (e) { toast('Não foi possível salvar: ' + e.message); }
  }
});

document.addEventListener('input', ev => {
  const el = ev.target, f = el.dataset.field;
  if (!f) return;
  if (f === 'perg') { const n = +location.hash.slice(5), e = garantirEnc(n); e.perg[+el.dataset.i] = el.value; salvarEncAluno(n); }
  else if (f === 'reg') { const n = +location.hash.slice(5), e = garantirEnc(n); e.reg[+el.dataset.i][+el.dataset.j] = el.value; salvarEncAluno(n); }
  else if (f === 'comp') { const n = +location.hash.slice(5), e = garantirEnc(n); e.comp = el.value; salvarEncAluno(n); }
  else if (f === 'dep') { S.depois = S.depois || { m: '', c: '', a: '' }; S.depois[el.dataset.k] = el.value; debounceSave('dep', () => api('/api/meu-depois', { method: 'PUT', body: S.depois }).catch(() => {}), 500); }
  else if (f === 'nota') {
    const id = el.dataset.id, n = el.dataset.n, k = id + '-' + n;
    S.notas[k] = S.notas[k] || { percepcoes: '', compromisso: '', acompanhamento: '', anotacoes: '' };
    S.notas[k][el.dataset.k] = el.value; salvarNota(id, n);
  }
});

document.addEventListener('submit', async ev => {
  const form = ev.target;
  if (form.id !== 'fEntrar' && form.id !== 'fCadastro') return;
  ev.preventDefault();
  const dados = Object.fromEntries(new FormData(form).entries());
  const msg = $('#msgAuth');
  try {
    if (form.id === 'fEntrar') await api('/api/login', { method: 'POST', body: dados });
    else await api('/api/register', { method: 'POST', body: Object.assign(dados, { papel: S.papelCad }) });
    await carregarMe();
    location.hash = '#home';
    route(false);
  } catch (e) {
    msg.innerHTML = '<div class="erro">' + esc(e.message) + '</div>';
  }
});
document.addEventListener('input', ev => { if (ev.target.id === 'cc') S.codigoCad = ev.target.value; });

/* ---------- ações auxiliares ---------- */
function copyText(t) {
  const ok = () => toast('Copiado');
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast('Selecione o texto e copie manualmente'); }
    document.body.removeChild(ta);
  };
  try { navigator.clipboard.writeText(t).then(ok, fallback); } catch (e) { fallback(); }
}
function copyNotes(n) {
  const c = ENC[n - 1], e = encOf(S.prog, n);
  const linhas = ['Encontro ' + n + ' – ' + c.t, ''];
  c.perg.forEach((p, i) => { linhas.push(p); linhas.push(e.perg[i] || '(sem resposta)'); linhas.push(''); });
  linhas.push('Compromisso combinado: ' + (e.comp || '-'));
  copyText(linhas.join('\n'));
}

/* ---------- ritmo ---------- */
const STAGES = [[5, 'Acolhida e revisão'], [15, 'Conversa bíblica'], [20, 'Perguntas e prática'], [10, 'Oração e compromisso']];
const clk = { i: 0, left: 300, run: false, id: null };
function drawStages() {
  $('#stages').innerHTML = STAGES.map((s, i) => '<button class="' + (clk.i === i ? 'on' : '') + '" data-act="stage" data-i="' + i + '">' + s[0] + ' min<br><small style="font-weight:600;opacity:.8">' + s[1] + '</small></button>').join('');
  drawClock();
}
function drawClock() { const m = String(Math.floor(clk.left / 60)).padStart(2, '0'), s = String(clk.left % 60).padStart(2, '0'); $('#clock').textContent = m + ':' + s; }
function selStage(i) { clk.i = i; clk.left = STAGES[i][0] * 60; clk.run = false; clearInterval(clk.id); drawStages(); }
function tick() {
  if (clk.run) { clk.run = false; clearInterval(clk.id); return; }
  clk.run = true;
  clk.id = setInterval(() => {
    if (clk.left > 0) { clk.left--; drawClock(); }
    else { clearInterval(clk.id); clk.run = false; toast('Etapa concluída: ' + STAGES[clk.i][1]); }
  }, 1000);
}
function resetClock() { clearInterval(clk.id); clk.run = false; clk.left = STAGES[clk.i][0] * 60; drawClock(); }

/* ---------- início ---------- */
(async function boot() {
  drawStages();
  try { S.modo = localStorage.getItem('modo'); } catch (e) { S.modo = null; }
  try { S.cfg = await api('/api/config'); } catch (e) { S.cfg = {}; }
  await carregarMe();
  if (!S.me && !location.hash) location.hash = '#login';
  route(false);
})();
