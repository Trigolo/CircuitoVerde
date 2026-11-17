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
  const botao = (id, rotulo) => `<button class="nav-item ${ativo(id)}" data-tela="${id}" title="${rotulo}" aria-label="${rotulo}" ${id === telaAtual ? 'aria-current="page"' : ''}>${icone(id)}<span>${rotulo}</span></button>`;

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
      <span class="selo-topo">${icone('folha')}Economia circular de eletrônicos</span>
      <h1>Do descarte ao certificado: <span class="texto-gradiente">cada eletrônico rastreado.</span></h1>
      <p class="heroi-sub">O CircuitoVerde conecta quem descarta, quem transporta e quem recicla, e guarda cada etapa num banco de dados para provar que o lixo eletrônico teve o destino certo.</p>
      <div class="heroi-acoes">
        <button class="btn btn-gradiente btn-grande" id="h-pontos">${icone('local')}Encontrar ponto de coleta</button>
        <button class="btn sec btn-grande" id="h-painel">Ver o impacto</button>
      </div>
      <button class="link-assistente" id="h-assist">${icone('chat')}Ou pergunte ao assistente com IA →</button>
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
      <button class="btn btn-gradiente" id="h-mundo">${icone('panorama')}Explorar o globo</button>
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

// ---------- 5. Meus descartes em cartões com progresso ----------
const ETAPA_ITEM = { null: 1, SOLICITADA: 2, AGENDADA: 3, EM_TRANSITO: 4, ENTREGUE: 5, CANCELADA: 1 };
const ICONE_EQUIP = (nome) => {
  const n = (nome || '').toLowerCase();
  if (/smart|tablet/.test(n)) return '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>';
  if (/note|monitor|tv/.test(n)) return '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M2 20h20"/>';
  if (/desk/.test(n)) return '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>';
  if (/impress/.test(n)) return '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>';
  return '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4"/>';
};
TELAS_EXTRAS.meus = async function meusV3() {
  const lista = await api('/itens');
  const etapa = (i) => (i.certificado ? 6 : ETAPA_ITEM[i.status_atual] || 1);
  const grupos = {
    todos: () => true,
    andamento: (i) => !i.certificado && i.status_atual && i.status_atual !== 'CANCELADA',
    pendentes: (i) => !i.status_atual || i.status_atual === 'CANCELADA',
    certificados: (i) => !!i.certificado,
  };
  const esperandoCert = lista.filter((i) => i.status_atual === 'ENTREGUE' && !i.certificado).length;
  const conta = Object.fromEntries(Object.entries(grupos).map(([k, f]) => [k, lista.filter(f).length]));
  const NOMES_ETAPA = ['Registrado', 'Coleta solicitada', 'Agendada', 'Em trânsito', 'Entregue', 'Certificado'];
  let filtro = 'todos';

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div><h1>Meus descartes</h1><p class="sub">Acompanhe cada item, da coleta até o certificado de destinação.</p></div>
      <button class="btn" id="m-novo">+ Novo descarte</button>
    </div>
    ${esperandoCert ? `<div class="alerta-amarelo m-alerta">${icone('check')}<span><b>${num(esperandoCert)} ${esperandoCert === 1 ? 'item já foi entregue' : 'itens já foram entregues'}</b> e ${esperandoCert === 1 ? 'aguarda' : 'aguardam'} o reciclador separar os componentes e emitir o certificado.</span></div>` : ''}
    <div class="m-resumo">
      <div class="cartao kpi"><span class="rotulo">Itens registrados</span><span class="valor">${num(conta.todos)}</span></div>
      <div class="cartao kpi"><span class="rotulo">Em andamento</span><span class="valor">${num(conta.andamento)}</span></div>
      <div class="cartao kpi"><span class="rotulo">Aguardando coleta</span><span class="valor">${num(conta.pendentes)}</span></div>
      <div class="cartao kpi"><span class="rotulo">Com certificado</span><span class="valor">${num(conta.certificados)}</span></div>
    </div>
    <div class="segmentado" id="m-filtro" style="margin:4px 0 16px">
      ${[['todos', 'Todos'], ['andamento', 'Em andamento'], ['pendentes', 'Aguardando coleta'], ['certificados', 'Certificados']]
        .map(([k, n]) => `<button data-f="${k}" class="${k === filtro ? 'ativo' : ''}">${n}<small>${conta[k]}</small></button>`).join('')}
    </div>
    <div class="m-grade" id="m-grade"></div>`;

  const desenhar = () => {
    const itens = lista.filter(grupos[filtro]);
    $('#m-grade').innerHTML = itens.length ? itens.map((i, idx) => {
      const e = etapa(i);
      return `<article class="m-item cartao revelar" style="--i:${Math.min(idx, 14)}">
        <div class="m-topo"><span class="m-icone"><svg viewBox="0 0 24 24">${ICONE_EQUIP(i.equipamento)}</svg></span>
          <div><b>${esc(i.equipamento)}</b><small>item nº ${i.id_item}${i.reciclador ? ' · ' + esc(i.reciclador) : ''}</small></div>
          ${i.certificado ? '<span class="status ENTREGUE">Certificado</span>' : badge(i.status_atual)}</div>
        <div class="m-progresso" role="progressbar" aria-valuemin="1" aria-valuemax="6" aria-valuenow="${e}" aria-label="${NOMES_ETAPA[e - 1]}">
          ${NOMES_ETAPA.map((_, k) => `<span class="${k < e ? 'feito' : ''}"></span>`).join('')}</div>
        <div class="m-rodape"><small>Etapa ${e} de 6 · <b>${NOMES_ETAPA[e - 1]}</b></small>
          <div class="acoes">
            ${!i.status_atual || i.status_atual === 'CANCELADA' ? `<button class="btn peq" data-coleta="${i.id_item}">Solicitar coleta</button>` : ''}
            <button class="btn sec peq" data-rastrear="${i.id_item}">Rastrear</button></div></div>
      </article>`;
    }).join('') : `<div class="cartao vazio m-vazio"><b>Nada por aqui.</b><br>Nenhum item neste filtro.</div>`;
    ligarBotoesItens();
  };
  document.querySelectorAll('#m-filtro button').forEach((b) => (b.onclick = () => {
    filtro = b.dataset.f;
    document.querySelectorAll('#m-filtro button').forEach((x) => x.classList.toggle('ativo', x === b));
    desenhar();
  }));
  $('#m-novo').onclick = () => ir('novo');
  desenhar();
};

// ---------- 6. Criar conta (gerador pessoa ou empresa) ----------
Object.assign(TITULOS, { cadastro: 'Criar conta' });
const soDigitos = (v) => String(v || '').replace(/\D/g, '');
TELAS_EXTRAS.cadastro = async function cadastro() {
  if (sessao) return ir(telaInicial(sessao.usuario.perfil));
  $('#conteudo').innerHTML = `
    <div class="cartao cadastro">
      <h1>Criar conta</h1>
      <p class="sub" id="c-sub">Para registrar seus eletrônicos, pedir a coleta e receber o certificado de destinação.</p>
      <form id="f-cadastro" novalidate>
        <fieldset>
          <legend>Como você vai usar o CircuitoVerde</legend>
          <div class="segmentado" id="c-perfil" role="radiogroup" aria-label="Perfil da conta">
            <button type="button" role="radio" aria-checked="true" class="ativo" data-perfil="GERADOR">Quero descartar</button>
            <button type="button" role="radio" aria-checked="false" data-perfil="TRANSPORTADOR">Sou transportador</button>
            <button type="button" role="radio" aria-checked="false" data-perfil="RECICLADOR">Sou reciclador</button>
          </div>
        </fieldset>
        <fieldset data-perfis="GERADOR TRANSPORTADOR">
          <legend>Você é</legend>
          <div class="segmentado" id="c-tipo" role="radiogroup" aria-label="Tipo de conta">
            <button type="button" role="radio" aria-checked="true" class="ativo" data-tipo="PF">Pessoa (CPF)</button>
            <button type="button" role="radio" aria-checked="false" data-tipo="PJ">Empresa (CNPJ)</button>
          </div>
        </fieldset>
        <div class="linha">
          <label><span id="c-rot-nome">Nome completo</span> <input name="nome" autocomplete="name" required minlength="3" maxlength="120"></label>
          <label><span id="c-rot-doc">CPF</span> <input name="documento" inputmode="numeric" autocomplete="off" required placeholder="000.000.000-00"></label>
        </div>
        <div class="linha">
          <label>E-mail <input name="email" type="email" autocomplete="email" required maxlength="150"></label>
          <label data-perfis="GERADOR">Telefone (opcional) <input name="telefone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(41) 99999-0000"></label>
          <label data-perfis="TRANSPORTADOR">Placa do veículo <input name="placa" required maxlength="8" placeholder="ABC1D23" autocomplete="off"></label>
        </div>
        <div class="linha" data-perfis="RECICLADOR">
          <label>Licença ambiental <input name="licenca" required maxlength="40" placeholder="LO-PR-2026-0001"></label>
          <label>Capacidade (kg por mês) <input name="capacidade" type="number" inputmode="numeric" required min="1" step="1" placeholder="5000"></label>
        </div>
        <label>Senha <input name="senha" type="password" autocomplete="new-password" required minlength="8" aria-describedby="c-senha-dica">
          <small id="c-senha-dica" class="nota">Pelo menos 8 caracteres.</small></label>

        <fieldset data-perfis="GERADOR RECICLADOR">
          <legend id="c-leg-end">Endereço (onde o item pode ser coletado)</legend>
          <div class="linha">
            <label>CEP <input name="cep" inputmode="numeric" autocomplete="postal-code" required placeholder="00000-000" aria-describedby="c-cep-dica">
              <small id="c-cep-dica" class="nota">Preenchemos a rua e a cidade pelo CEP.</small></label>
            <label>Número <input name="numero" required maxlength="10"></label>
            <label>Complemento <input name="complemento" maxlength="60" placeholder="Apto, bloco..."></label>
          </div>
          <div class="linha">
            <label>Rua <input name="logradouro" autocomplete="address-line1" required maxlength="150"></label>
            <label>Bairro <input name="bairro" required maxlength="80"></label>
          </div>
          <div class="linha">
            <label>Cidade <input name="cidade" autocomplete="address-level2" required maxlength="80"></label>
            <label>UF <input name="uf" autocomplete="address-level1" required maxlength="2" placeholder="PR"></label>
          </div>
        </fieldset>
        <p class="nota">Seus dados ficam só no banco do CircuitoVerde. No ranking público, pessoas aparecem apenas com o primeiro nome e a inicial (LGPD).</p>
        <div class="acoes"><button class="btn btn-grande" id="c-enviar">Criar conta e entrar</button>
          <button type="button" class="btn sec" id="c-login">Já tenho conta</button></div>
      </form>
    </div>`;

  const f = $('#f-cadastro');
  let tipo = 'PF';
  let perfil = 'GERADOR';
  const SUB = {
    GERADOR: 'Para registrar seus eletrônicos, pedir a coleta e receber o certificado de destinação.',
    TRANSPORTADOR: 'Para aceitar coletas, buscar os eletrônicos e levar até o reciclador.',
    RECICLADOR: 'Para receber os eletrônicos, separar os componentes e emitir o certificado de destinação.',
  };
  const LEG_END = { GERADOR: 'Endereço (onde o item pode ser coletado)', RECICLADOR: 'Endereço da recicladora' };

  function rotulosDoTipo() {
    $('#c-rot-nome').textContent = tipo === 'PF' ? 'Nome completo' : 'Razão social';
    $('#c-rot-doc').textContent = tipo === 'PF' ? 'CPF' : 'CNPJ';
    f.documento.placeholder = tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00';
    f.documento.value = '';
  }
  function escolherTipo(novo) {
    tipo = novo;
    document.querySelectorAll('#c-tipo button').forEach((x) => { const sim = x.dataset.tipo === tipo; x.classList.toggle('ativo', sim); x.setAttribute('aria-checked', sim); });
    rotulosDoTipo();
  }
  // Mostra só os campos do perfil escolhido; campos escondidos ficam desativados (não são validados nem enviados)
  function aplicarPerfil() {
    document.querySelectorAll('#c-perfil button').forEach((x) => { const sim = x.dataset.perfil === perfil; x.classList.toggle('ativo', sim); x.setAttribute('aria-checked', sim); });
    f.querySelectorAll('[data-perfis]').forEach((el) => {
      const mostra = el.dataset.perfis.split(' ').includes(perfil);
      el.hidden = !mostra;
      el.querySelectorAll('input').forEach((i) => { i.disabled = !mostra; });
      if (el.tagName === 'LABEL') el.querySelector('input').disabled = !mostra;
    });
    $('#c-sub').textContent = SUB[perfil];
    if (LEG_END[perfil]) $('#c-leg-end').textContent = LEG_END[perfil];
    if (perfil === 'RECICLADOR') escolherTipo('PJ');   // reciclador é sempre empresa (CNPJ)
  }
  document.querySelectorAll('#c-perfil button').forEach((b) => (b.onclick = () => { perfil = b.dataset.perfil; aplicarPerfil(); }));
  document.querySelectorAll('#c-tipo button').forEach((b) => (b.onclick = () => escolherTipo(b.dataset.tipo)));
  aplicarPerfil();

  // Máscaras leves (aceita digitar com ou sem pontuação)
  const mascara = (campo, fmt) => campo.addEventListener('input', () => { campo.value = fmt(soDigitos(campo.value)); });
  mascara(f.cep, (d) => d.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'));
  mascara(f.documento, (d) => tipo === 'PF'
    ? d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    : d.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'));
  f.uf.addEventListener('input', () => { f.uf.value = f.uf.value.replace(/[^a-z]/gi, '').toUpperCase(); });
  f.placa.addEventListener('input', () => { f.placa.value = f.placa.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7); });

  // Busca o endereço pelo CEP (ViaCEP, serviço público); se falhar, a pessoa digita
  f.cep.addEventListener('blur', async () => {
    const cep = soDigitos(f.cep.value);
    if (cep.length !== 8) return;
    $('#c-cep-dica').textContent = 'Buscando o endereço...';
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((x) => x.json());
      if (r.erro) throw new Error();
      f.logradouro.value = r.logradouro || f.logradouro.value; f.bairro.value = r.bairro || f.bairro.value;
      f.cidade.value = r.localidade || ''; f.uf.value = r.uf || '';
      $('#c-cep-dica').textContent = 'Endereço encontrado. Confira e informe o número.';
      f.numero.focus();
    } catch { $('#c-cep-dica').textContent = 'Não achamos esse CEP. Preencha o endereço à mão.'; }
  });

  $('#c-login').onclick = () => ir('login');
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    const v = Object.fromEntries(new FormData(f));   // campos desativados (de outro perfil) não entram
    const botao = $('#c-enviar'); botao.disabled = true; botao.textContent = 'Criando conta...';
    const corpo = { perfil, nome: v.nome, email: v.email, senha: v.senha, tipo, documento: v.documento };
    if (perfil === 'GERADOR') corpo.telefone = v.telefone;
    if (perfil === 'TRANSPORTADOR') corpo.placa = v.placa;
    if (perfil === 'RECICLADOR') { corpo.licenca = v.licenca; corpo.capacidade = Number(v.capacidade); }
    if (perfil !== 'TRANSPORTADOR') {
      corpo.endereco = { cep: v.cep, logradouro: v.logradouro, numero: v.numero, complemento: v.complemento, bairro: v.bairro, cidade: v.cidade, uf: v.uf };
    }
    try {
      const r = await api('/auth/cadastro', { metodo: 'POST', corpo });
      salvarSessao({ token: r.token, usuario: r.usuario });
      const primeiro = r.usuario.nome.split(' ')[0];
      const MSG = {
        GERADOR: `Conta criada. Bem-vindo, ${primeiro}! Registre o seu primeiro eletrônico.`,
        TRANSPORTADOR: `Conta criada. Bem-vindo, ${primeiro}! Veja as coletas disponíveis para aceitar.`,
        RECICLADOR: `Conta criada. Bem-vindo, ${primeiro}! As coletas destinadas a você aparecem aqui.`,
      };
      avisar(MSG[r.usuario.perfil] || `Conta criada. Bem-vindo, ${primeiro}!`);
      ir(r.usuario.perfil === 'GERADOR' ? 'novo' : telaInicial(r.usuario.perfil));
    } catch (err) {
      if (err instanceof TelaTrocada) return;
      avisar(err.message, true);
      botao.disabled = false; botao.textContent = 'Criar conta e entrar';
    }
  };
};

// ---------- 6b. Gestão de pontos de coleta (ADMIN aprova; RECICLADOR cadastra os dele) ----------
OPERACAO_POR_PERFIL.ADMIN.push('gpontos');
OPERACAO_POR_PERFIL.RECICLADOR.push('gpontos');
Object.assign(TITULOS, { gpontos: 'Gerenciar pontos' });
Object.assign(ICONES, { gpontos: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><path d="M12 7v5M9.5 9.5h5"/>' });
// Modais comuns voltam à largura normal (o formulário de ponto usa uma caixa mais larga)
const abrirModalBase = abrirModal;
abrirModal = (html) => { $('#modal .modal-caixa')?.classList.remove('modal-larga'); abrirModalBase(html); };
const STATUS_PONTO = { PENDENTE: ['Aguardando aprovação', 'pendente'], APROVADO: ['Publicado', 'pronto'], REJEITADO: ['Rejeitado', 'rejeitado'] };
const CATEGORIAS_PONTO = { ...NOMES_CATEGORIA, OUTRO: 'Outros' };

TELAS_EXTRAS.gpontos = async function gpontos() {
  const ehAdmin = sessao.usuario.perfil === 'ADMIN';
  let filtro = ehAdmin ? 'PENDENTE' : '';
  let busca = '';
  let mostrar = 25;
  let dados = await api('/pontos/gestao');

  const conta = (st) => (dados.contagem.find((c) => c.status === st) || { total: 0 }).total;
  const inativos = () => dados.pontos.filter((p) => !p.ativo).length;
  if (ehAdmin && !conta('PENDENTE')) filtro = '';

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div><h1>${ehAdmin ? 'Gestão de pontos de coleta' : 'Meus pontos de coleta'}</h1>
      <p class="sub">${ehAdmin
        ? 'Aprove os pontos enviados pelos recicladores, cadastre novos e mantenha o mapa público em dia.'
        : 'Cadastre os locais onde você recebe eletrônicos. Eles aparecem no mapa público depois da aprovação do administrador.'}</p></div>
      <button class="btn" id="gp-novo">${icone('novo')} Novo ponto</button>
    </div>
    <div class="m-resumo" id="gp-resumo"></div>
    <div class="cartao barra-filtros" style="margin-bottom:18px">
      <div class="segmentado" id="gp-filtro" role="tablist" aria-label="Filtrar por status"></div>
      ${campoBusca('gp-busca', 'Buscar por nome, cidade ou UF')}
    </div>
    <div class="cartao" id="gp-lista"></div>`;

  function resumo() {
    const kpi = (rot, v, cls = '') => `<div class="cartao kpi"><span class="rotulo">${rot}</span><span class="valor ${cls}">${num(v)}</span></div>`;
    $('#gp-resumo').innerHTML = kpi('Aguardando aprovação', conta('PENDENTE'), conta('PENDENTE') ? 'gp-alerta' : '')
      + kpi('Publicados', conta('APROVADO')) + kpi('Rejeitados', conta('REJEITADO')) + kpi('Desativados', inativos());
    const abas = [['', 'Todos'], ['PENDENTE', `Pendentes${conta('PENDENTE') ? ` <small>${conta('PENDENTE')}</small>` : ''}`], ['APROVADO', 'Publicados'], ['REJEITADO', 'Rejeitados'], ['INATIVO', 'Desativados']];
    $('#gp-filtro').innerHTML = abas.map(([v, r]) => `<button type="button" role="tab" data-f="${v}" class="${v === filtro ? 'ativo' : ''}" aria-selected="${v === filtro}">${r}</button>`).join('');
    document.querySelectorAll('#gp-filtro button').forEach((b) => (b.onclick = () => { filtro = b.dataset.f; mostrar = 25; resumo(); lista(); }));
  }

  function lista() {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);
    const itens = dados.pontos.filter((p) => (filtro === 'INATIVO' ? !p.ativo : (!filtro || p.status === filtro)))
      .filter((p) => { const t = semAcento(`${p.nome} ${p.cidade} ${p.uf} ${p.canal} ${p.reciclador || ''}`); return termos.every((x) => t.includes(x)); });
    $('#gp-busca-conta').textContent = busca ? `${itens.length} encontrado(s)` : '';
    if (!itens.length) {
      $('#gp-lista').innerHTML = `<p class="vazio">${filtro === 'PENDENTE' ? 'Nenhum ponto aguardando aprovação.' : ehAdmin ? 'Nenhum ponto neste filtro.' : 'Você ainda não cadastrou pontos. Clique em "Novo ponto".'}</p>`;
      return;
    }
    const linha = (p) => {
      const [rot, cls] = STATUS_PONTO[p.status] || [p.status, 'concluido'];
      const cats = String(p.categorias || '').split(',').filter(Boolean).map((c) => `<span class="gp-cat">${esc(CATEGORIAS_PONTO[c] || c)}</span>`).join('');
      const acoes = [];
      if (ehAdmin && p.status !== 'APROVADO') acoes.push(`<button class="btn peq" data-aprovar="${p.id_ponto}">Aprovar</button>`);
      if (ehAdmin && p.status === 'PENDENTE') acoes.push(`<button class="btn peq sec" data-rejeitar="${p.id_ponto}">Rejeitar</button>`);
      acoes.push(`<button class="btn peq sec" data-editar="${p.id_ponto}">Editar</button>`);
      acoes.push(`<button class="btn peq sec" data-ativo="${p.id_ponto}" data-valor="${p.ativo ? 0 : 1}">${p.ativo ? 'Desativar' : 'Reativar'}</button>`);
      acoes.push(`<button class="btn peq sec" data-hist="${p.id_ponto}" title="Histórico de status">Histórico</button>`);
      return `<tr class="${p.ativo ? '' : 'gp-inativo'}">
        <td><b>${esc(p.nome)}</b><br><small style="color:var(--texto-2)">${esc(p.cidade)}/${esc(p.uf)} · ${esc(p.canal)}${ehAdmin && p.reciclador ? ` · ${esc(p.reciclador)}` : ''}</small></td>
        <td><div class="gp-cats">${cats}</div></td>
        <td><span class="etapa etapa-${cls}">${rot}</span>${p.ativo ? '' : ' <span class="etapa etapa-concluido">Desativado</span>'}
          ${p.status === 'REJEITADO' && p.motivo_rejeicao ? `<br><small class="gp-motivo">Motivo: ${esc(p.motivo_rejeicao)}</small>` : ''}</td>
        <td class="acoes">${acoes.join('')}</td>
      </tr>`;
    };
    $('#gp-lista').innerHTML = `<table><tr><th>Ponto</th><th>Recebe</th><th>Situação</th><th>Ações</th></tr>
      ${itens.slice(0, mostrar).map(linha).join('')}</table>
      ${itens.length > mostrar ? `<div style="text-align:center;margin-top:14px"><button class="btn sec" id="gp-mais">Mostrar mais (${itens.length - mostrar} restantes)</button></div>` : ''}`;
    $('#gp-mais') && ($('#gp-mais').onclick = () => { mostrar += 50; lista(); });
    const acharPonto = (id) => dados.pontos.find((p) => p.id_ponto === Number(id));
    document.querySelectorAll('[data-aprovar]').forEach((b) => (b.onclick = () => mudar(`/pontos/${b.dataset.aprovar}/status`, { status: 'APROVADO' }, 'Ponto aprovado e publicado no mapa.')));
    document.querySelectorAll('[data-rejeitar]').forEach((b) => (b.onclick = () => rejeitar(acharPonto(b.dataset.rejeitar))));
    document.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = () => formularioPonto(acharPonto(b.dataset.editar))));
    document.querySelectorAll('[data-ativo]').forEach((b) => (b.onclick = () => mudar(`/pontos/${b.dataset.ativo}/ativo`, { ativo: b.dataset.valor === '1' },
      b.dataset.valor === '1' ? 'Ponto reativado.' : 'Ponto desativado. Ele saiu do mapa público.')));
    document.querySelectorAll('[data-hist]').forEach((b) => (b.onclick = () => historico(acharPonto(b.dataset.hist))));
  }

  async function recarregar() { dados = await api('/pontos/gestao'); resumo(); lista(); }
  async function mudar(url, corpo, msg) {
    try { await api(url, { metodo: 'PATCH', corpo }); fecharModal(); avisar(msg); await recarregar(); }
    catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
  }
  function rejeitar(p) {
    abrirModal(`<h2>Rejeitar "${esc(p.nome)}"</h2>
      <p class="sub">O reciclador vê o motivo e pode corrigir o cadastro e enviar de novo.</p>
      <form id="f-rejeitar"><label>Motivo <textarea name="motivo" rows="3" required minlength="5" maxlength="200" placeholder="Ex.: endereço não confere com o CNPJ"></textarea></label>
      <div class="acoes"><button class="btn">Rejeitar ponto</button></div></form>`);
    $('#f-rejeitar').onsubmit = (e) => { e.preventDefault(); if (!e.target.reportValidity()) return;
      mudar(`/pontos/${p.id_ponto}/status`, { status: 'REJEITADO', motivo: new FormData(e.target).get('motivo') }, 'Ponto rejeitado.'); };
  }
  async function historico(p) {
    const h = await api(`/pontos/${p.id_ponto}/historico`);
    const nome = (x) => (x.ativo ? (STATUS_PONTO[x.status] || [x.status])[0] : 'Desativado');
    abrirModal(`<h2>Histórico · ${esc(p.nome)}</h2>
      <p class="sub">Gravado automaticamente pelo banco (trigger trg_ponto_au).</p>
      ${h.length ? `<ol class="gp-hist">${h.map((x) => `<li><b>${esc(nome(x))}</b><span>${dataBR(String(x.data_hora).slice(0, 16))}</span>${x.motivo ? `<small>${esc(x.motivo)}</small>` : ''}</li>`).join('')}</ol>`
        : '<p class="vazio">Este ponto veio da carga inicial, antes do histórico existir.</p>'}`);
  }

  // Formulário de cadastro/edição com mapa para marcar o local exato
  function formularioPonto(p) {
    const e = p || {};
    const cats = new Set(String(e.categorias || '').split(',').filter(Boolean));
    abrirModal(`<h2>${p ? 'Editar ponto' : 'Novo ponto de coleta'}</h2>
      ${!ehAdmin ? `<p class="sub">${p ? 'Ao salvar, o ponto volta para aprovação do administrador.' : 'Depois de enviado, o administrador confere e publica no mapa.'}</p>` : ''}
      <form id="f-ponto" novalidate class="gp-form">
        <div class="linha">
          <label>Nome do ponto <input name="nome" required minlength="3" maxlength="120" value="${esc(e.nome || '')}" placeholder="Ex.: Recicla Sul - Unidade Centro"></label>
          <label>Tipo de local <select name="canal" required>${dados.canais.map((c) => `<option ${c === (e.canal || 'Reciclador') ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        </div>
        <div class="linha">
          <label>Telefone (opcional) <input name="telefone" type="tel" inputmode="tel" maxlength="16" value="${esc(e.telefone || '')}" placeholder="(41) 3333-0000"></label>
          <label>Horário (opcional) <input name="horario" maxlength="120" value="${esc(e.horario || '')}" placeholder="Seg a sex, 8h às 18h"></label>
        </div>
        <fieldset><legend>Recebe</legend><div class="gp-checks">${Object.entries(CATEGORIAS_PONTO).map(([k, v]) =>
          `<label class="gp-check"><input type="checkbox" name="cat" value="${k}" ${cats.has(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Endereço</legend>
          <div class="linha">
            <label>CEP <input name="cep" inputmode="numeric" required placeholder="00000-000" value="${esc(e.cep || '')}"><small class="nota" id="gp-cep-dica">Preenchemos a rua pelo CEP.</small></label>
            <label>Número <input name="numero" required maxlength="10" value="${esc(e.numero || '')}"></label>
            <label>Complemento <input name="complemento" maxlength="60" value="${esc(e.complemento || '')}"></label>
          </div>
          <div class="linha">
            <label>Rua <input name="logradouro" required maxlength="150" value="${esc(e.logradouro || '')}"></label>
            <label>Bairro <input name="bairro" required maxlength="80" value="${esc(e.bairro || '')}"></label>
          </div>
          <div class="linha">
            <label>Cidade <input name="cidade" required maxlength="80" value="${esc(e.cidade || '')}"></label>
            <label>UF <input name="uf" required maxlength="2" value="${esc(e.uf || '')}" placeholder="PR"></label>
          </div>
        </fieldset>
        <fieldset><legend>Localização no mapa</legend>
          <p class="nota" id="gp-mapa-dica">Clique no mapa para marcar o local, ou use "Localizar pelo endereço". Você pode arrastar o marcador.</p>
          <div id="gp-mapa"></div>
          <div class="acoes" style="margin-top:8px"><button type="button" class="btn sec peq" id="gp-localizar">Localizar pelo endereço</button>
            <small class="nota" id="gp-coord"></small></div>
        </fieldset>
        <div class="acoes"><button class="btn btn-grande" id="gp-salvar">${p ? 'Salvar alterações' : ehAdmin ? 'Cadastrar e publicar' : 'Enviar para aprovação'}</button></div>
      </form>`);
    $('#modal .modal-caixa')?.classList.add('modal-larga');

    const f = $('#f-ponto');
    let coord = e.latitude != null ? [Number(e.latitude), Number(e.longitude)] : null;
    const mapa = L.map('gp-mapa', { zoomControl: true }).setView(coord || [-14.5, -52], coord ? 16 : 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
    let marcador = null;
    const marcar = (lat, lng, zoom) => {
      coord = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
      if (!marcador) { marcador = L.marker(coord, { draggable: true, icon: L.divIcon({ className: 'gp-pino', html: '<span></span>', iconSize: [28, 38], iconAnchor: [14, 36] }) }).addTo(mapa); marcador.on('dragend', () => { const ll = marcador.getLatLng(); marcar(ll.lat, ll.lng); }); }
      else marcador.setLatLng(coord);
      if (zoom) mapa.setView(coord, zoom);
      $('#gp-coord').textContent = `Lat ${coord[0]} · Lng ${coord[1]}`;
    };
    if (coord) marcar(coord[0], coord[1]);
    mapa.on('click', (ev) => marcar(ev.latlng.lat, ev.latlng.lng));
    setTimeout(() => mapa.invalidateSize(), 80);

    f.cep.addEventListener('input', () => { f.cep.value = soDigitos(f.cep.value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'); });
    f.uf.addEventListener('input', () => { f.uf.value = f.uf.value.replace(/[^a-z]/gi, '').toUpperCase(); });
    f.cep.addEventListener('blur', async () => {
      const cep = soDigitos(f.cep.value); if (cep.length !== 8) return;
      $('#gp-cep-dica').textContent = 'Buscando...';
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((x) => x.json()); if (r.erro) throw new Error();
        f.logradouro.value = r.logradouro || f.logradouro.value; f.bairro.value = r.bairro || f.bairro.value; f.cidade.value = r.localidade || ''; f.uf.value = r.uf || '';
        $('#gp-cep-dica').textContent = 'Endereço encontrado. Informe o número e localize no mapa.'; f.numero.focus();
      } catch { $('#gp-cep-dica').textContent = 'CEP não encontrado. Preencha à mão.'; }
    });
    // Geocodificação pelo OpenStreetMap (Nominatim); se não achar o número, tenta só rua e cidade
    $('#gp-localizar').onclick = async () => {
      const b = $('#gp-localizar'); b.disabled = true; b.textContent = 'Localizando...';
      const q = (partes) => fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(partes.filter(Boolean).join(', '))).then((r) => r.json());
      try {
        let r = await q([`${f.logradouro.value} ${f.numero.value}`, f.cidade.value, f.uf.value]);
        if (!r.length) r = await q([f.logradouro.value, f.cidade.value, f.uf.value]);
        if (!r.length) r = await q([f.cidade.value, f.uf.value]);
        if (!r.length) throw new Error();
        marcar(Number(r[0].lat), Number(r[0].lon), 17);
        $('#gp-mapa-dica').textContent = 'Confira o marcador. Se não estiver no lugar exato, arraste ou clique no ponto certo.';
      } catch { $('#gp-mapa-dica').textContent = 'Não encontramos esse endereço. Clique no mapa para marcar o local.'; }
      b.disabled = false; b.textContent = 'Localizar pelo endereço';
    };

    f.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!f.reportValidity()) return;
      const categorias = [...f.querySelectorAll('[name=cat]:checked')].map((c) => c.value);
      if (!categorias.length) return avisar('Marque pelo menos um tipo de material que o ponto recebe.', true);
      if (!coord) return avisar('Marque o local no mapa (clique no mapa ou use "Localizar pelo endereço").', true);
      const v = Object.fromEntries(new FormData(f));
      const corpo = { nome: v.nome, canal: v.canal, telefone: v.telefone, horario: v.horario, categorias,
        endereco: { cep: v.cep, logradouro: v.logradouro, numero: v.numero, complemento: v.complemento, bairro: v.bairro, cidade: v.cidade, uf: v.uf, latitude: coord[0], longitude: coord[1] } };
      const botao = $('#gp-salvar'); botao.disabled = true;
      try {
        const r = await api(p ? `/pontos/${p.id_ponto}` : '/pontos', { metodo: p ? 'PUT' : 'POST', corpo });
        fecharModal(); avisar(r.mensagem); filtro = ''; await recarregar();
      } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); botao.disabled = false; }
    };
  }

  $('#gp-novo').onclick = () => formularioPonto(null);
  $('#gp-busca').addEventListener('input', (e) => { busca = e.target.value; mostrar = 25; lista(); });
  resumo(); lista();
};

// ---------- 7. Início ----------
// Espera os outros scripts (app-v5.js registra telas novas) antes de abrir a primeira tela
addEventListener('DOMContentLoaded', () => iniciarApp('inicio'));
