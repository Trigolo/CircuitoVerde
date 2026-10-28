// =====================================================================
// CircuitoVerde - Assistente virtual (chat flutuante)
// Conversa com POST /api/assistente (Gemini ou bot por regras).
// Usa funções do app.js: api, esc, sessao.
// =====================================================================
(function () {
  const historico = [];          // [{ papel: 'usuario'|'assistente', texto }]
  let localizacao = null;        // { lat, lng } quando o usuário toca em 📍
  let enviando = false;
  let iniciado = false;

  // ---------- Markdown simples e seguro (escapa tudo antes de formatar) ----------
  function inline(t) {
    return t
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1 ↗</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;)]|$)/g, '$1<i>$2</i>');
  }
  function md(texto) {
    const linhas = esc(texto).split('\n');
    let html = '', lista = null;
    const fechar = () => { if (lista) { html += `</${lista}>`; lista = null; } };
    for (const l of linhas) {
      const ul = l.match(/^\s*[-•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/), cont = l.match(/^\s{2,}(\S.*)/);
      if (ul || ol) {
        const tipo = ul ? 'ul' : 'ol';
        if (lista !== tipo) { fechar(); html += `<${tipo}>`; lista = tipo; }
        html += `<li>${inline((ul || ol)[1])}</li>`;
      } else if (cont && lista) {
        html = html.replace(/<\/li>$/, `<br><small>${inline(cont[1])}</small></li>`);
      } else if (l.trim()) {
        fechar(); html += `<p>${inline(l)}</p>`;
      } else fechar();
    }
    fechar();
    return html;
  }

  // ---------- Estrutura ----------
  const raiz = document.createElement('div');
  raiz.className = 'assist';
  raiz.innerHTML = `
    <button class="assist-fab" id="assist-fab" aria-label="Abrir o assistente" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>
      <span>Assistente</span>
    </button>
    <section class="assist-painel" id="assist-painel" role="dialog" aria-label="Assistente do CircuitoVerde" hidden>
      <header class="assist-topo">
        <div class="assist-avatar">♻</div>
        <div class="assist-titulo"><b>Assistente CircuitoVerde</b><small id="assist-motor">verificando...</small></div>
        <button class="assist-icone" id="assist-limpar" title="Nova conversa" aria-label="Nova conversa">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
        <button class="assist-icone" id="assist-fechar" title="Fechar" aria-label="Fechar">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="assist-msgs" id="assist-msgs" aria-live="polite"></div>
      <div class="assist-sugestoes" id="assist-sugestoes"></div>
      <form class="assist-form" id="assist-form">
        <button type="button" class="assist-icone assist-gps" id="assist-gps" title="Usar minha localização" aria-label="Usar minha localização">📍</button>
        <textarea id="assist-texto" rows="1" maxlength="500" placeholder="Pergunte sobre descarte, pontos, itens..." aria-label="Mensagem"></textarea>
        <button class="assist-enviar" id="assist-enviar" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
    </section>`;
  document.body.appendChild(raiz);

  const $a = (id) => document.getElementById(id);
  const painel = $a('assist-painel'), msgs = $a('assist-msgs'), texto = $a('assist-texto');

  function adicionar(papel, conteudo, extra = {}) {
    const div = document.createElement('div');
    div.className = `assist-msg ${papel}`;
    div.innerHTML = papel === 'usuario' ? `<p>${esc(conteudo)}</p>` : md(conteudo);
    if (extra.aviso) div.insertAdjacentHTML('beforeend', `<div class="assist-aviso">${esc(extra.aviso)}</div>`);
    if (extra.ferramentas?.length) div.insertAdjacentHTML('beforeend', `<div class="assist-fonte">consultou: ${extra.ferramentas.map(esc).join(', ')}</div>`);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function sugestoes(lista) {
    $a('assist-sugestoes').innerHTML = (lista || []).map((s) => `<button type="button" class="assist-chip">${esc(s)}</button>`).join('');
    document.querySelectorAll('.assist-chip').forEach((b) => (b.onclick = () => enviar(b.textContent)));
  }
  function motorTexto(st) {
    $a('assist-motor').innerHTML = st.motor === 'gemini'
      ? `<span class="assist-ponto ia"></span>IA Gemini${st.modelo ? ' · ' + esc(st.modelo) : ''}`
      : '<span class="assist-ponto"></span>Respostas automáticas';
  }

  async function iniciar() {
    iniciado = true;
    try {
      const st = await api('/assistente/status', { global: true });
      motorTexto(st);
      adicionar('assistente', st.apresentacao);
      sugestoes(st.sugestoes);
    } catch (err) {
      $a('assist-motor').textContent = 'offline';
      adicionar('assistente', 'Não consegui falar com a API. Ela está rodando (npm run dev)?');
    }
  }

  async function enviar(pergunta) {
    pergunta = String(pergunta || '').trim();
    if (!pergunta || enviando) return;
    enviando = true;
    texto.value = ''; ajustarAltura();
    sugestoes([]);
    adicionar('usuario', pergunta);
    const digitando = adicionar('assistente', '');
    digitando.classList.add('digitando');
    digitando.innerHTML = '<span></span><span></span><span></span>';
    try {
      const r = await api('/assistente', { metodo: 'POST', global: true, corpo: { mensagem: pergunta, historico: historico.slice(-10), localizacao } });
      digitando.remove();
      adicionar('assistente', r.resposta, r);
      motorTexto(r);
      historico.push({ papel: 'usuario', texto: pergunta }, { papel: 'assistente', texto: r.resposta });
      if (r.sugestoes) sugestoes(r.sugestoes);
    } catch (err) {
      digitando.remove();
      adicionar('assistente', err.message || 'Algo deu errado. Tente de novo.');
    } finally {
      enviando = false;
      texto.focus();
    }
  }

  // ---------- Eventos ----------
  function abrir(sim) {
    painel.hidden = !sim;
    raiz.classList.toggle('aberto', sim);
    $a('assist-fab').setAttribute('aria-expanded', sim);
    if (sim) { if (!iniciado) iniciar(); setTimeout(() => texto.focus(), 50); }
  }
  $a('assist-fab').onclick = () => abrir(painel.hidden);
  $a('assist-fechar').onclick = () => abrir(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painel.hidden) abrir(false); });
  $a('assist-limpar').onclick = () => { historico.length = 0; msgs.innerHTML = ''; iniciar(); };
  $a('assist-form').onsubmit = (e) => { e.preventDefault(); enviar(texto.value); };
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(texto.value); } });
  function ajustarAltura() { texto.style.height = 'auto'; texto.style.height = Math.min(texto.scrollHeight, 110) + 'px'; }
  texto.addEventListener('input', ajustarAltura);

  $a('assist-gps').onclick = () => {
    const botao = $a('assist-gps');
    if (localizacao) {   // segundo toque desliga
      localizacao = null; botao.classList.remove('ativo');
      return adicionar('assistente', 'Localização desligada.');
    }
    if (!navigator.geolocation) return adicionar('assistente', 'Este navegador não oferece localização. Diga a sua cidade.');
    botao.disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      botao.disabled = false;
      localizacao = { lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) };
      botao.classList.add('ativo');
      enviar('Quais os pontos de coleta mais próximos de mim?');
    }, () => {
      botao.disabled = false;
      adicionar('assistente', 'Não consegui a sua localização. Libere no cadeado da barra de endereço ou diga a sua cidade.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
})();
