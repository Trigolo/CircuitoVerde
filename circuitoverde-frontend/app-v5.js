// =====================================================================
// CircuitoVerde - Versão 5 do frontend
// Relatórios (admin e auditor), trilha de auditoria, notificações (sininho),
// tela "Meu perfil" com troca de senha e exportação em CSV.
// Carregado depois do app-v3.js; a primeira tela abre no DOMContentLoaded.
// =====================================================================

// ---------- 1. Telas novas e onde aparecem ----------
OPERACAO_POR_PERFIL.ADMIN.push('relatorios', 'auditoria');
OPERACAO_POR_PERFIL.AUDITOR.push('relatorios', 'auditoria');
Object.values(OPERACAO_POR_PERFIL).forEach((lista) => lista.push('perfil'));
Object.assign(TITULOS, { relatorios: 'Relatórios', auditoria: 'Auditoria', perfil: 'Meu perfil' });
Object.assign(ICONES, {
  relatorios: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  auditoria: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M9 12h6M9 15h4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sino: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
});

// ---------- 2. Exportar CSV (abre direto no Excel: separador ; e acentos com BOM) ----------
function baixarCsv(nomeArquivo, linhas, colunas) {
  if (!linhas.length) return avisar('Não há dados para exportar.', true);
  const cols = colunas || Object.keys(linhas[0]).map((c) => [c, c]);
  const celula = (v) => {
    if (v == null) return '';
    const t = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = [cols.map(([, r]) => celula(r)).join(';'), ...linhas.map((l) => cols.map(([c]) => celula(l[c])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${nomeArquivo}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const botaoCsv = (id, rotulo = 'CSV') => `<button class="btn sec peq btn-csv" id="${id}" title="Baixar em CSV (abre no Excel)">${icone('baixar')} ${rotulo}</button>`;

// Barras horizontais simples (mesmo visual do ranking do globo)
function barrasH(itens, rotulo, valor, formato = (v) => kg(v) + ' kg') {
  const max = Math.max(...itens.map((i) => Number(i[valor])), 1);
  return `<div class="ranking-regioes">${itens.map((i) => `<div class="linha-reg" tabindex="0" data-dica="${esc(formato(Number(i[valor])))}|${esc(i[rotulo])}">
    <span class="nome">${esc(i[rotulo])}</span><div class="trilho"><div class="barra" style="width:${(Number(i[valor]) / max) * 100}%"></div></div>
    <span class="num">${formato(Number(i[valor]))}</span></div>`).join('')}</div>`;
}

// ---------- 3. Relatórios ----------
TELAS_EXTRAS.relatorios = async function relatorios() {
  const r = await api('/relatorios');
  const t = r.totais;
  const NOMES_DEST = { RECICLAGEM: 'Reciclagem', REUSO: 'Reuso', DESCARTE_ESPECIAL: 'Descarte especial' };
  const mesBR = (m) => { const [a, mm] = String(m).split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(mm) - 1]}/${a.slice(2)}`; };
  const totalColetas = r.status.reduce((s, x) => s + Number(x.coletas), 0) || 1;

  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div><h1>Relatórios</h1>
      <p class="sub">Indicadores da plataforma calculados pelas views do banco (vw_descartes_por_mes, vw_kg_por_material, vw_tempo_medio_logistica e outras).</p></div>
      ${botaoCsv('csv-tudo', 'Exportar tudo')}
    </div>
    <div class="m-resumo r5-kpis">
      <div class="cartao kpi"><span class="rotulo">Itens descartados</span><span class="valor">${num(t.itens)}</span><div class="rodape">${kg(t.kg)} kg no total</div></div>
      <div class="cartao kpi"><span class="rotulo">Certificados</span><span class="valor">${num(t.certificados)}</span><div class="rodape">${kg(t.kg_certificado)} kg com destino comprovado</div></div>
      <div class="cartao kpi"><span class="rotulo">Destino comprovado</span><span class="valor">${fmt1(t.taxa)}<span class="unidade">%</span></span><div class="rodape">do peso descartado</div></div>
      <div class="cartao kpi"><span class="rotulo">Pontos de coleta</span><span class="valor">${num(t.pontos)}</span><div class="rodape">${num(t.usuarios)} usuários ativos</div></div>
    </div>
    <div class="r5-grade">
      <div class="cartao r5-largo">
        <div class="r5-topo"><div><h2>Descartes por mês</h2><p class="legenda-card">kg registrados nos últimos 12 meses</p></div>${botaoCsv('csv-mes')}</div>
        <svg id="graf-mes" class="r5-graf" role="img" aria-label="Gráfico de colunas: kg descartados por mês"></svg>
      </div>
      <div class="cartao">
        <div class="r5-topo"><div><h2>Por equipamento</h2><p class="legenda-card">kg descartados</p></div>${botaoCsv('csv-tipo')}</div>
        ${barrasH(r.porTipo, 'equipamento', 'kg')}
      </div>
      <div class="cartao">
        <div class="r5-topo"><div><h2>Materiais recuperados</h2><p class="legenda-card">kg e valor estimado de mercado</p></div>${botaoCsv('csv-mat')}</div>
        ${barrasH(r.porMaterial, 'material', 'kg_recuperados')}
        <p class="nota">Valor estimado: R$ ${fmt1(r.porMaterial.reduce((s, m) => s + Number(m.valor_estimado_reais || 0), 0), 2)}</p>
      </div>
      <div class="cartao">
        <div class="r5-topo"><div><h2>Situação das coletas</h2><p class="legenda-card">${num(totalColetas)} coletas</p></div>${botaoCsv('csv-status')}</div>
        <div class="r5-pilha">${r.status.map((s) => `<span class="st-${esc(s.status)}" style="flex:${Number(s.coletas)}" data-dica="${num(s.coletas)} coletas|${esc(NOMES_STATUS[s.status] || s.status)}"></span>`).join('')}</div>
        <div class="r5-legenda">${r.status.map((s) => `<span><i class="st-${esc(s.status)}"></i>${esc(NOMES_STATUS[s.status] || s.status)} <b>${fmt1((s.coletas / totalColetas) * 100)}%</b></span>`).join('')}</div>
        <h2 style="margin-top:18px">Destino dos componentes</h2>
        ${barrasH(r.destinos.map((d) => ({ ...d, nome: NOMES_DEST[d.tipo] || d.tipo })), 'nome', 'kg')}
      </div>
      <div class="cartao">
        <div class="r5-topo"><div><h2>Recicladores mais rápidos</h2><p class="legenda-card">dias, em média, da solicitação até a entrega</p></div>${botaoCsv('csv-tempo')}</div>
        ${r.tempo.length ? barrasH(r.tempo, 'reciclador', 'dias_medios', (v) => fmt1(v) + ' dias') : '<p class="vazio">Ainda sem coletas entregues.</p>'}
      </div>
      <div class="cartao r5-largo">
        <div class="r5-topo"><div><h2>Cidades com mais descarte</h2><p class="legenda-card">top 10 por kg</p></div>${botaoCsv('csv-cid')}</div>
        <table><tr><th>Cidade</th><th class="num">Itens</th><th class="num">kg</th></tr>
          ${r.cidades.map((c) => `<tr><td>${esc(c.cidade)}/${esc(c.uf)}</td><td class="num">${num(c.itens)}</td><td class="num">${kg(c.kg_descartados)}</td></tr>`).join('')}</table>
      </div>
    </div>`;

  // Colunas por mês (D3)
  const svg = d3.select('#graf-mes');
  const desenhar = () => {
    const W = svg.node().clientWidth, H = 240, m = { t: 16, r: 8, b: 28, l: 48 };
    svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
    const x = d3.scaleBand().domain(r.porMes.map((d) => d.mes)).range([m.l, W - m.r]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(r.porMes, (d) => Number(d.kg)) || 1]).nice().range([H - m.b, m.t]);
    svg.append('g').attr('class', 'eixo').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat((v) => num(v)))
      .call((g) => g.select('.domain').remove());
    svg.append('g').attr('class', 'eixo').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(mesBR).tickSizeOuter(0));
    svg.append('g').selectAll('rect').data(r.porMes).join('rect').attr('class', 'r5-coluna')
      .attr('x', (d) => x(d.mes)).attr('width', x.bandwidth()).attr('y', (d) => y(Number(d.kg))).attr('height', (d) => y(0) - y(Number(d.kg))).attr('rx', 4)
      .attr('data-dica', (d) => `${kg(d.kg)} kg · ${num(d.itens)} itens|${mesBR(d.mes)}`);
  };
  desenhar();
  addEventListener('resize', desenhar);
  limparTela = () => removeEventListener('resize', desenhar);

  const csvs = {
    'csv-mes': ['descartes_por_mes', r.porMes, [['mes', 'Mês'], ['itens', 'Itens'], ['kg', 'kg']]],
    'csv-tipo': ['descartes_por_equipamento', r.porTipo, [['equipamento', 'Equipamento'], ['itens', 'Itens'], ['kg', 'kg']]],
    'csv-mat': ['materiais_recuperados', r.porMaterial, [['material', 'Material'], ['categoria', 'Categoria'], ['kg_recuperados', 'kg recuperados'], ['valor_estimado_reais', 'Valor estimado (R$)']]],
    'csv-status': ['situacao_coletas', r.status, [['status', 'Status'], ['coletas', 'Coletas']]],
    'csv-tempo': ['tempo_medio_recicladores', r.tempo, [['reciclador', 'Reciclador'], ['coletas_entregues', 'Coletas entregues'], ['dias_medios', 'Dias em média']]],
    'csv-cid': ['cidades', r.cidades, [['cidade', 'Cidade'], ['uf', 'UF'], ['itens', 'Itens'], ['kg_descartados', 'kg']]],
  };
  Object.entries(csvs).forEach(([id, [nome, linhas, cols]]) => ($('#' + id).onclick = () => baixarCsv(`circuitoverde_${nome}`, linhas, cols)));
  $('#csv-tudo').onclick = () => baixarCsv('circuitoverde_indicadores', [
    { indicador: 'Itens descartados', valor: Number(t.itens) }, { indicador: 'kg descartados', valor: Number(t.kg) },
    { indicador: 'Certificados', valor: Number(t.certificados) }, { indicador: 'kg com destino comprovado', valor: Number(t.kg_certificado) },
    { indicador: '% destino comprovado', valor: Number(t.taxa.toFixed(2)) }, { indicador: 'Pontos de coleta', valor: Number(t.pontos) },
    { indicador: 'Usuários ativos', valor: Number(t.usuarios) },
  ], [['indicador', 'Indicador'], ['valor', 'Valor']]);
};

// ---------- 4. Auditoria ----------
TELAS_EXTRAS.auditoria = async function auditoria() {
  const d = await api('/auditoria?limite=300');
  let aba = 'coletas';
  let busca = '';
  const NOMES_PONTO = { PENDENTE: 'Aguardando aprovação', APROVADO: 'Publicado', REJEITADO: 'Rejeitado' };
  $('#conteudo').innerHTML = `
    <div class="cabecalho">
      <div><h1>Trilha de auditoria</h1>
      <p class="sub">Cada mudança é gravada pelo próprio banco, por triggers (trg_logistica_ai, trg_logistica_au e trg_ponto_au): ninguém consegue alterar a coleta sem deixar registro.</p></div>
      ${botaoCsv('csv-aud', 'Exportar')}
    </div>
    <div class="m-resumo">
      <div class="cartao kpi"><span class="rotulo">Eventos de coleta</span><span class="valor">${num(d.resumo.eventos_total)}</span><div class="rodape">${num(d.resumo.eventos_7d)} nos últimos 7 dias</div></div>
      <div class="cartao kpi"><span class="rotulo">Cancelamentos</span><span class="valor">${num(d.resumo.cancelamentos)}</span><div class="rodape">coletas canceladas</div></div>
      <div class="cartao kpi"><span class="rotulo">Certificados</span><span class="valor">${num(d.resumo.certificados_30d)}</span><div class="rodape">emitidos em 30 dias</div></div>
      <div class="cartao kpi"><span class="rotulo">Pontos de coleta</span><span class="valor">${num(d.pontos.length)}</span><div class="rodape">mudanças registradas</div></div>
    </div>
    <div class="cartao barra-filtros" style="margin-bottom:18px">
      <div class="segmentado" id="aud-aba" role="tablist">
        <button type="button" role="tab" data-aba="coletas" class="ativo">Coletas</button>
        <button type="button" role="tab" data-aba="pontos">Pontos de coleta</button>
      </div>
      ${campoBusca('aud-busca', 'Buscar por item, equipamento, pessoa ou cidade')}
    </div>
    <div class="cartao" id="aud-lista"></div>`;

  const filtrar = (linhas, texto) => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);
    return linhas.filter((l) => { const tx = semAcento(texto(l)); return termos.every((x) => tx.includes(x)); });
  };
  function lista() {
    if (aba === 'coletas') {
      const itens = filtrar(d.coletas, (l) => `${l.id_item} ${l.equipamento} ${l.gerador} ${l.reciclador} ${l.transportador || ''} ${NOMES_STATUS[l.status]}`);
      $('#aud-busca-conta').textContent = busca ? `${itens.length} encontrado(s)` : '';
      $('#aud-lista').innerHTML = !itens.length ? '<p class="vazio">Nenhum evento.</p>' : `<table>
        <tr><th>Quando</th><th>Coleta</th><th>Novo status</th><th>Gerador</th><th>Transportador</th><th>Reciclador</th></tr>
        ${itens.map((l) => `<tr><td>${dataBR(String(l.data_hora).slice(0, 16))}</td>
          <td>${esc(l.equipamento)} <small style="color:var(--texto-2)">item nº ${l.id_item} · coleta nº ${l.id_logistica}</small></td>
          <td>${badge(l.status)}</td><td>${esc(l.gerador)}</td><td>${esc(l.transportador || '-')}</td><td>${esc(l.reciclador)}</td></tr>`).join('')}
      </table><p class="nota">Mostrando os ${num(d.coletas.length)} eventos mais recentes.</p>`;
    } else {
      const itens = filtrar(d.pontos, (l) => `${l.nome} ${l.cidade} ${l.uf} ${NOMES_PONTO[l.status]} ${l.motivo || ''}`);
      $('#aud-busca-conta').textContent = busca ? `${itens.length} encontrado(s)` : '';
      $('#aud-lista').innerHTML = !itens.length ? '<p class="vazio">Nenhuma mudança em pontos de coleta ainda.</p>' : `<table>
        <tr><th>Quando</th><th>Ponto</th><th>Situação</th><th>Motivo</th></tr>
        ${itens.map((l) => `<tr><td>${dataBR(String(l.data_hora).slice(0, 16))}</td>
          <td>${esc(l.nome)} <small style="color:var(--texto-2)">${esc(l.cidade)}/${esc(l.uf)}</small></td>
          <td>${l.ativo ? esc(NOMES_PONTO[l.status] || l.status) : 'Desativado'}</td><td>${esc(l.motivo || '-')}</td></tr>`).join('')}
      </table>`;
    }
  }
  document.querySelectorAll('#aud-aba button').forEach((b) => (b.onclick = () => {
    aba = b.dataset.aba;
    document.querySelectorAll('#aud-aba button').forEach((x) => x.classList.toggle('ativo', x === b));
    lista();
  }));
  $('#aud-busca').addEventListener('input', (e) => { busca = e.target.value; lista(); });
  $('#csv-aud').onclick = () => (aba === 'coletas'
    ? baixarCsv('circuitoverde_auditoria_coletas', d.coletas.map((l) => ({ ...l, status: NOMES_STATUS[l.status] || l.status })),
      [['data_hora', 'Quando'], ['id_logistica', 'Coleta'], ['id_item', 'Item'], ['equipamento', 'Equipamento'], ['status', 'Novo status'], ['gerador', 'Gerador'], ['transportador', 'Transportador'], ['reciclador', 'Reciclador']])
    : baixarCsv('circuitoverde_auditoria_pontos', d.pontos.map((l) => ({ ...l, status: l.ativo ? NOMES_PONTO[l.status] : 'Desativado' })),
      [['data_hora', 'Quando'], ['id_ponto', 'Ponto'], ['nome', 'Nome'], ['cidade', 'Cidade'], ['uf', 'UF'], ['status', 'Situação'], ['motivo', 'Motivo']]));
  lista();
};

