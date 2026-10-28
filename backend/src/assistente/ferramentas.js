// Ferramentas do assistente: consultas SOMENTE DE LEITURA às views e funções do banco.
// A IA (Gemini) e o bot por regras usam exatamente as mesmas funções.
// A IA nunca escreve SQL: ela só escolhe uma ferramenta e os parâmetros.
const pool = require('../db');

const CATEGORIAS = ['INFORMATICA', 'TELEFONIA', 'ELETRODOMESTICO', 'ENTRETENIMENTO', 'PILHAS_BATERIAS'];

// Apelidos populares -> nome na tabela tipo_equipamento
const SINONIMOS = {
  celular: 'Smartphone', celulares: 'Smartphone', smartphone: 'Smartphone', telefone: 'Smartphone',
  notebook: 'Notebook', notebooks: 'Notebook', laptop: 'Notebook',
  computador: 'Desktop', computadores: 'Desktop', pc: 'Desktop', desktop: 'Desktop', cpu: 'Desktop',
  monitor: 'Monitor LCD', monitores: 'Monitor LCD', tela: 'Monitor LCD',
  tv: 'TV LED', tvs: 'TV LED', televisao: 'TV LED', televisor: 'TV LED',
  tablet: 'Tablet', tablets: 'Tablet', ipad: 'Tablet',
  impressora: 'Impressora', impressoras: 'Impressora',
  roteador: 'Roteador', modem: 'Roteador',
  microondas: 'Micro-ondas', 'micro-ondas': 'Micro-ondas',
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const num = (v, casas = 1) => Math.round(Number(v || 0) * 10 ** casas) / 10 ** casas;
const linkMapa = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
const endereco = (p) => `${p.logradouro}, ${p.numero} - ${p.bairro}, ${p.cidade}/${p.uf}`;

function formatarPonto(p) {
  return {
    nome: p.nome, endereco: endereco(p), cidade: p.cidade, uf: p.uf, canal: p.canal,
    origem: p.origem === 'FICTICIO' ? 'fictício (dado de teste)' : p.origem === 'ABREE' ? 'real (base ABREE)' : 'reciclador da plataforma',
    distancia_km: p.distancia_km != null ? num(p.distancia_km, 2) : undefined,
    rota: linkMapa(p),
  };
}

// ---------------------------------------------------------------------
async function buscarPontosColeta({ cidade, uf, latitude, longitude, categoria, limite } = {}) {
  const lim = Math.min(Math.max(Number(limite) || 5, 1), 10);
  const cat = CATEGORIAS.includes(String(categoria || '').toUpperCase()) ? String(categoria).toUpperCase() : null;
  const lat = Number(latitude), lng = Number(longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
    const [pontos] = await pool.query(`
      SELECT v.*, fn_distancia_km(?, ?, v.latitude, v.longitude) AS distancia_km
        FROM vw_pontos_coleta v
       WHERE v.latitude IS NOT NULL ${cat ? 'AND FIND_IN_SET(?, v.categorias)' : ''}
       ORDER BY distancia_km LIMIT ?`, [lat, lng, ...(cat ? [cat] : []), lim]);
    return { busca: 'por localização', pontos: pontos.map(formatarPonto) };
  }
  if (cidade) {
    const filtros = ['v.cidade = ?'], params = [cidade];
    if (uf) { filtros.push('v.uf = ?'); params.push(String(uf).toUpperCase().slice(0, 2)); }
    if (cat) { filtros.push('FIND_IN_SET(?, v.categorias)'); params.push(cat); }
    const [pontos] = await pool.query(`
      SELECT v.* FROM vw_pontos_coleta v WHERE ${filtros.join(' AND ')}
       ORDER BY FIELD(v.origem, 'CIRCUITOVERDE', 'ABREE', 'FICTICIO'), v.nome LIMIT ?`, [...params, lim]);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM vw_pontos_coleta v WHERE ${filtros.join(' AND ')}`, params);
    if (!pontos.length) {
      const [cidades] = await pool.query('SELECT DISTINCT uf FROM vw_pontos_coleta ORDER BY uf');
      return { busca: 'por cidade', cidade, total: 0, mensagem: 'Nenhum ponto cadastrado nessa cidade.', estados_com_pontos: cidades.map((c) => c.uf) };
    }
    return { busca: 'por cidade', cidade: pontos[0].cidade, uf: pontos[0].uf, categoria: cat, total_na_cidade: total, pontos: pontos.map(formatarPonto) };
  }
  return { erro: 'Informe a cidade ou a localização (latitude e longitude).' };
}

// ---------------------------------------------------------------------
// Rastreio: só mostra nomes para o dono do item ou para perfis internos (LGPD)
async function rastrearItem({ id_item } = {}, ctx = {}) {
  const id = Number(id_item);
  if (!Number.isInteger(id) || id <= 0) return { erro: 'Informe o número do item.' };
  const [[item]] = await pool.query(`
    SELECT v.*, i.id_gerador, i.peso_kg, i.data_descarte, i.estado
      FROM vw_rastreio_item v JOIN item_eletronico i ON i.id_item = v.id_item
     WHERE v.id_item = ?`, [id]);
  if (!item) return { erro: `O item nº ${id} não existe.` };

  const u = ctx.usuario;
  let podeVerNomes = u && ['ADMIN', 'AUDITOR', 'RECICLADOR', 'TRANSPORTADOR'].includes(u.perfil);
  if (u && u.perfil === 'GERADOR') {
    const [[g]] = await pool.query('SELECT id_gerador FROM gerador WHERE id_usuario = ?', [u.id_usuario]);
    podeVerNomes = g && g.id_gerador === item.id_gerador;
  }
  const [historico] = await pool.query(`
    SELECT s.status, s.data_hora FROM status_logistica s
      JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
     WHERE l.id_item = ? ORDER BY s.data_hora`, [id]);
  const [[comp]] = await pool.query(`
    SELECT COUNT(*) AS componentes, COUNT(d.id_destino) AS com_destino
      FROM componente c LEFT JOIN destino_final d ON d.id_componente = c.id_componente WHERE c.id_item = ?`, [id]);

  return {
    id_item: id, equipamento: item.equipamento, peso_kg: num(item.peso_kg, 3), registrado_em: item.data_descarte,
    status_coleta: item.status_atual || 'coleta ainda não solicitada',
    historico: historico.map((h) => ({ status: h.status, data: h.data_hora })),
    componentes: comp.componentes, componentes_com_destino: comp.com_destino,
    certificado_emitido: !!item.certificado,
    ...(podeVerNomes
      ? { gerador: item.gerador, reciclador: item.reciclador, codigo_certificado: item.certificado }
      : { observacao: 'Nomes e código do certificado aparecem só para o dono do item depois do login.' }),
  };
}

// ---------------------------------------------------------------------
async function validarCertificado({ codigo } = {}) {
  const c = String(codigo || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(c)) return { erro: 'Código inválido. Ele tem 36 caracteres, como 19eccdf5-c742-11f1-851a-02fc00000001.' };
  const [[cert]] = await pool.query('SELECT * FROM vw_certificado_publico WHERE codigo = ?', [c]);
  if (!cert) return { valido: false, mensagem: 'Certificado não encontrado.' };
  return { valido: true, ...cert, peso_total_kg: num(cert.peso_total_kg, 3), kg_reaproveitado: num(cert.kg_reaproveitado, 3) };
}

// ---------------------------------------------------------------------
async function indicadoresPlataforma() {
  const [[t]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM item_eletronico) AS itens_descartados,
           (SELECT COALESCE(SUM(peso_kg),0) FROM item_eletronico) AS kg_descartados,
           (SELECT COUNT(*) FROM certificado) AS certificados_emitidos,
           (SELECT COALESCE(SUM(peso_total_kg),0) FROM certificado) AS kg_com_destino_comprovado,
           (SELECT COUNT(*) FROM gerador) AS geradores,
           (SELECT COUNT(*) FROM ponto_coleta WHERE ativo) AS pontos_de_coleta`);
  const [materiais] = await pool.query('SELECT material, kg_recuperados FROM vw_kg_por_material ORDER BY kg_recuperados DESC LIMIT 5');
  const [tipos] = await pool.query('SELECT equipamento, itens FROM vw_descartes_por_tipo ORDER BY itens DESC LIMIT 3');
  return {
    ...t, kg_descartados: num(t.kg_descartados), kg_com_destino_comprovado: num(t.kg_com_destino_comprovado),
    percentual_com_destino_comprovado: num(t.kg_descartados ? (t.kg_com_destino_comprovado / t.kg_descartados) * 100 : 0),
    materiais_mais_recuperados: materiais.map((m) => ({ material: m.material, kg: num(m.kg_recuperados) })),
    equipamentos_mais_descartados: tipos,
    observacao: 'Números calculados com os dados de teste da plataforma.',
  };
}

// ---------------------------------------------------------------------
async function panoramaGlobal({ ano } = {}) {
  const [anos] = await pool.query('SELECT DISTINCT ano, estimativa FROM vw_panorama ORDER BY ano');
  const a = anos.some((x) => x.ano === Number(ano)) ? Number(ano) : 2022;
  const [linhas] = await pool.query('SELECT * FROM vw_panorama WHERE ano = ? ORDER BY sem_destino_mt DESC', [a]);
  const f = (l) => ({ local: l.local, gerado_mt: num(l.gerado_mt, 2), taxa_reciclagem_documentada: num(l.taxa_coleta), sem_destino_documentado_mt: num(l.sem_destino_mt, 2), kg_por_habitante: l.kg_habitante });
  return {
    ano: a, estimativa: !!linhas[0]?.estimativa, anos_disponiveis: anos.map((x) => x.ano),
    mundo: f(linhas.find((l) => l.escopo === 'MUNDO')),
    regioes: linhas.filter((l) => l.escopo === 'REGIAO').map(f),
    paises: linhas.filter((l) => l.escopo === 'PAIS').map(f),
    unidade: 'Mt = milhões de toneladas', fonte: linhas[0]?.fonte,
  };
}

// ---------------------------------------------------------------------
async function identificarTipo(texto) {
  const t = semAcento(texto);
  const alvo = SINONIMOS[t] || Object.entries(SINONIMOS).find(([k]) => t.includes(k))?.[1] || texto;
  const [[tipo]] = await pool.query('SELECT id_tipo, nome FROM tipo_equipamento WHERE nome = ? OR nome LIKE ? ORDER BY nome = ? DESC LIMIT 1', [alvo, `%${alvo}%`, alvo]);
  return tipo || null;
}

async function calcularImpacto({ equipamento, quantidade, peso_kg } = {}) {
  const tipo = await identificarTipo(equipamento);
  if (!tipo) {
    const [tipos] = await pool.query('SELECT nome FROM tipo_equipamento ORDER BY nome');
    return { erro: `Não conheço o equipamento "${equipamento}".`, equipamentos_disponiveis: tipos.map((x) => x.nome) };
  }
  const qtd = Math.min(Math.max(Number(quantidade) || 1, 1), 10000);
  const [comp] = await pool.query('SELECT * FROM vw_composicao_media_tipo WHERE id_tipo = ? ORDER BY kg_por_kg DESC', [tipo.id_tipo]);
  if (!comp.length) return { erro: `Ainda não há dados de reciclagem de ${tipo.nome}.` };
  const pesoUnit = Number(peso_kg) > 0 ? Number(peso_kg) : Number(comp[0].peso_medio_item_kg);
  const total = pesoUnit * qtd;
  const materiais = comp.map((m) => ({ material: m.material, kg: num(Number(m.kg_por_kg) * total, 3), valor_reais: num(Number(m.kg_por_kg) * total * Number(m.valor_ref_kg), 2) }));
  return {
    equipamento: tipo.nome, quantidade: qtd, peso_por_unidade_kg: num(pesoUnit, 3), peso_total_kg: num(total, 3),
    materiais, valor_total_estimado_reais: num(materiais.reduce((s, m) => s + m.valor_reais, 0), 2),
    base: `média de ${comp[0].itens_analisados} itens já desmontados pelos recicladores (valores por kg ilustrativos)`,
  };
}

// ---------------------------------------------------------------------
async function rankingGeradores({ limite } = {}) {
  const lim = Math.min(Math.max(Number(limite) || 5, 1), 10);
  const [linhas] = await pool.query(`
    SELECT posicao, nome_publico, tipo, cidade, uf, kg_certificado, selo
      FROM vw_ranking_geradores WHERE itens > 0 ORDER BY posicao LIMIT ?`, [lim]);
  return { criterio: 'kg com certificado de destinação', selos: 'Ouro >= 25 kg, Prata >= 10 kg, Bronze > 0',
    ranking: linhas.map((l) => ({ ...l, kg_certificado: num(l.kg_certificado) })) };
}

// ---------------------------------------------------------------------
// Catálogo: execução + declaração no formato de "function calling" do Gemini
const FERRAMENTAS = {
  buscar_pontos_coleta: {
    executar: buscarPontosColeta,
    descricao: 'Busca pontos de coleta de lixo eletrônico. Use a cidade OU a latitude/longitude do usuário (quando ele compartilhou a localização).',
    parametros: {
      cidade: { type: 'STRING', description: 'Nome da cidade, ex.: Curitiba' },
      uf: { type: 'STRING', description: 'Sigla do estado, ex.: PR' },
      latitude: { type: 'NUMBER' }, longitude: { type: 'NUMBER' },
      categoria: { type: 'STRING', description: 'INFORMATICA, TELEFONIA, ELETRODOMESTICO, ENTRETENIMENTO ou PILHAS_BATERIAS' },
      limite: { type: 'INTEGER', description: 'Quantidade de pontos (1 a 10, padrão 5)' },
    },
  },
  rastrear_item: {
    executar: rastrearItem,
    descricao: 'Mostra o status de um item descartado (coleta, componentes, destino e certificado) pelo número do item.',
    parametros: { id_item: { type: 'INTEGER', description: 'Número do item' } }, obrigatorios: ['id_item'],
  },
  validar_certificado: {
    executar: validarCertificado,
    descricao: 'Confere se um certificado de destinação é válido pelo código de 36 caracteres.',
    parametros: { codigo: { type: 'STRING' } }, obrigatorios: ['codigo'],
  },
  indicadores_plataforma: {
    executar: indicadoresPlataforma,
    descricao: 'Números gerais do CircuitoVerde: itens descartados, kg, certificados, materiais recuperados e pontos de coleta.',
    parametros: {},
  },
  panorama_global: {
    executar: panoramaGlobal,
    descricao: 'Dados reais da ONU sobre lixo eletrônico no mundo, por região e no Brasil (anos 2019, 2022 e estimativa 2026).',
    parametros: { ano: { type: 'INTEGER', description: '2019, 2022 ou 2026' } },
  },
  calcular_impacto: {
    executar: calcularImpacto,
    descricao: 'Estima quanto material (cobre, alumínio, placa etc.) é recuperado ao reciclar uma quantidade de um equipamento.',
    parametros: {
      equipamento: { type: 'STRING', description: 'ex.: celular, notebook, tv' },
      quantidade: { type: 'INTEGER' }, peso_kg: { type: 'NUMBER', description: 'Peso de cada unidade (opcional)' },
    },
    obrigatorios: ['equipamento'],
  },
  ranking_geradores: {
    executar: rankingGeradores,
    descricao: 'Ranking dos geradores com mais kg destinados corretamente e o selo verde de cada um.',
    parametros: { limite: { type: 'INTEGER' } },
  },
};

function declaracoesGemini() {
  return Object.entries(FERRAMENTAS).map(([name, f]) => ({
    name, description: f.descricao,
    ...(Object.keys(f.parametros).length
      ? { parameters: { type: 'OBJECT', properties: f.parametros, ...(f.obrigatorios ? { required: f.obrigatorios } : {}) } }
      : {}),
  }));
}

async function executar(nome, args, ctx) {
  const f = FERRAMENTAS[nome];
  if (!f) return { erro: `Ferramenta desconhecida: ${nome}` };
  try { return await f.executar(args || {}, ctx); }
  catch (err) { console.error('[assistente] erro na ferramenta', nome, err.message); return { erro: 'Falha ao consultar o banco.' }; }
}

module.exports = { FERRAMENTAS, declaracoesGemini, executar, semAcento, SINONIMOS };
