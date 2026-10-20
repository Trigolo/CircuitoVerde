// =====================================================================
// CircuitoVerde - Versão 2 do frontend
// Tema claro/escuro, panorama global (globo), pontos de coleta com
// geolocalização, calculadora de impacto, ranking com selo verde,
// rastreio em etapas e certificado em PDF com QR Code.
// Carregado depois do app.js (usa as funções dele: api, ir, esc, kg...).
// =====================================================================

// Endereço base dos arquivos locais (vendor). Aberto por duplo clique, busca na API.
const BASE_SITE = location.protocol === 'file:' ? 'http://localhost:3000/' : '';
const fmt1 = (v, casas = 1) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// ---------- 1. Tema claro / escuro ----------
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try { localStorage.setItem('cv_tema', tema); } catch {}
  $('#botao-tema').setAttribute('aria-pressed', tema === 'escuro');
}
$('#botao-tema').onclick = () => aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro');
// Se o usuário nunca escolheu, acompanha o tema do sistema operacional
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
  let salvo = null; try { salvo = localStorage.getItem('cv_tema'); } catch {}
  if (!salvo) document.documentElement.dataset.tema = e.matches ? 'escuro' : 'claro';
});

// ---------- 2. Novas telas no menu ----------
TELAS_PUBLICAS.splice(0, TELAS_PUBLICAS.length, 'painel', 'panorama', 'pontos', 'calculadora', 'ranking', 'validar');
Object.assign(TITULOS, {
  panorama: 'Panorama global', calculadora: 'Calculadora de impacto', ranking: 'Ranking e selo verde', validar: 'Validar certificado',
});
Object.assign(ICONES, {
  panorama: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h4"/>',
  ranking: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  validar: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
});
Object.assign(TELAS_EXTRAS, { panorama, pontos: pontosV2, calculadora, ranking, validar });

// =====================================================================
// 3. PANORAMA GLOBAL (globo 3D com dados da ONU)
// =====================================================================
let cacheMundo = null;
async function carregarMundo() {
  if (!cacheMundo) {
    const [topo, regioes] = await Promise.all([
      fetch(BASE_SITE + 'vendor/countries-110m.json').then((r) => r.json()),
      fetch(BASE_SITE + 'vendor/paises-regioes.json').then((r) => r.json()),
    ]);
    cacheMundo = { topo, regioes };
  }
  return cacheMundo;
}