// ---------- 5. Meu perfil e troca de senha ----------
TELAS_EXTRAS.perfil = async function perfil() {
  const p = await api('/auth/perfil');
  const papel = p.papel || {};
  const docFmt = (d) => (String(d || '').length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : String(d || '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
  const NOME_PERFIL = { GERADOR: 'Gerador', TRANSPORTADOR: 'Transportador', RECICLADOR: 'Reciclador', ADMIN: 'Administrador', AUDITOR: 'Auditor' };
  $('#conteudo').innerHTML = `
    <h1>Meu perfil</h1>
    <p class="sub">Atualize seus dados de contato e troque a sua senha.</p>
    <div class="perfil-grade">
      <div class="cartao perfil-cartao">
        <div class="perfil-avatar">${esc(p.nome.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase())}</div>
        <h2>${esc(p.nome)}</h2>
        <span class="etapa etapa-pronto">${esc(NOME_PERFIL[p.perfil] || p.perfil)}</span>
        <dl>
          ${p.login ? `<div><dt>Usuário</dt><dd>${esc(p.login)}</dd></div>` : ''}
          ${papel.documento ? `<div><dt>${String(papel.documento).length === 11 ? 'CPF' : 'CNPJ'}</dt><dd>${esc(docFmt(papel.documento))}</dd></div>` : ''}
          ${papel.cidade ? `<div><dt>Endereço</dt><dd>${esc(papel.logradouro)}, ${esc(papel.numero)} · ${esc(papel.cidade)}/${esc(papel.uf)}</dd></div>` : ''}
          <div><dt>Conta criada em</dt><dd>${dataBR(String(p.criado_em).slice(0, 10))}</dd></div>
        </dl>
        <p class="nota">CPF/CNPJ e endereço identificam a conta e não são alterados aqui.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <form class="cartao" id="f-perfil" novalidate>
          <h2>Dados da conta</h2>
          <div class="linha">
            <label>Nome <input name="nome" required minlength="3" maxlength="120" value="${esc(p.nome)}" autocomplete="name"></label>
            <label>E-mail <input name="email" type="email" required maxlength="150" value="${esc(p.email)}" autocomplete="email"></label>
          </div>
          ${p.perfil === 'GERADOR' ? `<label>Telefone <input name="telefone" type="tel" maxlength="16" value="${esc(papel.telefone || '')}" autocomplete="tel"></label>` : ''}
          ${p.perfil === 'TRANSPORTADOR' ? `<label>Placa do veículo <input name="placa" required maxlength="8" value="${esc(papel.placa_veiculo || '')}"></label>` : ''}
          ${p.perfil === 'RECICLADOR' ? `<div class="linha">
            <label>Licença ambiental <input name="licenca" required maxlength="40" value="${esc(papel.licenca_ambiental || '')}"></label>
            <label>Capacidade (kg por mês) <input name="capacidade" type="number" min="1" step="1" required value="${Number(papel.capacidade_kg_mes || 0)}"></label></div>` : ''}
          <div class="acoes"><button class="btn" id="p-salvar">Salvar dados</button></div>
        </form>
        <form class="cartao" id="f-senha" novalidate>
          <h2>Trocar senha</h2>
          <label>Senha atual <input name="atual" type="password" required autocomplete="current-password"></label>
          <div class="linha">
            <label>Nova senha <input name="nova" type="password" required minlength="8" autocomplete="new-password" aria-describedby="forca-senha"></label>
            <label>Repita a nova senha <input name="repete" type="password" required minlength="8" autocomplete="new-password"></label>
          </div>
          <div class="forca" id="forca-senha" aria-live="polite"><span></span><small></small></div>
          <div class="acoes"><button class="btn" id="s-salvar">Trocar senha</button></div>
        </form>
      </div>
    </div>`;

  const fp = $('#f-perfil');
  fp.placa && fp.placa.addEventListener('input', () => { fp.placa.value = fp.placa.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7); });
  fp.onsubmit = async (e) => {
    e.preventDefault(); if (!fp.reportValidity()) return;
    const v = Object.fromEntries(new FormData(fp));
    const b = $('#p-salvar'); b.disabled = true;
    try {
      const r = await api('/auth/perfil', { metodo: 'PUT', corpo: { ...v, capacidade: v.capacidade ? Number(v.capacidade) : undefined } });
      salvarSessao({ token: r.token, usuario: { ...sessao.usuario, ...r.usuario } });
      montarMenu(); avisar(r.mensagem);
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
    b.disabled = false;
  };

  // Medidor simples de força da senha
  const fs = $('#f-senha');
  fs.nova.addEventListener('input', () => {
    const s = fs.nova.value;
    const pontos = [s.length >= 8, s.length >= 12, /[a-z]/.test(s) && /[A-Z]/.test(s), /\d/.test(s), /[^A-Za-z0-9]/.test(s)].filter(Boolean).length;
    const [rot, cls] = !s ? ['', ''] : pontos <= 2 ? ['Fraca', 'fraca'] : pontos <= 3 ? ['Média', 'media'] : ['Forte', 'forte'];
    $('#forca-senha').className = `forca ${cls}`; $('#forca-senha small').textContent = rot ? `Senha ${rot.toLowerCase()}` : '';
    $('#forca-senha span').style.width = `${(pontos / 5) * 100}%`;
  });
  fs.onsubmit = async (e) => {
    e.preventDefault(); if (!fs.reportValidity()) return;
    if (fs.nova.value !== fs.repete.value) return avisar('As duas senhas novas não são iguais.', true);
    const b = $('#s-salvar'); b.disabled = true;
    try {
      const r = await api('/auth/senha', { metodo: 'PUT', corpo: { atual: fs.atual.value, nova: fs.nova.value } });
      fs.reset(); $('#forca-senha').className = 'forca'; $('#forca-senha small').textContent = ''; $('#forca-senha span').style.width = '0';
      avisar(r.mensagem);
    } catch (err) { if (!(err instanceof TelaTrocada)) avisar(err.message, true); }
    b.disabled = false;
  };
};

// ---------- 6. Notificações (sininho no topo) ----------
// Os avisos vêm do histórico que o banco já grava; "lidos" ficam guardados só neste navegador.
let notificacoes = [];
let timerNotif = null;
const chaveVisto = () => `cv_notif_visto_${sessao?.usuario?.id || sessao?.usuario?.id_usuario || 'x'}_${sessao?.usuario?.perfil || ''}`;
const lerVisto = () => { try { return localStorage.getItem(chaveVisto()) || ''; } catch { return ''; } };
const gravarVisto = (v) => { try { localStorage.setItem(chaveVisto(), v); } catch { /* sem armazenamento: só não lembra */ } };
const naoLidas = () => notificacoes.filter((n) => String(n.quando) > lerVisto()).length;

function desenharSino() {
  const caixa = $('#notif');
  if (!caixa) return;
  const n = naoLidas();
  $('#notif-botao').innerHTML = `${icone('sino')}${n ? `<span class="notif-conta">${n > 9 ? '9+' : n}</span>` : ''}`;
  $('#notif-botao').setAttribute('aria-label', n ? `Notificações: ${n} novas` : 'Notificações');
  const visto = lerVisto();
  $('#notif-lista').innerHTML = `<div class="notif-topo"><b>Notificações</b>${notificacoes.length ? '<button class="link-assistente" id="notif-limpar">Marcar como lidas</button>' : ''}</div>`
    + (notificacoes.length ? notificacoes.map((x) => `<button class="notif-item ${String(x.quando) > visto ? 'nova' : ''} notif-${esc(x.tipo)}" data-ir="${esc(x.tela)}">
        <span class="notif-ponto"></span><span><b>${esc(x.titulo)}</b><small>${esc(x.texto)}</small><em>${dataBR(String(x.quando).slice(0, 16))}</em></span></button>`).join('')
      : '<p class="vazio" style="margin:12px">Nada novo por aqui.</p>');
  document.querySelectorAll('#notif-lista [data-ir]').forEach((b) => (b.onclick = () => { $('#notif-lista').hidden = true; ir(b.dataset.ir); }));
  $('#notif-limpar') && ($('#notif-limpar').onclick = (e) => { e.stopPropagation(); marcarLidas(); });
}
function marcarLidas() { if (notificacoes.length) gravarVisto(String(notificacoes[0].quando)); desenharSino(); }
async function buscarNotificacoes() {
  if (!sessao) return;
  try { notificacoes = await api('/notificacoes', { global: true }); desenharSino(); } catch { /* sem conexão: tenta de novo depois */ }
}

// Clicar fora fecha a lista (um único ouvinte para a página toda)
document.addEventListener('click', () => { const l = $('#notif-lista'); if (l) l.hidden = true; });

// Acrescenta o sino e o link do perfil ao menu montado pelo app-v3.js
const montarMenuV3 = montarMenu;
montarMenu = function () {
  montarMenuV3();
  if (!sessao) { clearInterval(timerNotif); timerNotif = null; notificacoes = []; return; }
  const usuario = $('#sessao .usuario');
  if (usuario && !$('#notif')) {
    usuario.insertAdjacentHTML('beforebegin', `<div class="notif" id="notif">
      <button class="botao-tema" id="notif-botao" aria-haspopup="true" aria-label="Notificações" title="Notificações"></button>
      <div class="notif-lista" id="notif-lista" hidden></div></div>`);
    $('#notif-botao').onclick = (e) => {
      e.stopPropagation();
      const lista = $('#notif-lista'); lista.hidden = !lista.hidden;
      if (!lista.hidden) setTimeout(marcarLidas, 2500);   // ao abrir, considera lido depois de um instante
    };
    $('#notif-lista').onclick = (e) => e.stopPropagation();
    desenharSino();
  }
  // Clicar no nome/avatar abre o perfil
  const info = $('#sessao .usuario');
  if (info) {
    info.classList.add('clicavel');
    info.querySelectorAll('.avatar, .usuario-info').forEach((el) => { el.onclick = () => ir('perfil'); el.style.cursor = 'pointer'; });
    info.querySelector('.avatar')?.setAttribute('title', 'Meu perfil');
  }
  if (!timerNotif) { buscarNotificacoes(); timerNotif = setInterval(buscarNotificacoes, 60000); }
};
