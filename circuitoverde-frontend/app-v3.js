// =====================================================================
// CircuitoVerde - Versão 3 do frontend (visual vibrante)
// Menu no topo (e barra inferior no celular), tela inicial de apresentação,
// animações de entrada, contadores e transições entre telas.
// Carregado por último: usa app.js, app-v2.js e assistente.js.
// =====================================================================

const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 1. Telas, nomes curtos e ícones ----------
TELAS_PUBLICAS.splice(0, TELAS_PUBLICAS.length, 'inicio', 'painel', 'pontos', 'panorama', 'calculadora', 'ranking', 'validar');
Object.assign(TITULOS, { inicio: 'Início' });
const CURTOS = {
  inicio: 'Início', painel: 'Dashboard', pontos: 'Pontos de coleta', panorama: 'Mundo',
  calculadora: 'Impacto', ranking: 'Ranking', validar: 'Certificado',
};
Object.assign(ICONES, {
  inicio: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  area: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
});
Object.assign(TELAS_EXTRAS, { inicio });

// ---------- 2. Menu no topo, barra inferior e folha "Mais" ----------
const NOME_AREA = { GERADOR: 'Meus descartes', TRANSPORTADOR: 'Coletas', RECICLADOR: 'Reciclagem', ADMIN: 'Administração', AUDITOR: 'Auditoria' };

montarMenu = function () {
  const perfil = sessao?.usuario?.perfil;
  const operacao = perfil ? OPERACAO_POR_PERFIL[perfil] || [] : [];
  const ativo = (id) => (id === telaAtual ? 'ativo' : '');
  const botao = (id, rotulo) => `<button class="nav-item ${ativo(id)}" data-tela="${id}" ${id === telaAtual ? 'aria-current="page"' : ''}>${icone(id)}<span>${rotulo}</span></button>`;

  // Topo: telas públicas + "Minha área" (menu suspenso) quando logado
  let html = TELAS_PUBLICAS.map((id) => botao(id, CURTOS[id] || TITULOS[id])).join('');
  if (operacao.length) {
    const naArea = operacao.includes(telaAtual);
    html += `<div class="nav-area">
      <button class="nav-item nav-area-botao ${naArea ? 'ativo' : ''}" id="nav-area" aria-haspopup="true" aria-expanded="false">${icone('area')}<span>${NOME_AREA[perfil] || 'Minha área'}</span>${icone('seta')}</button>
      <div class="nav-area-lista" id="nav-area-lista" hidden>${operacao.map((id) => botao(id, TITULOS[id])).join('')}</div>
    </div>`;
  }
  $('#menu').innerHTML = html;

  // Celular: 4 atalhos + "Mais"
  const rapidos = ['inicio', 'pontos', 'panorama', operacao[0] || 'painel'];
  $('#barra-inferior').innerHTML = rapidos.map((id) => `<button class="inf-item ${ativo(id)}" data-tela="${id}">${icone(id)}<span>${{ pontos: 'Pontos' }[id] || CURTOS[id] || TITULOS[id]}</span></button>`).join('')
    + `<button class="inf-item" id="inf-mais">${icone('mais')}<span>Mais</span></button>`;

  // Folha com todas as telas
  $('#menu-mais').innerHTML = `<div class="menu-secao">Explorar</div>${TELAS_PUBLICAS.map((id) => botao(id, TITULOS[id])).join('')}`
    + (operacao.length ? `<div class="menu-secao">${NOME_AREA[perfil] || 'Minha área'}</div>${operacao.map((id) => botao(id, TITULOS[id])).join('')}` : '');

  document.querySelectorAll('[data-tela]').forEach((b) => {
    if (b.closest('#menu, #barra-inferior, #menu-mais')) b.onclick = () => ir(b.dataset.tela);
  });
  $('#inf-mais').onclick = () => $('#abrir-menu').click();
  const area = $('#nav-area');
  if (area) {
    const lista = $('#nav-area-lista');
    area.onclick = (e) => { e.stopPropagation(); lista.hidden = !lista.hidden; area.setAttribute('aria-expanded', !lista.hidden); };
    document.addEventListener('click', () => { lista.hidden = true; area.setAttribute('aria-expanded', 'false'); }, { once: true });
  }

  // Sessão (canto direito)
  if (sessao) {
    const nome = sessao.usuario.nome;
    const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    $('#sessao').innerHTML = `<div class="usuario" title="${esc(nome)} · ${esc(perfil.toLowerCase())}">
        <div class="avatar">${esc(iniciais)}</div>
        <div class="usuario-info"><strong>${esc(nome.split(' ')[0])}</strong><small>${esc(perfil.toLowerCase())}</small></div>
        <button class="botao-icone" id="sair" title="Sair" aria-label="Sair">${icone('sair')}</button></div>`;
    $('#sair').onclick = () => { salvarSessao(null); ir('inicio'); avisar('Você saiu.'); };
  } else {
    $('#sessao').innerHTML = '<button class="btn btn-gradiente" id="btn-entrar">Entrar</button>';
    $('#btn-entrar').onclick = () => ir('login');
  }
  document.title = `${TITULOS[telaAtual] || 'Início'} · CircuitoVerde`;
};

