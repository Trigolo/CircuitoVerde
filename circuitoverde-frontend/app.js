// =====================================================================
// CircuitoVerde - Frontend (HTML + CSS + JavaScript puro)
// Conversa com a API REST em window.API_URL (ver config.js)
// =====================================================================

// ---------- Estado da sessão ----------
let sessao = lerSessao();

function lerSessao() {
  try { return JSON.parse(localStorage.getItem('cv_sessao')) || null; } catch { return null; }
}
function salvarSessao(s) {
  sessao = s;
  try { s ? localStorage.setItem('cv_sessao', JSON.stringify(s)) : localStorage.removeItem('cv_sessao'); } catch {}
}

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function dataBR(s) {
  if (!s) return '-';
  const [d, h = ''] = String(s).split(' ');
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}${h ? ' ' + h.slice(0, 5) : ''}`;
}
function kg(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}
function reais(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const NOMES_STATUS = {
  SOLICITADA: 'Solicitada', AGENDADA: 'Agendada', EM_TRANSITO: 'Em trânsito',
  ENTREGUE: 'Entregue', CANCELADA: 'Cancelada',
};
function badge(status) {
  if (!status) return '<span class="status">Sem coleta</span>';
  return `<span class="status ${esc(status)}">${esc(NOMES_STATUS[status] || status)}</span>`;
}

function avisar(msg, erro = false) {
  const el = $('#aviso');
  el.textContent = msg;
  el.className = 'aviso' + (erro ? ' erro' : '');
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => el.classList.add('escondido'), 5000);
}

// ---------- Chamada à API ----------
async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessao?.token) headers.Authorization = 'Bearer ' + sessao.token;
  let resp;
  try {
    resp = await fetch(window.API_URL + caminho, {
      method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com a API. Ela está rodando (npm run dev)?');
  }
  const dados = await resp.json().catch(() => ({}));
  if (resp.status === 401 && sessao) { salvarSessao(null); montarMenu(); }
  if (!resp.ok) throw new Error(dados.erro || 'Erro ' + resp.status);
  return dados;
}

// ---------- Modal ----------
function abrirModal(html) {
  $('#modal-corpo').innerHTML = html;
  $('#modal').classList.remove('escondido');
}
function fecharModal() { $('#modal').classList.add('escondido'); }
$('#modal-fechar').onclick = fecharModal;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') fecharModal(); };

// ---------- Menu por perfil ----------
const TELAS_POR_PERFIL = {
  ANONIMO:       [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['login', 'Entrar']],
  GERADOR:       [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['meus', 'Meus descartes'], ['novo', 'Novo descarte']],
  TRANSPORTADOR: [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['coletas', 'Coletas']],
  RECICLADOR:    [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['coletas', 'Coletas'], ['reciclagem', 'Reciclagem']],
  ADMIN:         [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['itens', 'Todos os itens'], ['coletas', 'Coletas']],
  AUDITOR:       [['painel', 'Painel de impacto'], ['pontos', 'Pontos de coleta'], ['itens', 'Todos os itens']],
};
let telaAtual = 'painel';

function montarMenu() {
  const perfil = sessao?.usuario?.perfil || 'ANONIMO';
  $('#menu').innerHTML = TELAS_POR_PERFIL[perfil]
    .map(([id, nome]) => `<button data-tela="${id}" class="${id === telaAtual ? 'ativo' : ''}">${nome}</button>`)
    .join('');
  $('#menu').querySelectorAll('button').forEach((b) => (b.onclick = () => ir(b.dataset.tela)));

  $('#sessao').innerHTML = sessao
    ? `<span>${esc(sessao.usuario.nome)} · <b>${esc(sessao.usuario.perfil)}</b></span>
       <button class="btn sec peq" id="sair" style="color:#BFD3CA;border-color:#BFD3CA">Sair</button>`
    : '';
  if (sessao) $('#sair').onclick = () => { salvarSessao(null); ir('painel'); avisar('Você saiu.'); };
}

async function ir(tela) {
  telaAtual = tela;
  montarMenu();
  const telas = { painel, pontos, login, novo, meus, coletas, reciclagem, itens };
  $('#conteudo').innerHTML = '<p class="sub">Carregando...</p>';
  try {
    await (telas[tela] || painel)();
  } catch (err) {
    $('#conteudo').innerHTML = `<div class="cartao vazio">${esc(err.message)}</div>`;
  }
}

// =====================================================================
// TELAS
// =====================================================================

// ---------- Painel de impacto (UC10) ----------
async function painel() {
  const d = await api('/indicadores');
  const t = d.totais;
  const max = Math.max(...d.por_material.map((m) => m.kg_recuperados), 0.001);

  $('#conteudo').innerHTML = `
    <h1>Painel de impacto</h1>
    <p class="sub">Indicadores calculados pelas views do banco de dados.</p>

    <div class="grade g4">
      <div class="cartao kpi"><div class="rotulo">Itens descartados</div><div class="valor">${t.itens_descartados}</div></div>
      <div class="cartao kpi"><div class="rotulo">Peso descartado</div><div class="valor">${kg(t.kg_descartados)} <span class="unidade">kg</span></div></div>
      <div class="cartao kpi"><div class="rotulo">Certificados emitidos</div><div class="valor">${t.certificados_emitidos}</div></div>
      <div class="cartao kpi"><div class="rotulo">Com destino comprovado</div><div class="valor">${kg(t.kg_com_destino_comprovado)} <span class="unidade">kg</span></div></div>
    </div>

    <div class="grade g2" style="margin-top:18px">
      <div class="cartao">
        <h2>Materiais recuperados (kg)</h2>
        <div class="barras">
          ${d.por_material.map((m) => `
            <div class="barra-linha" title="${esc(m.material)}: ${kg(m.kg_recuperados)} kg · valor estimado ${reais(m.valor_estimado_reais)}">
              <span>${esc(m.material)}</span>
              <div class="barra-trilho"><div class="barra" style="width:${(m.kg_recuperados / max) * 100}%"></div></div>
              <span class="barra-valor">${kg(m.kg_recuperados)}</span>
            </div>`).join('') || '<p class="vazio">Sem dados ainda.</p>'}
        </div>
      </div>

      <div class="cartao">
        <h2>Destino dos componentes</h2>
        <table>
          <tr><th>Destino</th><th class="num">Componentes</th><th class="num">kg</th></tr>
          ${d.por_destino.map((x) => `<tr><td>${esc(x.tipo.replace('_', ' ').toLowerCase())}</td><td class="num">${x.componentes}</td><td class="num">${kg(x.kg)}</td></tr>`).join('')}
        </table>
      </div>

      <div class="cartao">
        <h2>Descartes por cidade</h2>
        <table>
          <tr><th>Cidade</th><th class="num">Itens</th><th class="num">kg</th></tr>
          ${d.por_cidade.map((x) => `<tr><td>${esc(x.cidade)} / ${esc(x.uf)}</td><td class="num">${x.itens}</td><td class="num">${kg(x.kg_descartados)}</td></tr>`).join('')}
        </table>
      </div>

      <div class="cartao">
        <h2>Tempo médio da logística reversa</h2>
        <table>
          <tr><th>Reciclador</th><th class="num">Coletas</th><th class="num">Dias</th></tr>
          ${d.tempo_logistica.map((x) => `<tr><td>${esc(x.reciclador)}</td><td class="num">${x.coletas_entregues}</td><td class="num">${String(x.dias_medios).replace('.', ',')}</td></tr>`).join('')}
        </table>
      </div>
    </div>`;
}

// ---------- Pontos de coleta (UC03) ----------
async function pontos() {
  const materiais = await api('/materiais');
  $('#conteudo').innerHTML = `
    <h1>Pontos de coleta</h1>
    <p class="sub">Encontre quem recebe o seu resíduo eletrônico.</p>
    <div class="cartao">
      <form id="f-busca" class="linha" style="align-items:end">
        <label>Material
          <select name="material"><option value="">Todos</option>
            ${materiais.map((m) => `<option>${esc(m.nome)}</option>`).join('')}
          </select>
        </label>
        <label>Cidade <input name="cidade" placeholder="Ex.: Curitiba"></label>
        <button class="btn">Buscar</button>
      </form>
    </div>
    <div id="resultado" class="grade g2" style="margin-top:18px"></div>`;

  const buscar = async () => {
    const f = new FormData($('#f-busca'));
    const q = new URLSearchParams();
    if (f.get('material')) q.set('material', f.get('material'));
    if (f.get('cidade')) q.set('cidade', f.get('cidade').trim());
    const lista = await api('/pontos-coleta?' + q);
    $('#resultado').innerHTML = lista.map((p) => `
      <div class="cartao">
        <h2>${esc(p.reciclador)}</h2>
        <p style="margin:0 0 8px">${esc(p.logradouro)}, ${esc(p.numero)} · ${esc(p.bairro)}<br>${esc(p.cidade)} / ${esc(p.uf)} · CEP ${esc(p.cep)}</p>
        <small style="color:var(--texto-2)">Aceita: ${esc(p.materiais_aceitos)}</small>
      </div>`).join('') || '<div class="cartao vazio">Nenhum ponto encontrado.</div>';
  };
  $('#f-busca').onsubmit = (e) => { e.preventDefault(); buscar().catch((err) => avisar(err.message, true)); };
  await buscar();
}

// ---------- Login (UC01) ----------
async function login() {
  $('#conteudo').innerHTML = `
    <div class="cartao login">
      <h1>Entrar</h1>
      <p class="sub">Acesse com o seu perfil.</p>
      <form id="f-login">
        <label>E-mail <input name="email" type="email" required></label>
        <label>Senha <input name="senha" type="password" required></label>
        <button class="btn">Entrar</button>
      </form>
      <div class="demo">
        Usuários de teste (senha 123456):
        <div class="acoes">
          <button class="btn sec peq" data-email="ana@exemplo.com">Gerador</button>
          <button class="btn sec peq" data-email="carlos@exemplo.com">Transportador</button>
          <button class="btn sec peq" data-email="operacao@reciclasul.com">Reciclador</button>
          <button class="btn sec peq" data-email="admin@circuitoverde.app">Admin</button>
        </div>
      </div>
    </div>`;

  const entrar = async (email, senha) => {
    try {
      const r = await api('/auth/login', { metodo: 'POST', corpo: { email, senha } });
      salvarSessao({ token: r.token, usuario: r.usuario });
      avisar(`Olá, ${r.usuario.nome}!`);
      ir(TELAS_POR_PERFIL[r.usuario.perfil][2]?.[0] || 'painel');
    } catch (err) { avisar(err.message, true); }
  };
  $('#f-login').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    entrar(f.get('email'), f.get('senha'));
  };
  document.querySelectorAll('.demo button').forEach((b) => (b.onclick = () => entrar(b.dataset.email, '123456')));
}

// ---------- Novo descarte (UC02) ----------
async function novo() {
  const tipos = await api('/tipos-equipamento');
  $('#conteudo').innerHTML = `
    <h1>Novo descarte</h1>
    <p class="sub">Registre o equipamento que você quer descartar corretamente.</p>
    <div class="cartao" style="max-width:640px">
      <form id="f-item">
        <div class="linha">
          <label>Equipamento
            <select name="id_tipo" required>${tipos.map((t) => `<option value="${t.id_tipo}">${esc(t.nome)}</option>`).join('')}</select>
          </label>
          <label>Estado
            <select name="estado">
              <option value="FUNCIONANDO">Funcionando</option>
              <option value="DEFEITUOSO">Defeituoso</option>
              <option value="SUCATA">Sucata</option>
            </select>
          </label>
          <label>Peso (kg) <input name="peso_kg" type="number" step="0.001" min="0.001" required></label>
        </div>
        <label>Descrição <input name="descricao" maxlength="150" placeholder="Ex.: notebook antigo do escritório"></label>
        <div><button class="btn">Registrar descarte</button></div>
      </form>
    </div>`;

  $('#f-item').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api('/itens', { metodo: 'POST', corpo: {
        id_tipo: Number(f.get('id_tipo')), estado: f.get('estado'),
        peso_kg: Number(f.get('peso_kg')), descricao: f.get('descricao'),
      } });
      avisar(`Descarte nº ${r.id_item} registrado. Agora solicite a coleta.`);
      ir('meus');
    } catch (err) { avisar(err.message, true); }
  };
}

// ---------- Meus descartes (gerador) ----------
async function meus() {
  const lista = await api('/itens');
  $('#conteudo').innerHTML = `
    <h1>Meus descartes</h1>
    <p class="sub">Acompanhe cada item até o certificado de destinação.</p>
    <div class="cartao">${tabelaItens(lista, true)}</div>`;
  ligarBotoesItens();
}

// ---------- Todos os itens (admin / auditor) ----------
async function itens() {
  const lista = await api('/itens');
  $('#conteudo').innerHTML = `
    <h1>Todos os itens</h1>
    <p class="sub">Rastreio de todos os descartes registrados (view vw_rastreio_item).</p>
    <div class="cartao">${tabelaItens(lista, false)}</div>`;
  ligarBotoesItens();
}

function tabelaItens(lista, ehGerador) {
  if (!lista.length) return '<p class="vazio">Nenhum item ainda.</p>';
  return `<table>
    <tr><th>#</th><th>Equipamento</th>${ehGerador ? '' : '<th>Gerador</th>'}<th>Coleta</th><th>Reciclador</th><th>Certificado</th><th></th></tr>
    ${lista.map((i) => `<tr>
      <td>${i.id_item}</td>
      <td>${esc(i.equipamento)}</td>
      ${ehGerador ? '' : `<td>${esc(i.gerador)}</td>`}
      <td>${badge(i.status_atual)}</td>
      <td>${esc(i.reciclador || '-')}</td>
      <td>${i.certificado ? '✔ Emitido' : '-'}</td>
      <td class="acoes">
        <button class="btn sec peq" data-rastrear="${i.id_item}">Rastrear</button>
        ${ehGerador && !i.status_atual ? `<button class="btn peq" data-coleta="${i.id_item}">Solicitar coleta</button>` : ''}
      </td>
    </tr>`).join('')}
  </table>`;
}

function ligarBotoesItens() {
  document.querySelectorAll('[data-rastrear]').forEach((b) => (b.onclick = () => rastrear(b.dataset.rastrear)));
  document.querySelectorAll('[data-coleta]').forEach((b) => (b.onclick = () => solicitarColeta(b.dataset.coleta)));
}

// ---------- Solicitar coleta (UC04) ----------
async function solicitarColeta(idItem) {
  const pontosLista = await api('/pontos-coleta');
  abrirModal(`
    <h2>Solicitar coleta do item nº ${esc(idItem)}</h2>
    <form id="f-coleta">
      <label>Reciclador
        <select name="id_reciclador">
          ${pontosLista.map((p) => `<option value="${p.id_reciclador}">${esc(p.reciclador)} · ${esc(p.cidade)}/${esc(p.uf)}</option>`).join('')}
        </select>
      </label>
      <div><button class="btn">Solicitar</button></div>
    </form>`);
  $('#f-coleta').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/logisticas', { metodo: 'POST', corpo: {
        id_item: Number(idItem), id_reciclador: Number(new FormData(e.target).get('id_reciclador')),
      } });
      fecharModal(); avisar('Coleta solicitada!'); ir('meus');
    } catch (err) { avisar(err.message, true); }
  };
}

// ---------- Rastreio do item ----------
async function rastrear(idItem) {
  const r = await api('/itens/' + idItem);
  abrirModal(htmlRastreio(r));
}

function htmlRastreio(r) {
  return `
    <h2>${esc(r.equipamento)} · item nº ${r.id_item}</h2>
    <p class="sub" style="margin-bottom:14px">Gerador: ${esc(r.gerador)} · Reciclador: ${esc(r.reciclador || '-')} · ${badge(r.status_atual)}</p>

    <h2 style="font-size:15px">Histórico da coleta</h2>
    ${r.historico.length ? `<ul class="tempo">${r.historico.map((h) => `
      <li><b>${esc(NOMES_STATUS[h.status] || h.status)}</b><small>${dataBR(h.data_hora)}</small></li>`).join('')}</ul>`
      : '<p class="sub">A coleta ainda não foi solicitada.</p>'}

    <h2 style="font-size:15px">Componentes e destino</h2>
    ${r.componentes.length ? `<table>
      <tr><th>Componente</th><th class="num">kg</th><th>Destino</th></tr>
      ${r.componentes.map((c) => `<tr><td>${esc(c.nome)}</td><td class="num">${kg(c.peso_kg)}</td>
        <td>${c.destino ? esc(c.destino.replace('_', ' ').toLowerCase()) : '<span class="status">Pendente</span>'}</td></tr>`).join('')}
    </table>` : '<p class="sub">O reciclador ainda não registrou os componentes.</p>'}

    ${r.certificado ? `<div class="certificado">✔ <b>Certificado de destinação emitido</b><br>Código: <code>${esc(r.certificado)}</code></div>` : ''}`;
}

// ---------- Coletas (UC05 e UC06) ----------
const PROXIMOS = {
  SOLICITADA: ['AGENDADA', 'CANCELADA'],
  AGENDADA: ['EM_TRANSITO', 'CANCELADA'],
  EM_TRANSITO: ['ENTREGUE'],
};
const ACAO = { AGENDADA: 'Agendar', EM_TRANSITO: 'Saiu para coleta', ENTREGUE: 'Marcar entregue', CANCELADA: 'Cancelar' };

async function coletas() {
  $('#conteudo').innerHTML = `
    <h1>Coletas</h1>
    <p class="sub">Logística reversa. Cada mudança de status é gravada no histórico por um trigger do banco.</p>
    <div class="cartao" style="margin-bottom:18px">
      <label style="max-width:260px">Filtrar por status
        <select id="filtro-status">
          <option value="">Todos</option>
          ${Object.entries(NOMES_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="cartao" id="lista-coletas"></div>`;

  const carregar = async () => {
    const st = $('#filtro-status').value;
    const lista = await api('/logisticas' + (st ? '?status=' + st : ''));
    $('#lista-coletas').innerHTML = !lista.length ? '<p class="vazio">Nenhuma coleta.</p>' : `<table>
      <tr><th>#</th><th>Item</th><th class="num">kg</th><th>Reciclador</th><th>Solicitada</th><th>Agendada</th><th>Status</th><th>Ações</th></tr>
      ${lista.map((l) => `<tr>
        <td>${l.id_logistica}</td>
        <td>${esc(l.equipamento)} <small style="color:var(--texto-2)">nº ${l.id_item}</small></td>
        <td class="num">${kg(l.peso_kg)}</td>
        <td>${esc(l.reciclador)}</td>
        <td>${dataBR(l.data_solicitacao)}</td>
        <td>${dataBR(l.data_agendada)}</td>
        <td>${badge(l.status)}</td>
        <td class="acoes">${(PROXIMOS[l.status] || []).map((p) =>
          `<button class="btn peq ${p === 'CANCELADA' ? 'sec' : ''}" data-log="${l.id_logistica}" data-para="${p}">${ACAO[p]}</button>`).join('')}
          <button class="btn sec peq" data-rastrear="${l.id_item}">Rastrear</button>
        </td>
      </tr>`).join('')}
    </table>`;

    document.querySelectorAll('[data-para]').forEach((b) => (b.onclick = () => mudarStatus(b.dataset.log, b.dataset.para, carregar)));
    document.querySelectorAll('[data-rastrear]').forEach((b) => (b.onclick = () => rastrear(b.dataset.rastrear)));
  };
  $('#filtro-status').onchange = () => carregar().catch((err) => avisar(err.message, true));
  await carregar();
}

async function mudarStatus(id, para, recarregar) {
  const enviar = async (extra = {}) => {
    try {
      await api(`/logisticas/${id}/status`, { metodo: 'PATCH', corpo: { status: para, ...extra } });
      fecharModal(); avisar(`Coleta nº ${id}: ${NOMES_STATUS[para]}.`); recarregar();
    } catch (err) { avisar(err.message, true); }
  };
  if (para !== 'AGENDADA') return enviar();

  abrirModal(`
    <h2>Agendar coleta nº ${esc(id)}</h2>
    <form id="f-agenda">
      <label>Data e hora <input name="data" type="datetime-local" required></label>
      <label>Rota <input name="rota" placeholder="Ex.: Centro > Água Verde > CIC"></label>
      <div><button class="btn">Confirmar agendamento</button></div>
    </form>`);
  $('#f-agenda').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    enviar({ data_agendada: f.get('data').replace('T', ' ') + ':00', rota: f.get('rota') });
  };
}

// ---------- Reciclagem (UC07, UC08 e UC09) ----------
async function reciclagem() {
  const lista = (await api('/logisticas?status=ENTREGUE'))
    .filter((l) => l.reciclador === sessao.usuario.nome);
  $('#conteudo').innerHTML = `
    <h1>Reciclagem</h1>
    <p class="sub">Itens entregues a você. Registre os componentes, defina o destino e emita o certificado.</p>
    <div class="cartao">${!lista.length ? '<p class="vazio">Nenhum item entregue ainda.</p>' : `<table>
      <tr><th>Item</th><th class="num">kg</th><th>Entregue em</th><th></th></tr>
      ${lista.map((l) => `<tr>
        <td>${esc(l.equipamento)} <small style="color:var(--texto-2)">nº ${l.id_item}</small></td>
        <td class="num">${kg(l.peso_kg)}</td>
        <td>${dataBR(l.data_entrega)}</td>
        <td><button class="btn peq" data-gerenciar="${l.id_item}">Gerenciar</button></td>
      </tr>`).join('')}
    </table>`}</div>`;
  document.querySelectorAll('[data-gerenciar]').forEach((b) => (b.onclick = () => gerenciarItem(b.dataset.gerenciar)));
}

let cacheMateriais = null;
async function gerenciarItem(idItem) {
  cacheMateriais = cacheMateriais || (await api('/materiais'));
  const r = await api('/itens/' + idItem);
  const opcoesMat = cacheMateriais.map((m) => `<option value="${m.id_material}">${esc(m.nome)}</option>`).join('');
  const pendentes = r.componentes.filter((c) => !c.destino);

  abrirModal(`
    ${htmlRastreio(r)}

    ${pendentes.length ? `<hr style="border:0;border-top:1px solid var(--borda);margin:20px 0">
      <h2 style="font-size:15px">Definir destino</h2>
      <form id="f-destino" class="linha" style="align-items:end">
        <label>Componente <select name="id_componente">${pendentes.map((c) => `<option value="${c.id_componente}">${esc(c.nome)}</option>`).join('')}</select></label>
        <label>Destino <select name="tipo">
          <option value="RECICLAGEM">Reciclagem</option><option value="REUSO">Reuso</option><option value="DESCARTE_ESPECIAL">Descarte especial</option>
        </select></label>
        <label>Local <input name="local_destino" placeholder="Ex.: Refino de metais"></label>
        <button class="btn">Salvar destino</button>
      </form>` : ''}

    ${!r.certificado ? `<hr style="border:0;border-top:1px solid var(--borda);margin:20px 0">
      <h2 style="font-size:15px">Novo componente</h2>
      <form id="f-comp">
        <div class="linha">
          <label>Nome <input name="nome" required placeholder="Ex.: Placa-mãe"></label>
          <label>Peso (kg) <input name="peso_kg" type="number" step="0.001" min="0.001" required></label>
          <label>Reaproveitável? <select name="reap"><option value="0">Não</option><option value="1">Sim</option></select></label>
        </div>
        <div id="linhas-mat"></div>
        <div class="acoes">
          <button type="button" class="btn sec peq" id="add-mat">+ Material</button>
          <button class="btn">Salvar componente</button>
        </div>
      </form>

      <hr style="border:0;border-top:1px solid var(--borda);margin:20px 0">
      <button class="btn ambar" id="emitir" ${!r.componentes.length || pendentes.length ? 'disabled' : ''}>Emitir certificado</button>
      <small style="color:var(--texto-2);margin-left:8px">${pendentes.length ? 'Todos os componentes precisam de destino.' : ''}</small>` : ''}`);

  const recarregar = () => gerenciarItem(idItem);

  $('#f-destino') && ($('#f-destino').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/destinos', { metodo: 'POST', corpo: {
        id_componente: Number(f.get('id_componente')), tipo: f.get('tipo'), local_destino: f.get('local_destino'),
      } });
      avisar('Destino registrado.'); recarregar();
    } catch (err) { avisar(err.message, true); }
  });

  if ($('#f-comp')) {
    const addLinha = () => {
      const div = document.createElement('div');
      div.className = 'linha'; div.style.marginTop = '8px';
      div.innerHTML = `<label>Material <select data-m>${opcoesMat}</select></label>
                       <label>Peso do material (kg) <input data-p type="number" step="0.001" min="0.001" required></label>`;
      $('#linhas-mat').appendChild(div);
    };
    $('#add-mat').onclick = addLinha;
    addLinha();

    $('#f-comp').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const materiais = [...document.querySelectorAll('#linhas-mat .linha')].map((l) => ({
        id_material: Number(l.querySelector('[data-m]').value),
        peso_kg: Number(l.querySelector('[data-p]').value),
      }));
      try {
        await api('/componentes', { metodo: 'POST', corpo: {
          id_item: Number(idItem), nome: f.get('nome'), peso_kg: Number(f.get('peso_kg')),
          reaproveitavel: f.get('reap') === '1', materiais,
        } });
        avisar('Componente registrado.'); recarregar();
      } catch (err) { avisar(err.message, true); }
    };

    $('#emitir').onclick = async () => {
      try {
        const c = await api(`/itens/${idItem}/certificado`, { metodo: 'POST' });
        avisar('Certificado emitido: ' + c.codigo); recarregar();
      } catch (err) { avisar(err.message, true); }
    };
  }
}

// ---------- Início ----------
ir('painel');