async function panorama() {
  const [dados, mundo] = await Promise.all([api('/panorama'), carregarMundo()]);
  const anos = dados.anos.map((a) => a.ano);
  let ano = anos.includes(2022) ? 2022 : anos[anos.length - 1];
  const porAno = Object.fromEntries(dados.anos.map((a) => [a.ano, a]));
  const semDestino = (r) => Number(r.sem_destino_mt);

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div>
        <h1>Descarte inadequado de lixo eletrônico no mundo</h1>
        <p class="sub">Volume que <b>não</b> foi coletado e reciclado de forma documentada (dados da ONU, tabela indicador_ewaste).</p>
      </div>
      <div class="segmentado" id="anos">${anos.map((a) => `<button data-ano="${a}" class="${a === ano ? 'ativo' : ''}">${a}${porAno[a].estimativa ? '<small>est.</small>' : ''}</button>`).join('')}</div>
    </div>
    <div class="dash">
      <div class="cartao c8 globo-card" id="globo-card">
        <svg id="globo" aria-label="Globo interativo com o descarte inadequado por região"></svg>
        <div class="globo-dica">Arraste para girar · role para zoom</div>
        <div class="globo-legenda"><div>% sem destinação documentada</div><div class="esc"></div>
          <div class="lim"><span>40%</span><span>70%</span><span>100%</span></div>
          <div style="margin-top:6px"><span style="color:#FF6B5E">●</span> tamanho = toneladas sem destino &nbsp; <span style="color:#3DDC97">●</span> Brasil</div></div>
        <div class="globo-controles"><button id="g-girar" title="Pausar ou continuar o giro">❚❚</button><button id="g-mais" title="Aproximar">+</button><button id="g-menos" title="Afastar">−</button></div>
      </div>
      <div class="c4" style="display:flex;flex-direction:column;gap:16px">
        <div class="grade" style="grid-template-columns:1fr 1fr">
          <div class="cartao kpi"><span class="rotulo">Gerado no mundo</span><span class="valor" id="k-ger"></span><div class="rodape" id="k-ger-d"></div></div>
          <div class="cartao kpi"><span class="rotulo">Sem destino documentado</span><span class="valor" id="k-sem" style="color:var(--erro)"></span><div class="rodape" id="k-sem-d"></div></div>
        </div>
        <div class="cartao">
          <h2>Ranking por região</h2><p class="legenda-card">Milhões de toneladas sem destino documentado · clique para girar o globo</p>
          <div class="ranking-regioes" id="rank-reg"></div>
          <div class="alerta-amarelo" id="aviso-est" style="display:none;margin-top:6px">${esc(porAno[anos[anos.length - 1]].mundo?.fonte || '')}. A divisão por região usa a participação de 2022.</div>
        </div>
      </div>
      <div class="cartao c6 comparativo">
        <h2>Seu impacto x o mundo</h2>
        <p class="legenda-card">Parte do lixo eletrônico que recebeu destino comprovado</p>
        <div id="cmp"></div>
        <p class="nota">CircuitoVerde: kg com certificado de destinação ÷ kg descartados na plataforma (dados de teste). Brasil e mundo: Global E-waste Monitor 2024.</p>
      </div>
      <div class="cartao c6">
        <h2>Brasil</h2>
        <p class="legenda-card">Global E-waste Statistics Partnership, ano de 2022</p>
        <div class="calc-total" id="br"></div>
        <p class="nota">Fontes: Global E-waste Monitor 2020 e 2024 (ITU/UNITAR). Os totais de 2022 por região foram calculados com kg por habitante × população, porque o relatório publica só o valor por habitante.</p>
      </div>
    </div>`;

  // --- comparativo e Brasil (não mudam com o ano) ---
  const br = (porAno[2022]?.paises || []).find((p) => p.local === 'Brasil');
  const mundo22 = porAno[2022]?.mundo;
  const linhasCmp = [
    { nome: 'CircuitoVerde', v: dados.plataforma.taxa, cor: 'var(--serie-3)' },
    { nome: 'Mundo (2022)', v: Number(mundo22?.taxa_coleta || 0), cor: 'var(--serie-1)' },
    { nome: 'Brasil (2022)', v: Number(br?.taxa_coleta || 0), cor: 'var(--serie-2)' },
  ];
  $('#cmp').innerHTML = linhasCmp.map((l) => `<div class="linha-cmp" tabindex="0" data-dica="${fmt1(l.v)}%|${esc(l.nome)}">
    <span>${esc(l.nome)}</span><div class="trilho"><div class="barra" style="width:${Math.min(100, l.v)}%;background:${l.cor}"></div></div><span class="num">${fmt1(l.v)}%</span></div>`).join('');
  $('#br').innerHTML = br ? `
    <div><span>Gerado</span><b>${fmt1(br.gerado_mt * 1000, 0)} mil t</b></div>
    <div><span>Por habitante</span><b>${fmt1(br.kg_habitante)} kg</b></div>
    <div><span>Coletado formalmente</span><b>${fmt1(br.taxa_coleta)}%</b></div>
    <div><span>Sem destino documentado</span><b style="color:var(--erro)">${fmt1(br.sem_destino_mt, 2)} mi t</b></div>` : '<p class="vazio">Sem dados do Brasil.</p>';

  // --- globo (D3, projeção ortográfica) ---
  const svg = d3.select('#globo');
  const card = $('#globo-card');
  const proj = d3.geoOrthographic().clipAngle(90).rotate([40, -15]);
  const caminho = d3.geoPath(proj);
  const defs = svg.append('defs');
  const mar = defs.append('radialGradient').attr('id', 'mar').attr('cx', '40%').attr('cy', '35%');
  mar.append('stop').attr('offset', '0%').attr('stop-color', '#1E3A5F');
  mar.append('stop').attr('offset', '100%').attr('stop-color', '#0D1B2E');
  const gMar = svg.append('path').datum({ type: 'Sphere' }).attr('class', 'oceano');
  const gGrat = svg.append('path').datum(d3.geoGraticule10()).attr('class', 'grat');
  const paises = topojson.feature(mundo.topo, mundo.topo.objects.countries).features.filter((f) => f.id !== '010');
  const idPais = (f) => f.id || f.properties.name;
  const gPaises = svg.append('g').selectAll('path').data(paises).join('path').attr('class', 'pais');
  svg.append('path').datum({ type: 'Sphere' }).attr('class', 'borda-globo');
  const gBolhas = svg.append('g');
  const cor = d3.scaleLinear().domain([40, 70, 100]).range(['#3A4A63', '#F79009', '#D92D20']).clamp(true);
  const maxSem = d3.max(dados.anos.flatMap((a) => a.regioes.map(semDestino)));
  let escala = 1, girando = true, W = 0, H = 0, R0 = 0;

  const visivel = (lng, lat) => { const r = proj.rotate(); return d3.geoDistance([lng, lat], [-r[0], -r[1]]) < Math.PI / 2 - 0.05; };
  const regDe = (nome) => porAno[ano].regioes.find((r) => r.local === nome);

  function tamanho() {
    W = card.clientWidth; H = svg.node().clientHeight; R0 = Math.min(W, H) / 2 - 30;
    svg.attr('viewBox', `0 0 ${W} ${H}`); proj.translate([W / 2, H / 2]).scale(R0 * escala); desenhar();
  }
  function dicaRegiao(r, pais) {
    return `${fmt1(semDestino(r), 2)} Mt sem destino · ${fmt1(r.taxa_coleta)}% reciclado|${pais ? pais + ' · ' : ''}${r.local} · ${ano}${r.estimativa ? ' (est.)' : ''} · gerado ${fmt1(r.gerado_mt)} Mt`;
  }
  function desenhar() {
    gMar.attr('d', caminho); gGrat.attr('d', caminho); svg.select('.borda-globo').attr('d', caminho);
    gPaises.attr('d', caminho)
      .attr('fill', (f) => { const m = mundo.regioes[idPais(f)]; const r = m && regDe(m[0]); return r ? cor(100 - r.taxa_coleta) : '#2B3A52'; })
      .attr('data-dica', (f) => { const m = mundo.regioes[idPais(f)]; const r = m && regDe(m[0]); return r ? dicaRegiao(r, m[1]) : null; });
    const rS = d3.scaleSqrt().domain([0, maxSem]).range([4, 58 * Math.sqrt(escala)]);
    const itens = porAno[ano].regioes.filter((r) => visivel(r.longitude, r.latitude));
    const g = gBolhas.selectAll('g.b').data(itens, (d) => d.local).join((e) => {
      const n = e.append('g').attr('class', 'b');
      n.append('circle').attr('class', 'pulso'); n.append('circle').attr('class', 'bolha'); n.append('text').attr('class', 'rot').attr('text-anchor', 'middle');
      return n;
    });
    g.attr('transform', (d) => `translate(${proj([d.longitude, d.latitude])})`);
    g.select('.bolha').attr('r', (d) => rS(semDestino(d))).attr('data-dica', (d) => dicaRegiao(d));
    g.select('.pulso').attr('r', (d) => rS(semDestino(d)));
    g.select('text').attr('dy', (d) => rS(semDestino(d)) + 15).text((d) => `${d.local} · ${fmt1(semDestino(d))} Mt`);
    const brasil = (porAno[ano].paises || []).filter((p) => visivel(p.longitude, p.latitude));
    gBolhas.selectAll('circle.br').data(brasil).join('circle').attr('class', 'br').attr('r', 6)
      .attr('cx', (d) => proj([d.longitude, d.latitude])[0]).attr('cy', (d) => proj([d.longitude, d.latitude])[1])
      .attr('data-dica', (d) => `${fmt1(d.gerado_mt * 1000, 0)} mil t geradas · ${fmt1(d.taxa_coleta)}% coletado|Brasil · ${d.ano}`)
      .raise();
  }
  function painelAno() {
    const a = porAno[ano], m = a.mundo;
    $('#k-ger').innerHTML = `${fmt1(m.gerado_mt)}<span class="unidade">Mt</span>`;
    $('#k-ger-d').textContent = `${a.estimativa ? 'estimativa ' : ''}em ${ano}`;
    $('#k-sem').innerHTML = `${fmt1(m.sem_destino_mt)}<span class="unidade">Mt</span>`;
    $('#k-sem-d').textContent = `${fmt1(100 - m.taxa_coleta)}% do total gerado`;
    $('#aviso-est').style.display = a.estimativa ? 'block' : 'none';
    const lista = [...a.regioes].sort((x, y) => semDestino(y) - semDestino(x));
    $('#rank-reg').innerHTML = lista.map((r) => `<div class="linha-reg" data-reg="${esc(r.local)}" tabindex="0">
      <span class="nome">${esc(r.local)}</span><div class="trilho"><div class="barra" style="width:${(semDestino(r) / maxSem) * 100}%"></div></div>
      <span class="num">${fmt1(semDestino(r))} Mt</span></div>`).join('');
    document.querySelectorAll('[data-reg]').forEach((el) => (el.onclick = () => irPara(a.regioes.find((r) => r.local === el.dataset.reg))));
    desenhar();
  }
  function irPara(r) {
    girando = false; atualizarBotao();
    const de = proj.rotate(), para = [-r.longitude, -r.latitude * 0.7];
    const it = d3.interpolate(de, para);
    d3.transition().duration(1000).tween('girar', () => (t) => { proj.rotate(it(t)); desenhar(); });
  }
  const botaoGiro = $('#g-girar');
  const atualizarBotao = () => { botaoGiro.textContent = girando ? '❚❚' : '▶'; };
  botaoGiro.onclick = () => { girando = !girando; atualizarBotao(); };
  const zoom = (f) => { escala = Math.max(0.7, Math.min(4, escala * f)); proj.scale(R0 * escala); desenhar(); };
  $('#g-mais').onclick = () => zoom(1.25);
  $('#g-menos').onclick = () => zoom(0.8);
  svg.on('wheel', (ev) => { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
  let inicio;
  svg.call(d3.drag()
    .on('start', (ev) => { inicio = { x: ev.x, y: ev.y, r: proj.rotate() }; girando = false; atualizarBotao(); })
    .on('drag', (ev) => {
      const k = 75 / proj.scale();
      proj.rotate([inicio.r[0] + (ev.x - inicio.x) * k, Math.max(-80, Math.min(80, inicio.r[1] - (ev.y - inicio.y) * k))]);
      desenhar();
    }));
  document.querySelectorAll('#anos button').forEach((b) => (b.onclick = () => {
    ano = Number(b.dataset.ano);
    document.querySelectorAll('#anos button').forEach((x) => x.classList.toggle('ativo', x === b));
    painelAno();
  }));

  const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzirMovimento) { girando = false; atualizarBotao(); }
  const timer = d3.timer(() => { if (girando) { const r = proj.rotate(); proj.rotate([r[0] + 0.12, r[1]]); desenhar(); } });
  const aoRedimensionar = () => tamanho();
  addEventListener('resize', aoRedimensionar);
  limparTela = () => { timer.stop(); removeEventListener('resize', aoRedimensionar); };
  tamanho(); painelAno();
}

// =====================================================================
// 4. PONTOS DE COLETA com geolocalização (mapa Leaflet + OpenStreetMap)
// =====================================================================
const NOMES_CATEGORIA = {
  TELEFONIA: 'Celulares e telefones', INFORMATICA: 'Informática', PILHAS_BATERIAS: 'Pilhas e baterias',
  ELETRODOMESTICO: 'Eletrodomésticos', ENTRETENIMENTO: 'TV e som',
};
const NOMES_ORIGEM = { ABREE: 'Real · ABREE', CIRCUITOVERDE: 'Reciclador CircuitoVerde', FICTICIO: 'Fictício (teste)' };

async function pontosV2() {
  const [resumo, cidades] = await Promise.all([api('/pontos/resumo'), api('/pontos/cidades')]);
  const tot = (o) => resumo.find((r) => r.origem === o) || { pontos: 0, estados: 0, cidades: 0 };

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div><h1>Pontos de coleta perto de você</h1>
      <p class="sub">Use a sua localização ou escolha uma cidade. A distância é calculada no banco (função fn_distancia_km).</p></div>
    </div>
    <div class="resumo-pontos">
      <div class="chip"><b>${num(tot('ABREE').pontos)}</b>pontos reais em ${tot('ABREE').estados} estados</div>
      <div class="chip"><b>${num(tot('CIRCUITOVERDE').pontos)}</b>recicladores da plataforma</div>
      <div class="chip"><b>${num(tot('FICTICIO').pontos)}</b>pontos fictícios onde não achamos ponto real</div>
    </div>
    <div class="cartao" style="margin-bottom:16px">
      <div class="barra-busca">
        <button class="btn" id="usar-gps">📍 Usar minha localização</button>
        <label>Ou escolha a cidade
          <select id="sel-cidade"><option value="">Selecione...</option>
            ${cidades.map((c, i) => `<option value="${i}">${esc(c.cidade)} / ${esc(c.uf)} (${c.pontos})</option>`).join('')}
          </select></label>
        <label>Raio
          <select id="sel-raio"><option value="3">3 km</option><option value="10" selected>10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="150">150 km</option></select></label>
        <label>Equipamento
          <select id="sel-cat"><option value="">Todos</option>
            ${Object.entries(NOMES_CATEGORIA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select></label>
      </div>
      <p class="nota" style="margin:10px 0 0">Dica: clique em qualquer lugar do mapa para procurar pontos ali.</p>
    </div>
    <div class="pontos-grade">
      <div>
        <div id="mapa" class="mapa" role="application" aria-label="Mapa dos pontos de coleta"></div>
        <div class="legenda-mapa">
          <span style="--c:#F04438">Você</span><span style="--c:#2A78D6">Ponto real (ABREE)</span>
          <span style="--c:#1BAF7A">Reciclador CircuitoVerde</span><span style="--c:#F79009">Fictício</span>
        </div>
      </div>
      <div>
        <div id="titulo-lista" class="nota" style="margin-bottom:8px">Escolha um local para ver os pontos mais próximos.</div>
        <div id="lista-pontos" class="lista-pontos"></div>
      </div>
    </div>
    <p class="nota" style="margin-top:14px">Pontos reais: base pública de pontos de recebimento da ABREE (Associação Brasileira de Reciclagem de
      Eletroeletrônicos e Eletrodomésticos), consultada em 19/10/2026 para celulares. Confirme o horário com o local antes de ir.</p>`;

  // Mapa
  const mapa = L.map('mapa', { zoomControl: true, worldCopyJump: true }).setView([-14.5, -52], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  setTimeout(() => mapa.invalidateSize(), 50);
  const camadaCidades = L.layerGroup().addTo(mapa);
  const camadaBusca = L.layerGroup().addTo(mapa);
  const marcadores = {};
  let ultimo = null;

  // Visão inicial: uma bolha por cidade com a quantidade de pontos
  cidades.forEach((c, i) => {
    const t = Math.min(42, 20 + Math.sqrt(c.pontos) * 4);
    L.marker([c.latitude, c.longitude], {
      icon: L.divIcon({ className: '', html: `<div class="marcador-cidade" style="width:${t}px;height:${t}px">${c.pontos}</div>`, iconSize: [t, t] }),
      title: `${c.cidade}/${c.uf}`,
    }).on('click', () => { $('#sel-cidade').value = i; buscar(c.latitude, c.longitude, `centro de ${c.cidade}/${c.uf}`); }).addTo(camadaCidades);
  });

  const enderecoTexto = (p) => `${esc(p.logradouro)}, ${esc(p.numero)} · ${esc(p.bairro)} · ${esc(p.cidade)}/${esc(p.uf)}`;
  const rota = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  const distTexto = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${fmt1(km)} km`);

  function cartaoPonto(p) {
    return `<div class="ponto-card" data-ponto="${p.id_ponto}" tabindex="0">
      <div class="topo"><b>${esc(p.nome)}</b><span class="dist">${distTexto(Number(p.distancia_km))}</span></div>
      <p>${enderecoTexto(p)}</p>
      <div class="acoes" style="align-items:center">
        <span class="etiqueta ${esc(p.origem)}">${esc(NOMES_ORIGEM[p.origem] || p.origem)}</span>
        <span class="etiqueta">${esc(p.canal)}</span>
        <a href="${rota(p)}" target="_blank" rel="noopener">Como chegar ↗</a>
      </div></div>`;
  }

  async function buscar(lat, lng, descricao) {
    ultimo = { lat, lng, descricao };
    const raio = Number($('#sel-raio').value);
    const q = new URLSearchParams({ lat, lng, raio, limite: 30 });
    if ($('#sel-cat').value) q.set('categoria', $('#sel-cat').value);
    $('#titulo-lista').textContent = 'Buscando...';
    let r;
    try { r = await api('/pontos/proximos?' + q); } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); return; }

    camadaCidades.clearLayers();
    camadaBusca.clearLayers();
    const voce = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="marcador-voce"></div>', iconSize: [18, 18] }), zIndexOffset: 1000 })
      .bindPopup(`<b>Você está aqui</b><br>${esc(descricao)}`).addTo(camadaBusca);
    L.circle([lat, lng], { radius: raio * 1000, color: '#2A78D6', weight: 1, fillOpacity: 0.06 }).addTo(camadaBusca);

    const lista = r.pontos.length ? r.pontos : r.fora_do_raio;
    lista.forEach((p) => {
      marcadores[p.id_ponto] = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({ className: '', html: `<div class="marcador-ponto ${esc(p.origem)}"></div>`, iconSize: [14, 14] }),
        title: p.nome,
      }).bindPopup(`<b>${esc(p.nome)}</b><br>${enderecoTexto(p)}<br><b>${distTexto(Number(p.distancia_km))}</b> · <a href="${rota(p)}" target="_blank" rel="noopener">Como chegar</a>`)
        .addTo(camadaBusca);
    });
    const limites = L.latLngBounds([[lat, lng], ...lista.slice(0, 12).map((p) => [p.latitude, p.longitude])]);
    mapa.fitBounds(limites.pad(0.25), { maxZoom: 15 });
    voce.openPopup();

    $('#titulo-lista').innerHTML = r.pontos.length
      ? `<b>${r.pontos.length}</b> ponto(s) em até ${raio} km de ${esc(descricao)}, do mais perto ao mais longe.`
      : `<span class="alerta-amarelo" style="display:block">Nenhum ponto em até ${raio} km. Estes são os mais próximos que encontramos.</span>`;
    $('#lista-pontos').innerHTML = lista.map(cartaoPonto).join('');
    document.querySelectorAll('[data-ponto]').forEach((el) => {
      const abrir = () => {
        const m = marcadores[el.dataset.ponto];
        document.querySelectorAll('.ponto-card.ativo').forEach((x) => x.classList.remove('ativo'));
        el.classList.add('ativo');
        mapa.setView(m.getLatLng(), Math.max(mapa.getZoom(), 15)); m.openPopup();
      };
      el.onclick = (e) => { if (!e.target.closest('a')) abrir(); };
      el.onkeydown = (e) => { if (e.key === 'Enter') abrir(); };
    });
  }

  // Geolocalização do navegador (pede permissão; funciona em localhost ou https)
  $('#usar-gps').onclick = () => {
    if (!navigator.geolocation) return avisar('Este navegador não oferece geolocalização. Escolha a cidade.', true);
    const botao = $('#usar-gps');
    botao.disabled = true; botao.textContent = 'Localizando...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        botao.disabled = false; botao.textContent = '📍 Usar minha localização';
        buscar(pos.coords.latitude, pos.coords.longitude, `sua localização (precisão de ${Math.round(pos.coords.accuracy)} m)`);
      },
      (erro) => {
        botao.disabled = false; botao.textContent = '📍 Usar minha localização';
        const msg = { 1: 'Você não permitiu o acesso à localização. Libere no cadeado da barra de endereço ou escolha a cidade.',
          2: 'Não foi possível descobrir a sua localização agora. Escolha a cidade.', 3: 'A localização demorou demais. Tente de novo ou escolha a cidade.' };
        avisar(msg[erro.code] || 'Erro na geolocalização.', true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  $('#sel-cidade').onchange = (e) => {
    const c = cidades[e.target.value];
    if (c) buscar(c.latitude, c.longitude, `centro de ${c.cidade}/${c.uf}`);
  };
  $('#sel-raio').onchange = $('#sel-cat').onchange = () => { if (ultimo) buscar(ultimo.lat, ultimo.lng, ultimo.descricao); };
  mapa.on('click', (e) => buscar(e.latlng.lat, e.latlng.lng, 'local escolhido no mapa'));

  limparTela = () => mapa.remove();
}

// =====================================================================
// 5. CALCULADORA DE IMPACTO
// =====================================================================
async function calculadora() {
  const tipos = await api('/tipos-equipamento');
  $('#conteudo').innerHTML = `
    <h1>Calculadora de impacto</h1>
    <p class="sub">Quanto material dá para recuperar quando você descarta corretamente? A estimativa usa o que os recicladores já registraram no banco (view vw_composicao_media_tipo).</p>
    <div class="calc-grade">
      <div class="cartao">
        <form id="f-calc">
          <label>Equipamento
            <select name="id_tipo">${tipos.map((t) => `<option value="${t.id_tipo}">${esc(t.nome)}</option>`).join('')}</select></label>
          <label>Quantidade <input name="quantidade" type="number" min="1" max="10000" value="1" required></label>
          <label>Peso de cada um (kg) <input name="peso_kg" type="number" min="0.01" step="0.01" placeholder="Em branco = peso médio do banco"></label>
          <button class="btn">Calcular</button>
        </form>
      </div>
      <div class="cartao" id="calc-res"><p class="vazio">Escolha um equipamento e clique em calcular.</p></div>
    </div>`;

  const calcular = async () => {
    const f = new FormData($('#f-calc'));
    const q = new URLSearchParams({ id_tipo: f.get('id_tipo'), quantidade: f.get('quantidade') });
    if (f.get('peso_kg')) q.set('peso_kg', f.get('peso_kg'));
    try {
      const r = await api('/calculadora?' + q);
      $('#calc-res').innerHTML = `
        <h2>${num(r.quantidade)} × ${esc(r.equipamento)} · ${kg(r.peso_total_kg)} kg</h2>
        <p class="legenda-card">Baseado em ${num(r.itens_analisados)} ${esc(r.equipamento.toLowerCase())}(s) já desmontados pelos recicladores · peso médio ${kg(r.peso_medio_item_kg)} kg</p>
        <div class="calc-total">
          <div><span>Material recuperável</span><b>${kg(r.kg_recuperavel)} kg</b></div>
          <div><span>Valor estimado dos materiais</span><b>${reais(r.valor_total_reais)}</b></div>
        </div>
        ${barrasHorizontais(r.materiais.map((m) => ({
          nome: m.material, valor: m.kg, texto: kg(m.kg) + ' kg',
          dica: `${kg(m.kg)} kg · ${reais(m.valor_reais)}|${m.material}`,
        })))}
        <p class="nota" style="margin-top:16px">Os valores por kg da tabela material são ilustrativos. Itens com bateria de lítio nunca devem ir para o lixo comum: risco de incêndio.</p>
        <button class="btn sec" id="ir-pontos" style="margin-top:6px">Encontrar um ponto de coleta</button>`;
      $('#ir-pontos').onclick = () => ir('pontos');
    } catch (err) { if (!(err instanceof TelaTrocada)) $('#calc-res').innerHTML = `<p class="vazio">${esc(err.message)}</p>`; }
  };
  $('#f-calc').onsubmit = (e) => { e.preventDefault(); calcular(); };
  await calcular();
}

// =====================================================================
// 6. RANKING COM SELO VERDE
// =====================================================================
const NOMES_SELO = { OURO: 'Ouro', PRATA: 'Prata', BRONZE: 'Bronze', SEM_SELO: 'Sem selo' };
async function ranking() {
  const r = await api('/ranking');
  const qtd = Object.fromEntries(r.selos.map((s) => [s.selo, s.geradores]));
  $('#conteudo').innerHTML = `
    <h1>Ranking e selo verde</h1>
    <p class="sub">Quem mais deu destino comprovado ao lixo eletrônico (kg com certificado). Calculado pela view vw_ranking_geradores.</p>
    <div class="selos-grade">
      ${[['OURO', '25 kg ou mais'], ['PRATA', '10 a 25 kg'], ['BRONZE', 'até 10 kg']].map(([s, regra]) => `
        <div class="selo-card"><div class="medalha ${s}">${NOMES_SELO[s][0]}</div>
          <div><b>${num(qtd[s] || 0)}</b><small>selo ${NOMES_SELO[s]} · ${regra} certificados</small></div></div>`).join('')}
    </div>
    <div class="cartao">
      <table>
        <tr><th>#</th><th>Gerador</th><th>Cidade</th><th class="num">Itens</th><th class="num">kg certificados</th><th class="num">% com certificado</th><th>Selo</th></tr>
        ${r.ranking.map((g) => `<tr class="${g.posicao <= 3 ? 'top3' : ''}">
          <td class="posicao">${g.posicao}º</td>
          <td>${esc(g.nome_publico)} <small style="color:var(--texto-3)">${g.tipo === 'PJ' ? 'empresa' : 'pessoa'}</small></td>
          <td>${esc(g.cidade)}/${esc(g.uf)}</td>
          <td class="num">${num(g.itens)}</td>
          <td class="num"><b>${kg(g.kg_certificado)}</b></td>
          <td class="num">${fmt1(g.kg_descartado ? (g.kg_certificado / g.kg_descartado) * 100 : 0, 0)}%</td>
          <td><span class="selo-chip selo-${esc(g.selo)}">${NOMES_SELO[g.selo]}</span></td>
        </tr>`).join('')}
      </table>
      <p class="nota" style="margin-top:12px">Para proteger a privacidade (LGPD), pessoas físicas aparecem só com o primeiro nome e a inicial do sobrenome.</p>
    </div>`;
}

// =====================================================================
// 7. VALIDAR CERTIFICADO (destino do QR Code)
// =====================================================================
async function validar(codigoInicial) {
  $('#conteudo').innerHTML = `
    <div class="validacao">
      <h1>Validar certificado</h1>
      <p class="sub">Confira se um certificado de destinação foi emitido pelo CircuitoVerde. É para onde o QR Code do certificado aponta.</p>
      <div class="cartao">
        <form id="f-validar" class="linha" style="grid-template-columns:1fr auto;align-items:end">
          <label>Código do certificado <input name="codigo" required placeholder="ex.: 19eccdf5-c742-11f1-851a-02fc00000001" value="${esc(codigoInicial || '')}"></label>
          <button class="btn">Validar</button>
        </form>
        <div id="res-validar"></div>
      </div>
    </div>`;
  const checar = async (codigo) => {
    try {
      const c = await api('/certificados/' + encodeURIComponent(codigo.trim()));
      $('#res-validar').innerHTML = `
        <div class="ok"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>
          Certificado válido: o equipamento teve destino ambientalmente correto.</div>
        <div class="dados-cert">
          <div><span>Equipamento</span><b>${esc(c.equipamento)} · item nº ${c.id_item}</b></div>
          <div><span>Emitido em</span><b>${dataBR(c.data_emissao)}</b></div>
          <div><span>Gerador</span><b>${esc(c.gerador)}</b></div>
          <div><span>Reciclador</span><b>${esc(c.reciclador || '-')}</b></div>
          <div><span>Peso destinado</span><b>${kg(c.peso_total_kg)} kg</b></div>
          <div><span>Reciclado ou reutilizado</span><b>${kg(c.kg_reaproveitado)} kg em ${num(c.componentes)} componentes</b></div>
        </div>
        <div style="margin-top:16px"><button class="btn sec" id="baixar-validado">Baixar certificado (PDF)</button></div>`;
      $('#baixar-validado').onclick = () => imprimirCertificado(c);
    } catch (err) {
      if (!(err instanceof TelaTrocada)) $('#res-validar').innerHTML = `<div class="aviso erro" style="width:auto;margin:16px 0 0">${esc(err.message)}</div>`;
    }
  };
  $('#f-validar').onsubmit = (e) => { e.preventDefault(); checar(new FormData(e.target).get('codigo')); };
  if (codigoInicial) await checar(codigoInicial);
}

// =====================================================================
// 8. RASTREIO ESTILO ENCOMENDA (substitui o htmlRastreio do app.js)
// =====================================================================
function htmlRastreio(r) {
  const quando = Object.fromEntries((r.historico || []).map((h) => [h.status, h.data_hora]));
  const cancelada = r.status_atual === null && quando.CANCELADA;
  const comDestino = r.componentes.length && r.componentes.every((c) => c.destino);
  const etapas = [
    ['Registrado', r.data_descarte, true],
    ['Coleta solicitada', quando.SOLICITADA, !!quando.SOLICITADA],
    ['Agendada', quando.AGENDADA, !!quando.AGENDADA],
    ['Em trânsito', quando.EM_TRANSITO, !!quando.EM_TRANSITO],
    ['Entregue', quando.ENTREGUE, !!quando.ENTREGUE],
    ['Componentes separados', null, r.componentes.length > 0],
    ['Destino final', null, !!comDestino],
    ['Certificado', r.data_certificado, !!r.certificado],
  ];
  // Se uma etapa posterior aconteceu, as anteriores também (alguns dados de teste pulam status)
  const ultimaFeita = etapas.reduce((m, e, i) => (e[2] ? i : m), 0);
  etapas.forEach((e, i) => { e[2] = i <= ultimaFeita; });
  const atual = ultimaFeita + 1 < etapas.length ? ultimaFeita + 1 : -1;
  return `
    <h2>${esc(r.equipamento)} · item nº ${r.id_item}</h2>
    <p class="sub" style="margin-bottom:6px">Gerador: ${esc(r.gerador)} · Reciclador: ${esc(r.reciclador || '-')} · ${badge(r.status_atual)}</p>
    <ol class="etapas" style="--n:${etapas.length}">
      ${etapas.map(([nome, data, feita], i) => `<li class="${feita ? 'feita' : ''} ${i === atual ? 'atual' : ''}">
        <b>${nome}</b>${data ? `<small>${dataBR(data)}</small>` : ''}</li>`).join('')}
    </ol>
    ${cancelada ? '<div class="alerta-amarelo" style="margin-bottom:14px">A última coleta foi cancelada. O gerador pode solicitar outra.</div>' : ''}

    <h2 style="font-size:15px">Componentes e destino</h2>
    ${r.componentes.length ? `<table>
      <tr><th>Componente</th><th class="num">kg</th><th>Destino</th></tr>
      ${r.componentes.map((c) => `<tr><td>${esc(c.nome)}</td><td class="num">${kg(c.peso_kg)}</td>
        <td>${c.destino ? esc(c.destino.replace('_', ' ').toLowerCase()) : '<span class="status">Pendente</span>'}</td></tr>`).join('')}
    </table>` : '<p class="sub">O reciclador ainda não registrou os componentes.</p>'}

    ${r.certificado ? `<div class="certificado">✔ <b>Certificado de destinação emitido</b><br>Código: <code>${esc(r.certificado)}</code>
      <div style="margin-top:12px"><button class="btn sec peq" data-baixar-cert="${esc(r.certificado)}">Baixar certificado (PDF)</button></div></div>` : ''}`;
}
// Botão de PDF dentro do modal (o modal é montado pelo app.js)
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-baixar-cert]');
  if (!b) return;
  try { imprimirCertificado(await api('/certificados/' + b.dataset.baixarCert, { global: true })); }
  catch (err) { avisar(err.message, true); }
});

// =====================================================================
// 9. CERTIFICADO EM PDF COM QR CODE
// Abre uma página pronta para imprimir; no diálogo, escolha "Salvar como PDF".
// =====================================================================
function imprimirCertificado(c) {
  const base = location.protocol === 'file:' ? 'http://localhost:3000/' : location.origin + location.pathname;
  const link = `${base}#/validar/${c.codigo}`;
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  const svgQr = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  const janela = window.open('', '_blank');
  if (!janela) return avisar('O navegador bloqueou a nova janela. Libere pop-ups para este site.', true);
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado ${esc(c.codigo)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; } body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #101828; background: #F5F6F8; }
    .folha { max-width: 1050px; margin: 24px auto; background: #fff; border: 1px solid #E4E7EC; border-radius: 16px; padding: 40px 48px; position: relative; overflow: hidden; }
    .folha::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 10px; background: linear-gradient(90deg, #1BAF7A, #256ABF); }
    .topo { display: flex; justify-content: space-between; align-items: center; }
    .marca { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; } .marca span { color: #1BAF7A; }
    .selo { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: #067647; background: #ECFDF3; border: 1px solid #ABEFC6; padding: 6px 12px; border-radius: 999px; }
    h1 { font-size: 34px; letter-spacing: -.5px; margin: 34px 0 6px; } .sub { color: #475467; margin: 0 0 28px; font-size: 15px; }
    .corpo { display: grid; grid-template-columns: 1fr 190px; gap: 36px; align-items: start; }
    .dados { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
    .dados span { display: block; font-size: 12px; color: #667085; text-transform: uppercase; letter-spacing: .6px; } .dados b { font-size: 17px; }
    .qr { text-align: center; font-size: 11px; color: #667085; } .qr svg { width: 170px; height: 170px; display: block; margin: 0 auto 8px; }
    .rodape { margin-top: 34px; padding-top: 16px; border-top: 1px solid #EEF0F3; display: flex; justify-content: space-between; font-size: 12px; color: #667085; }
    code { font-size: 12px; } .acoes { text-align: center; margin: 0 0 24px; }
    button { font: inherit; font-weight: 600; background: #256ABF; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; cursor: pointer; }
    @media print { body { background: #fff; } .folha { margin: 0; border: 0; } .acoes { display: none; } }
  </style></head><body>
  <div class="folha">
    <div class="topo"><div class="marca">♻ Circuito<span>Verde</span></div><div class="selo">DESTINAÇÃO AMBIENTALMENTE ADEQUADA</div></div>
    <h1>Certificado de destinação</h1>
    <p class="sub">Certificamos que o equipamento abaixo foi coletado por logística reversa e teve todos os seus componentes destinados corretamente.</p>
    <div class="corpo">
      <div class="dados">
        <div><span>Equipamento</span><b>${esc(c.equipamento)} · item nº ${c.id_item}</b></div>
        <div><span>Data de emissão</span><b>${dataBR(c.data_emissao)}</b></div>
        <div><span>Gerador</span><b>${esc(c.gerador)}</b></div>
        <div><span>Reciclador responsável</span><b>${esc(c.reciclador || '-')}</b></div>
        <div><span>Peso destinado</span><b>${kg(c.peso_total_kg)} kg</b></div>
        <div><span>Reciclado ou reutilizado</span><b>${kg(c.kg_reaproveitado)} kg (${num(c.componentes)} componentes)</b></div>
      </div>
      <div class="qr">${svgQr}Aponte a câmera para validar</div>
    </div>
    <div class="rodape"><span>Código de validação: <code>${esc(c.codigo)}</code></span><span>Emitido pela stored procedure sp_emitir_certificado · A3 Banco de Dados</span></div>
  </div>
  <div class="acoes"><button onclick="print()">Salvar como PDF / imprimir</button></div>
  <script>setTimeout(function(){ print(); }, 400);<\/script>
  </body></html>`);
  janela.document.close();
}

// =====================================================================
// 10. Início (links diretos como #/validar/CODIGO, vindos do QR Code)
// =====================================================================
function rotaDoEndereco() {
  const m = location.hash.match(/^#\/(validar)\/([0-9a-f-]{36})$/i);
  if (m) return ir('validar', m[2]);
  return null;
}
addEventListener('hashchange', rotaDoEndereco);
if (!rotaDoEndereco()) ir('painel');
verificarApi();
setInterval(verificarApi, 30000);