// Logo leva para o início (com o giro do app.js)
$('#logo').onclick = (e) => {
  e.preventDefault();
  const logo = $('#logo');
  logo.classList.remove('girando'); void logo.offsetWidth; logo.classList.add('girando');
  ir('inicio');
};

// Sombra no topo ao rolar
addEventListener('scroll', () => $('#topo').classList.toggle('rolado', scrollY > 8), { passive: true });

// ---------- 3. Animações: entrada em cascata, revelar ao rolar, contadores ----------
function contar(el) {
  const no = [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.textContent));
  if (!no || el.dataset.contado) return;
  const m = no.textContent.match(/^(\s*)([\d.]+(?:,\d+)?)([\s\S]*)$/);
  if (!m) return;
  const casas = (m[2].split(',')[1] || '').length;
  const alvo = Number(m[2].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(alvo) || alvo === 0) return;
  el.dataset.contado = '1';
  const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  if (reduzMovimento) return;
  const t0 = performance.now(), dur = 1100;
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    no.textContent = m[1] + fmt(alvo * e) + m[3];
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

const observador = 'IntersectionObserver' in window ? new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('visivel');
    en.target.querySelectorAll('[data-contar]').forEach(contar);
    observador.unobserve(en.target);
  });
}, { threshold: 0.15 }) : null;

function animarConteudo() {
  const c = $('#conteudo');
  const alvos = c.querySelectorAll('.cabecalho, .cartao, .kpi, .selo-card, .resumo-pontos .chip, .ponto-card');
  alvos.forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 14)); el.classList.add('revelar'); });
  c.querySelectorAll('.kpi .valor, .calc-total b, .selo-card b, .heroi [data-contar]').forEach(contar);
  c.querySelectorAll('[data-revelar]').forEach((el) => (observador ? observador.observe(el) : el.classList.add('visivel')));
}

// Toda troca de tela ganha transição e animações (mesmo vindo de botões do app.js)
const irBase = ir;
ir = async function (tela, parametro) {
  const c = $('#conteudo');
  c.classList.remove('entrar');
  await irBase(tela, parametro);
  void c.offsetWidth;
  c.classList.add('entrar');
  animarConteudo();
};

// ---------- 4. Tela inicial de apresentação ----------
const ILUSTRACAO = `
<svg class="ilustra" viewBox="0 0 520 480" role="img" aria-label="Planeta cercado por eletrônicos sendo reciclados">
  <defs>
    <radialGradient id="g-planeta" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#5EEAD4"/><stop offset=".5" stop-color="#10B981"/><stop offset="1" stop-color="#047857"/>
    </radialGradient>
    <linearGradient id="g-anel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10B981"/><stop offset=".5" stop-color="#06B6D4"/><stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
    <filter id="sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0f172a" flood-opacity=".18"/></filter>
    <marker id="ponta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="url(#g-anel)"/></marker>
  </defs>
  <circle cx="260" cy="240" r="205" fill="url(#g-anel)" opacity=".10"/>
  <g class="ilu-anel">
    <path d="M260 40 A200 200 0 0 1 433 340" fill="none" stroke="url(#g-anel)" stroke-width="10" stroke-linecap="round" marker-end="url(#ponta)"/>
    <path d="M400 384 A200 200 0 0 1 90 345" fill="none" stroke="url(#g-anel)" stroke-width="10" stroke-linecap="round" marker-end="url(#ponta)"/>
    <path d="M70 290 A200 200 0 0 1 200 50" fill="none" stroke="url(#g-anel)" stroke-width="10" stroke-linecap="round" marker-end="url(#ponta)"/>
  </g>
  <g filter="url(#sombra)">
    <circle cx="260" cy="240" r="132" fill="url(#g-planeta)"/>
    <path d="M178 196c22-26 58-30 78-14 15 12 8 31-12 36-22 5-23 26-6 38 15 11 9 34-15 33-31-2-56-30-61-55-2-14 4-27 16-38z" fill="#fff" opacity=".28"/>
    <path d="M296 160c25 0 52 15 60 38 6 18-8 28-26 22-15-5-30 2-31 18-1 19-22 25-33 9-13-19-6-50 7-69 6-9 13-18 23-18z" fill="#fff" opacity=".22"/>
    <path d="M300 300c20-6 42 2 46 16 3 12-12 22-30 24-20 2-36-6-36-17 0-9 8-19 20-23z" fill="#fff" opacity=".2"/>
    <ellipse cx="215" cy="175" rx="38" ry="18" fill="#fff" opacity=".25" transform="rotate(-28 215 175)"/>
  </g>
  <g class="ilu-flutua f-a" filter="url(#sombra)">
    <rect x="66" y="96" width="72" height="72" rx="20" fill="#fff"/>
    <rect x="88" y="110" width="28" height="44" rx="5" fill="none" stroke="#8B5CF6" stroke-width="4"/>
    <path d="M98 147h8" stroke="#8B5CF6" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g class="ilu-flutua f-b" filter="url(#sombra)">
    <rect x="392" y="118" width="80" height="72" rx="20" fill="#fff"/>
    <rect x="410" y="136" width="44" height="28" rx="4" fill="none" stroke="#06B6D4" stroke-width="4"/>
    <path d="M404 171h56" stroke="#06B6D4" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g class="ilu-flutua f-c" filter="url(#sombra)">
    <rect x="404" y="318" width="72" height="72" rx="20" fill="#fff"/>
    <rect x="424" y="338" width="32" height="40" rx="5" fill="none" stroke="#F59E0B" stroke-width="4"/>
    <path d="M434 333h12M432 360l6-9v7h4l-6 9v-7z" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
  <g class="ilu-flutua f-d" filter="url(#sombra)">
    <rect x="44" y="330" width="72" height="72" rx="20" fill="#fff"/>
    <rect x="64" y="350" width="32" height="32" rx="6" fill="none" stroke="#10B981" stroke-width="4"/>
    <path d="M72 346v4M80 346v4M88 346v4M72 382v4M80 382v4M88 382v4M60 358h4M60 366h4M60 374h4M96 358h4M96 366h4M96 374h4" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g class="ilu-brilho"><path d="M470 60l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#FACC15"/><path d="M40 210l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FB7185"/><path d="M330 440l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#8B5CF6"/></g>
</svg>`;

