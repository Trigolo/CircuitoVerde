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
  const v = Number(n || 0);
  const casas = v >= 100 ? 0 : v >= 1 ? 1 : 3;   // números grandes sem casas decimais
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
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
let navegacao = 0;   // muda a cada troca de tela: respostas de telas antigas são descartadas
class TelaTrocada extends Error {}

async function api(caminho, { metodo = 'GET', corpo, global = false } = {}) {
  const minhaNavegacao = navegacao;
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
  if (!global && minhaNavegacao !== navegacao) throw new TelaTrocada();
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

// ---------- Ícones (SVG em linha) ----------
const ICONES = {
  painel: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  pontos: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  novo: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  meus: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  coletas: '<path d="M1 6h13v10H1zM14 10h4l3 3v3h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
  reciclagem: '<path d="M7 19H4.8a2 2 0 0 1-1.7-3L5 12.8M11 5.3l1.1-1.9a2 2 0 0 1 3.4 0L17.6 7M17 19h3.2a2 2 0 0 0 1.7-3l-1.6-2.8"/><path d="m14 16-3 3 3 3M8.3 13.8 5 12.8 4 16.1M20.3 9.2 17.6 7l-3.3.8"/>',
  itens: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const icone = (nome) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

// ---------- Menu organizado por seções ----------
const TITULOS = {
  painel: 'Dashboard', pontos: 'Pontos de coleta', login: 'Entrar', novo: 'Novo descarte',
  meus: 'Meus descartes', coletas: 'Coletas', reciclagem: 'Reciclagem', itens: 'Todos os itens',
};
const OPERACAO_POR_PERFIL = {
  GERADOR: ['novo', 'meus'],
  TRANSPORTADOR: ['coletas'],
  RECICLADOR: ['reciclagem', 'coletas'],
  ADMIN: ['itens', 'coletas'],
  AUDITOR: ['itens'],
};
// Telas públicas (qualquer pessoa vê). A versão 2 (app-v2.js) acrescenta as novas.
const TELAS_PUBLICAS = ['painel', 'pontos'];
const TELAS_EXTRAS = {};   // preenchido pelo app-v2.js
function telaInicial(perfil) { return (OPERACAO_POR_PERFIL[perfil] || ['painel'])[0]; }
function permitida(tela) {
  if ([...TELAS_PUBLICAS, 'login', 'validar'].includes(tela)) return true;
  return (OPERACAO_POR_PERFIL[sessao?.usuario?.perfil] || []).includes(tela);
}
let telaAtual = 'painel';

function montarMenu() {
  const perfil = sessao?.usuario?.perfil;
  const item = (id) => `<button class="menu-item ${id === telaAtual ? 'ativo' : ''}" data-tela="${id}"
      ${id === telaAtual ? 'aria-current="page"' : ''}>${icone(id)}<span>${TITULOS[id]}</span></button>`;

  let html = `<div class="menu-secao">Visão geral</div>${TELAS_PUBLICAS.map(item).join('')}`;
  if (perfil) {
    html += `<div class="menu-secao">Operação</div>${OPERACAO_POR_PERFIL[perfil].map(item).join('')}`;
  } else {
    html += `<div class="menu-secao">Acesso</div>${item('login')}`;
  }
  $('#menu').innerHTML = html;
  $('#menu').querySelectorAll('[data-tela]').forEach((b) => (b.onclick = () => ir(b.dataset.tela)));

  if (sessao) {
    const nome = sessao.usuario.nome;
    const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    $('#sessao').innerHTML = `
      <div class="usuario">
        <div class="avatar">${esc(iniciais)}</div>
        <div class="usuario-info"><strong title="${esc(nome)}">${esc(nome)}</strong><small>${esc(perfil.toLowerCase())}</small></div>
        <button class="botao-icone" id="sair" title="Sair" aria-label="Sair">${icone('sair')}</button>
      </div>`;
    $('#sair').onclick = () => { salvarSessao(null); ir('painel'); avisar('Você saiu.'); };
  } else {
    $('#sessao').innerHTML = `<button class="btn" style="width:100%" id="btn-entrar">Entrar no sistema</button>`;
    $('#btn-entrar').onclick = () => ir('login');
  }
  $('#trilha').innerHTML = `CircuitoVerde <span aria-hidden="true">/</span> <b>${TITULOS[telaAtual] || ''}</b>`;
}

let limparTela = null;   // a tela atual pode deixar uma função de limpeza (ex.: parar a animação do globo)
async function ir(tela, parametro) {
  if (!permitida(tela)) tela = 'painel';
  if (limparTela) { try { limparTela(); } catch {} limparTela = null; }
  navegacao++;
  telaAtual = tela;
  montarMenu();
  fecharMenuMobile();
  esconderDica();
  const telas = { painel, pontos, login, novo, meus, coletas, reciclagem, itens, ...TELAS_EXTRAS };
  $('#conteudo').innerHTML = '<p class="sub">Carregando...</p>';
  try {
    await (telas[tela] || painel)(parametro);
  } catch (err) {
    if (err instanceof TelaTrocada) return;   // o usuário já foi para outra tela
    $('#conteudo').innerHTML = `<div class="cartao vazio">${esc(err.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

// ---------- Logo interativa e menu no celular ----------
$('#logo').onclick = (e) => {
  e.preventDefault();
  const logo = $('#logo');
  logo.classList.remove('girando');
  void logo.offsetWidth;            // reinicia a animação
  logo.classList.add('girando');
  ir('painel');
};
$('#logo').addEventListener('animationend', () => $('#logo').classList.remove('girando'));
$('#abrir-menu').onclick = () => { $('#lateral').classList.add('aberta'); $('#fundo-menu').classList.add('visivel'); };
$('#fundo-menu').onclick = fecharMenuMobile;
function fecharMenuMobile() { $('#lateral').classList.remove('aberta'); $('#fundo-menu').classList.remove('visivel'); }

// ---------- Indicador de conexão com a API ----------
async function verificarApi() {
  const el = $('#api-status');
  try {
    await api('/saude', { global: true });
    el.className = 'api-status ok'; el.querySelector('.texto').textContent = 'API e banco conectados';
  } catch {
    el.className = 'api-status falha'; el.querySelector('.texto').textContent = 'API indisponível';
  }
}

// ---------- Tooltip dos gráficos ----------
// Qualquer elemento com data-dica="Valor|Rótulo" mostra a dica ao passar o mouse ou focar.
const dica = $('#tooltip');
function mostrarDica(alvo, x, y) {
  const [valor, rotulo] = alvo.dataset.dica.split('|');
  dica.replaceChildren();
  const b = document.createElement('b'); b.textContent = valor;
  const s = document.createElement('span'); s.textContent = rotulo || '';
  dica.append(b, s);
  const w = dica.offsetWidth, h = dica.offsetHeight;
  dica.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px';
  dica.style.top = Math.max(8, y - h - 12) + 'px';
  dica.classList.add('visivel');
}
function esconderDica() { dica.classList.remove('visivel'); }
document.addEventListener('pointermove', (e) => {
  const alvo = e.target.closest?.('[data-dica]');
  alvo ? mostrarDica(alvo, e.clientX, e.clientY) : esconderDica();
});
document.addEventListener('focusin', (e) => {
  const alvo = e.target.closest?.('[data-dica]');
  if (!alvo) return esconderDica();
  const r = alvo.getBoundingClientRect();
  mostrarDica(alvo, r.left + r.width / 2, r.top);
});
document.addEventListener('scroll', esconderDica, true);

// ---------- Gráficos em SVG (sem bibliotecas externas) ----------
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const num = (n) => Number(n || 0).toLocaleString('pt-BR');

function escalaBonita(max) {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}

// Últimos 12 meses (preenche com zero os meses sem descarte)
function ultimos12Meses(porMes) {
  const mapa = Object.fromEntries(porMes.map((m) => [m.mes, m]));
  const hoje = new Date();
  const lista = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    lista.push({
      chave, rotulo: MESES[d.getMonth()], ano: d.getFullYear(),
      itens: Number(mapa[chave]?.itens || 0), kg: Number(mapa[chave]?.kg || 0),
    });
  }
  return lista;
}

// Gráfico de colunas: dados = [{ rotulo, valor, dica }]
function graficoColunas(dados, { altura = 240, formato = num } = {}) {
  const L = 680, mE = 40, mD = 8, mT = 18, mB = 28;
  const larg = L - mE - mD, alt = altura - mT - mB;
  const max = escalaBonita(Math.max(...dados.map((d) => d.valor), 1));
  const banda = larg / dados.length;
  const bw = Math.min(24, banda * 0.6);
  const y = (v) => mT + alt - (v / max) * alt;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const iMax = dados.reduce((im, d, i) => (d.valor > dados[im].valor ? i : im), 0);

  let svg = `<svg class="grafico" viewBox="0 0 ${L} ${altura}" role="img" aria-label="Gráfico de colunas">`;
  svg += `<g class="eixo">${ticks.map((t) => `
      <line class="grade-linha" x1="${mE}" x2="${L - mD}" y1="${y(t)}" y2="${y(t)}"/>
      <text x="${mE - 8}" y="${y(t) + 4}" text-anchor="end">${formato(t)}</text>`).join('')}</g>`;
  dados.forEach((d, i) => {
    const cx = mE + banda * i + banda / 2;
    const x = cx - bw / 2, yt = y(d.valor), h = mT + alt - yt;
    const r = Math.min(4, h);
    const caminho = h > 0
      ? `M${x},${mT + alt} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw - r} Q${x + bw},${yt} ${x + bw},${yt + r} V${mT + alt} Z`
      : '';
    svg += `<g class="barra-grupo" tabindex="0" data-dica="${esc(d.dica)}">
      <rect class="alvo" x="${mE + banda * i}" y="${mT}" width="${banda}" height="${alt}"/>
      <path class="coluna" d="${caminho}"/></g>`;
    svg += `<g class="eixo"><text x="${cx}" y="${altura - 8}" text-anchor="middle">${esc(d.rotulo)}</text></g>`;
    if (i === iMax && d.valor > 0) {
      svg += `<text class="rotulo-valor" x="${cx}" y="${yt - 6}" text-anchor="middle">${formato(d.valor)}</text>`;
    }
  });
  svg += `<line class="linha-base" x1="${mE}" x2="${L - mD}" y1="${mT + alt}" y2="${mT + alt}"/></svg>`;
  return svg;
}

// Barras horizontais: dados = [{ nome, valor, texto, dica, cinza }]
function barrasHorizontais(dados) {
  if (!dados.length) return '<p class="vazio">Sem dados ainda.</p>';
  const max = Math.max(...dados.map((d) => d.valor), 0.0001);
  return `<div class="barras-h">${dados.map((d) => `
    <div class="barra-h ${d.cinza ? 'cinza' : ''}" tabindex="0" data-dica="${esc(d.dica)}">
      <span class="nome" title="${esc(d.nome)}">${esc(d.nome)}</span>
      <div class="trilho"><div class="preenchido" style="width:${(d.valor / max) * 100}%"></div></div>
      <span class="valor">${esc(d.texto)}</span>
    </div>`).join('')}</div>`;
}

// Mini gráfico de linha para os KPIs
function sparkline(valores) {
  const W = 96, H = 28, max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * (W - 4) + 2, H - 3 - (v / max) * (H - 6)]);
  const ult = pts[pts.length - 1];
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--neutro-serie)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${ult[0]}" cy="${ult[1]}" r="3.5" fill="var(--serie-1)" stroke="var(--superficie)" stroke-width="2"/></svg>`;
}

// =====================================================================
// TELAS
// =====================================================================

// ---------- Dashboard (UC10) ----------
async function painel() {
  const d = await api('/indicadores');
  const t = d.totais;
  const meses = ultimos12Meses(d.por_mes || []);
  const pctComprovado = t.kg_descartados ? (t.kg_com_destino_comprovado / t.kg_descartados) * 100 : 0;
  const pct = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

  // Destino dos componentes (parte do todo)
  const CORES_DESTINO = { RECICLAGEM: 'var(--serie-1)', REUSO: 'var(--serie-2)', DESCARTE_ESPECIAL: 'var(--serie-3)' };
  const NOMES_DESTINO = { RECICLAGEM: 'Reciclagem', REUSO: 'Reuso', DESCARTE_ESPECIAL: 'Descarte especial' };
  const totalDestino = d.por_destino.reduce((s, x) => s + Number(x.kg), 0) || 1;
  const destinos = ['RECICLAGEM', 'REUSO', 'DESCARTE_ESPECIAL']
    .map((k) => d.por_destino.find((x) => x.tipo === k) || { tipo: k, kg: 0, componentes: 0 });

  // Status das coletas, na ordem do fluxo
  const ORDEM = ['SOLICITADA', 'AGENDADA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'];
  const statusMap = Object.fromEntries((d.status_coletas || []).map((s) => [s.status, Number(s.coletas)]));
  const maxCidade = Math.max(...d.por_cidade.map((c) => Number(c.kg_descartados)), 1);

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div>
        <h1>Dashboard de impacto</h1>
        <p class="sub">Indicadores calculados em tempo real pelas views do banco de dados.</p>
      </div>
      <button class="btn sec" id="atualizar">Atualizar dados</button>
    </div>

    <div class="dash">
      <div class="cartao kpi c3">
        <span class="rotulo">Itens descartados</span>
        <span class="valor">${num(t.itens_descartados)}</span>
        <div class="rodape"><span>últimos 12 meses</span>${sparkline(meses.map((m) => m.itens))}</div>
      </div>
      <div class="cartao kpi c3">
        <span class="rotulo">Peso descartado</span>
        <span class="valor">${kg(t.kg_descartados)}<span class="unidade">kg</span></span>
        <div class="rodape"><span>${num(t.geradores)} geradores</span>${sparkline(meses.map((m) => m.kg))}</div>
      </div>
      <div class="cartao kpi c3">
        <span class="rotulo">Certificados emitidos</span>
        <span class="valor">${num(t.certificados_emitidos)}</span>
        <div class="rodape"><span>${num(t.pontos_coleta)} pontos de coleta ativos</span></div>
      </div>
      <div class="cartao kpi c3">
        <span class="rotulo">Peso com destino comprovado</span>
        <span class="valor">${pct(pctComprovado)}</span>
        <div class="medidor" role="meter" aria-valuenow="${pctComprovado.toFixed(1)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${Math.min(100, pctComprovado)}%"></div></div>
        <div class="rodape"><span>${kg(t.kg_com_destino_comprovado)} kg certificados</span></div>
      </div>

      <div class="cartao c8">
        <h2>Itens descartados por mês</h2>
        <p class="legenda-card">Quantidade de equipamentos registrados nos últimos 12 meses</p>
        ${graficoColunas(meses.map((m) => ({
          rotulo: m.rotulo, valor: m.itens,
          dica: `${num(m.itens)} itens · ${kg(m.kg)} kg|${m.rotulo}/${m.ano}`,
        })))}
      </div>

      <div class="cartao c4">
        <h2>Destino dos componentes</h2>
        <p class="legenda-card">Participação no peso total destinado</p>
        <div class="empilhada">${destinos.map((x) => `
          <div style="width:${(Number(x.kg) / totalDestino) * 100}%;background:${CORES_DESTINO[x.tipo]}"
               tabindex="0" data-dica="${kg(x.kg)} kg · ${pct((Number(x.kg) / totalDestino) * 100)}|${NOMES_DESTINO[x.tipo]}"></div>`).join('')}
        </div>
        <ul class="legenda">${destinos.map((x) => `
          <li><span class="amostra" style="background:${CORES_DESTINO[x.tipo]}"></span>
              <span class="nome">${NOMES_DESTINO[x.tipo]}</span>
              <span class="num">${kg(x.kg)} kg</span>
              <span class="pct">${pct((Number(x.kg) / totalDestino) * 100)}</span></li>`).join('')}
        </ul>
        <div class="resumo-destino">
          <div><span>Total destinado</span><b>${kg(totalDestino)} kg</b></div>
          <div><span>Componentes</span><b>${num(d.por_destino.reduce((s2, x) => s2 + Number(x.componentes), 0))}</b></div>
        </div>
      </div>

      <div class="cartao c4">
        <h2>Materiais recuperados</h2>
        <p class="legenda-card">kg enviados para reciclagem ou reuso</p>
        ${barrasHorizontais(d.por_material.map((m) => ({
          nome: m.material, valor: Number(m.kg_recuperados), texto: kg(m.kg_recuperados),
          dica: `${kg(m.kg_recuperados)} kg · ${reais(m.valor_estimado_reais)}|${m.material} (valor estimado)`,
        })))}
      </div>

      <div class="cartao c4">
        <h2>Equipamentos mais descartados</h2>
        <p class="legenda-card">Quantidade de itens por tipo</p>
        ${barrasHorizontais((d.por_tipo || []).slice(0, 7).map((x) => ({
          nome: x.equipamento, valor: Number(x.itens), texto: num(x.itens),
          dica: `${num(x.itens)} itens · ${kg(x.kg)} kg|${x.equipamento}`,
        })))}
      </div>

      <div class="cartao c4">
        <h2>Coletas por status</h2>
        <p class="legenda-card">Situação atual da logística reversa</p>
        ${barrasHorizontais(ORDEM.map((s) => ({
          nome: NOMES_STATUS[s], valor: statusMap[s] || 0, texto: num(statusMap[s] || 0),
          dica: `${num(statusMap[s] || 0)} coletas|${NOMES_STATUS[s]}`, cinza: s === 'CANCELADA',
        })))}
      </div>

      <div class="cartao c7">
        <h2>Descartes por cidade</h2>
        <p class="legenda-card">Onde o resíduo eletrônico está sendo gerado</p>
        <table>
          <tr><th>Cidade</th><th class="num">Itens</th><th class="num">kg</th><th style="width:30%"></th></tr>
          ${d.por_cidade.map((c) => `<tr>
            <td>${esc(c.cidade)} <span style="color:var(--texto-3)">${esc(c.uf)}</span></td>
            <td class="num">${num(c.itens)}</td><td class="num">${kg(c.kg_descartados)}</td>
            <td><div class="mini-barra"><div style="width:${(Number(c.kg_descartados) / maxCidade) * 100}%"></div></div></td>
          </tr>`).join('')}
        </table>
      </div>

      <div class="cartao c5">
        <h2>Tempo médio da logística</h2>
        <p class="legenda-card">Da solicitação à entrega, por reciclador</p>
        <table>
          <tr><th>Reciclador</th><th class="num">Coletas</th><th class="num">Dias</th></tr>
          ${d.tempo_logistica.slice(0, 8).map((x) => `<tr>
            <td>${esc(x.reciclador)}</td><td class="num">${num(x.coletas_entregues)}</td>
            <td class="num">${Number(x.dias_medios).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
          </tr>`).join('')}
        </table>
      </div>
    </div>`;

  $('#atualizar').onclick = () => ir('painel');
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
      ir(telaInicial(r.usuario.perfil));
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
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
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
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
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
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
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
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
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
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
      } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
    };

    $('#emitir').onclick = async () => {
      try {
        const c = await api(`/itens/${idItem}/certificado`, { metodo: 'POST' });
        avisar('Certificado emitido: ' + c.codigo); recarregar();
      } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
    };
  }
}

// ---------- Início ----------
// A inicialização fica no final do app-v2.js (depois de registrar as telas novas).