const ETAPAS = [
  ['Descarte', 'O gerador registra o equipamento, o estado e o peso.', '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', '#8B5CF6'],
  ['Coleta', 'A logística reversa é agendada e cada status fica no histórico.', '<path d="M1 6h13v10H1zM14 10h4l3 3v3h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>', '#06B6D4'],
  ['Reciclagem', 'O reciclador separa componentes e materiais.', '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>', '#10B981'],
  ['Destino final', 'Cada componente vai para reciclagem, reuso ou descarte especial.', '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', '#F59E0B'],
  ['Certificado', 'O gerador recebe o comprovante com QR Code.', '<path d="M6 3h9l4 4v14H6z"/><path d="m9 13 2 2 4-4"/>', '#FB7185'],
];

const RECURSOS = [
  ['pontos', 'Pontos de coleta', 'Ache o ponto mais perto com a sua localização. 285 pontos reais nas 27 UFs.', '#10B981'],
  ['panorama', 'Panorama global', 'Gire o planeta e veja onde o lixo eletrônico fica sem destino (dados da ONU).', '#06B6D4'],
  ['calculadora', 'Calculadora de impacto', 'Descubra quanto cobre, alumínio e placa saem do seu aparelho.', '#F59E0B'],
  ['ranking', 'Ranking e selo verde', 'Quem mais deu destino certo ao lixo eletrônico ganha selo ouro, prata ou bronze.', '#8B5CF6'],
  ['validar', 'Certificado com QR Code', 'Confira se um certificado de destinação é verdadeiro.', '#FB7185'],
  ['assistente', 'Assistente com IA', 'Tire dúvidas e consulte o sistema conversando com o assistente.', '#0EA5E9'],
];

async function inicio() {
  const [ind, pan, res] = await Promise.all([
    api('/indicadores').catch(() => null),
    api('/panorama').catch(() => null),
    api('/pontos/resumo').catch(() => null),
  ]);
  const t = ind?.totais || {};
  const pct = t.kg_descartados ? (t.kg_com_destino_comprovado / t.kg_descartados) * 100 : 0;
  const pontosReais = (res || []).find((r) => r.origem === 'ABREE');
  const totalPontos = (res || []).reduce((s, r) => s + Number(r.pontos), 0) || t.pontos_coleta || 0;
  const ano22 = pan?.anos?.find((a) => a.ano === 2022);
  const mundo = ano22?.mundo, brasil = ano22?.paises?.find((p) => p.local === 'Brasil');
  const n1 = (v, c = 1) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

  $('#conteudo').innerHTML = `
  <section class="heroi">
    <div class="heroi-texto">
      <span class="selo-topo">♻ Economia circular de eletrônicos</span>
      <h1>Do descarte ao certificado: <span class="texto-gradiente">cada eletrônico rastreado.</span></h1>
      <p class="heroi-sub">O CircuitoVerde conecta quem descarta, quem transporta e quem recicla, e guarda cada etapa num banco de dados para provar que o lixo eletrônico teve o destino certo.</p>
      <div class="heroi-acoes">
        <button class="btn btn-gradiente btn-grande" id="h-pontos">📍 Encontrar ponto de coleta</button>
        <button class="btn sec btn-grande" id="h-painel">Ver o impacto</button>
      </div>
      <button class="link-assistente" id="h-assist">💬 Ou pergunte ao assistente com IA →</button>
    </div>
    <div class="heroi-arte">
      ${ILUSTRACAO}
      <div class="flutuante fl-1"><b data-contar>${n1(pct)}%</b><span>do peso com destino comprovado</span></div>
      <div class="flutuante fl-2"><b data-contar>${num(totalPontos)}</b><span>pontos de coleta no mapa</span></div>
    </div>
  </section>

  <section class="faixa-numeros" data-revelar>
    <div><b data-contar>${num(t.itens_descartados)}</b><span>itens rastreados</span></div>
    <div><b data-contar>${n1(t.kg_descartados, 0)}</b><span>kg de lixo eletrônico</span></div>
    <div><b data-contar>${num(t.certificados_emitidos)}</b><span>certificados emitidos</span></div>
    <div><b data-contar>${num(pontosReais?.estados || 27)}</b><span>estados com pontos reais</span></div>
  </section>

  <section class="secao" data-revelar>
    <div class="secao-titulo"><span class="sobre">Como funciona</span><h2>O ciclo completo, da gaveta ao certificado</h2></div>
    <ol class="ciclo">
      ${ETAPAS.map(([nome, desc, ic, cor], i) => `<li style="--cor:${cor};--i:${i}">
        <div class="ciclo-icone"><svg viewBox="0 0 24 24">${ic}</svg><span>${i + 1}</span></div>
        <b>${nome}</b><p>${desc}</p></li>`).join('')}
    </ol>
  </section>

  ${mundo ? `<section class="secao mundo-faixa" data-revelar>
    <div class="mundo-texto">
      <span class="sobre">Por que importa</span>
      <h2>O mundo gerou <span class="texto-gradiente">${n1(mundo.gerado_mt)} milhões de toneladas</span> de lixo eletrônico em 2022</h2>
      <p>Só ${n1(mundo.taxa_coleta)}% teve reciclagem documentada.${brasil ? ` No Brasil, foram ${n1(brasil.gerado_mt * 1000, 0)} mil toneladas e só ${n1(brasil.taxa_coleta)}% foi coletado formalmente.` : ''}</p>
      <button class="btn btn-gradiente" id="h-mundo">🌍 Explorar o globo</button>
    </div>
    <div class="mundo-numeros">
      <div class="bolha-num vermelha"><b data-contar>${n1(mundo.sem_destino_mt)}</b><span>milhões de t sem destino documentado</span></div>
      <div class="bolha-num verde"><b data-contar>${n1(mundo.taxa_coleta)}%</b><span>reciclado com documentação</span></div>
      ${brasil ? `<div class="bolha-num roxa"><b data-contar>${n1(brasil.taxa_coleta)}%</b><span>coleta formal no Brasil</span></div>` : ''}
    </div>
  </section>` : ''}

  <section class="secao" data-revelar>
    <div class="secao-titulo"><span class="sobre">O que dá para fazer</span><h2>Ferramentas para descartar melhor</h2></div>
    <div class="recursos">
      ${RECURSOS.map(([id, nome, desc, cor]) => `<button class="recurso" data-ir="${id}" style="--cor:${cor}">
        <span class="recurso-icone">${id === 'assistente' ? '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' : icone(id)}</span>
        <b>${nome}</b><p>${desc}</p><span class="recurso-seta">→</span></button>`).join('')}
    </div>
  </section>

  <footer class="rodape-site">
    <div><b>CircuitoVerde</b> · A3 de Banco de Dados · Universidade Anhembi Morumbi</div>
    <div>Gustavo Trigolo · Mauricio Walazak · Vinicius Radke</div>
    <div class="fontes">Dados: Global E-waste Monitor 2020/2024 (ITU/UNITAR) e base pública de pontos de recebimento da ABREE.</div>
  </footer>`;

  $('#h-pontos').onclick = () => ir('pontos');
  $('#h-painel').onclick = () => ir('painel');
  const abrirAssist = () => { const fab = $('#assist-fab'); if (fab) fab.click(); };
  $('#h-assist').onclick = abrirAssist;
  if ($('#h-mundo')) $('#h-mundo').onclick = () => ir('panorama');
  document.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => (b.dataset.ir === 'assistente' ? abrirAssist() : ir(b.dataset.ir))));
}

// ---------- 5. Início ----------
iniciarApp('inicio');
