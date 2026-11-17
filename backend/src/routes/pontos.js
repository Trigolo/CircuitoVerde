// Pontos de coleta com geolocalização (reais da ABREE, recicladores da plataforma e fictícios)
const router = require('express').Router();
const pool = require('../db');
const { rota, idDoAtor } = require('../util');
const { autenticar, permitir } = require('../middlewares/auth');

const CATEGORIAS = ['INFORMATICA', 'TELEFONIA', 'ELETRODOMESTICO', 'ENTRETENIMENTO', 'PILHAS_BATERIAS', 'OUTRO'];

// GET /api/pontos/proximos?lat=-23.56&lng=-46.65&raio=10&limite=20&categoria=TELEFONIA
// Calcula a distância no banco (fn_distancia_km usa ST_Distance_Sphere) e devolve os mais próximos.
router.get('/proximos', rota(async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ erro: 'Informe lat e lng válidos.' });
  }
  const raio = Math.min(Math.max(Number(req.query.raio) || 10, 1), 300);   // km
  const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
  const categoria = CATEGORIAS.includes(req.query.categoria) ? req.query.categoria : null;

  // "Caixa" em volta do usuário: usa o índice de latitude/longitude antes do cálculo exato
  const dLat = raio / 111.32;
  const dLng = raio / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const consulta = (comCaixa) => pool.query(`
    SELECT v.*, fn_distancia_km(?, ?, v.latitude, v.longitude) AS distancia_km
      FROM vw_pontos_coleta v
     WHERE v.latitude IS NOT NULL
       ${comCaixa ? 'AND v.latitude BETWEEN ? AND ? AND v.longitude BETWEEN ? AND ?' : ''}
       ${categoria ? 'AND FIND_IN_SET(?, v.categorias)' : ''}
     ${comCaixa ? 'HAVING distancia_km <= ?' : ''}
     ORDER BY distancia_km
     LIMIT ?`,
  [lat, lng,
    ...(comCaixa ? [lat - dLat, lat + dLat, lng - dLng, lng + dLng] : []),
    ...(categoria ? [categoria] : []),
    ...(comCaixa ? [raio] : []),
    comCaixa ? limite : 3]);

  const [pontos] = await consulta(true);
  // Ninguém no raio? Devolve os 3 mais próximos do país inteiro, para o usuário não ficar sem resposta.
  const [maisProximos] = pontos.length ? [[]] : await consulta(false);
  res.json({ origem: { lat, lng }, raio_km: raio, pontos, fora_do_raio: maisProximos });
}));

// GET /api/pontos/cidades -> cidades com pontos e o "centro" de cada uma (busca sem GPS)
router.get('/cidades', rota(async (req, res) => {
  const [linhas] = await pool.query(`
    SELECT cidade, uf, COUNT(*) AS pontos,
           ROUND(AVG(latitude), 6) AS latitude, ROUND(AVG(longitude), 6) AS longitude
      FROM vw_pontos_coleta
     GROUP BY cidade, uf
     ORDER BY uf, cidade`);
  res.json(linhas);
}));

// GET /api/pontos/resumo -> números para o cabeçalho da tela
router.get('/resumo', rota(async (req, res) => {
  const [porOrigem] = await pool.query(`
    SELECT p.origem, COUNT(*) AS pontos, COUNT(DISTINCT e.uf) AS estados, COUNT(DISTINCT e.cidade) AS cidades
      FROM ponto_coleta p JOIN endereco e ON e.id_endereco = p.id_endereco
     WHERE p.ativo GROUP BY p.origem`);
  res.json(porOrigem);
}));

// GET /api/pontos/mapa -> só as coordenadas dos pontos aprovados (leve, para o globo)
router.get('/mapa', rota(async (req, res) => {
  const [linhas] = await pool.query(
    'SELECT id_ponto, nome, cidade, uf, origem, latitude, longitude FROM vw_pontos_coleta WHERE latitude IS NOT NULL');
  res.json(linhas);
}));

// =====================================================================
// Gestão de pontos (13_gestao_pontos.sql)
//   ADMIN      -> vê todos, cadastra já aprovado, edita, aprova, rejeita e ativa/desativa
//   RECICLADOR -> vê e cadastra os dele; cadastro e edição ficam PENDENTES até o admin aprovar
// =====================================================================
const CANAIS = ['Reciclador', 'Varejo', 'Assistência técnica', 'Cooperativa', 'Órgão público', 'Escola ou universidade', 'Empresa parceira', 'Outro'];
const soNumeros = (v) => String(v || '').replace(/\D/g, '');

// Monta o filtro de "quais pontos este usuário pode gerenciar"
async function escopo(usuario) {
  if (usuario.perfil === 'ADMIN') return { onde: '1 = 1', params: [], idRec: null };
  const idRec = await idDoAtor(pool, 'reciclador', usuario.id_usuario);
  return { onde: '(g.id_reciclador = ? OR g.cadastrado_por = ?)', params: [idRec ?? -1, usuario.id_usuario], idRec };
}

// Valida o corpo do cadastro/edição e devolve os dados limpos (ou a lista do que falta)
function validarPonto(b) {
  const e = b.endereco || {};
  const d = {
    nome: String(b.nome || '').trim().slice(0, 120),
    canal: CANAIS.includes(b.canal) ? b.canal : null,
    telefone: soNumeros(b.telefone).slice(0, 15) || null,
    horario: String(b.horario || '').trim().slice(0, 120) || null,
    categorias: [...new Set((Array.isArray(b.categorias) ? b.categorias : []).filter((c) => CATEGORIAS.includes(c)))],
    cep: soNumeros(e.cep), logradouro: String(e.logradouro || '').trim().slice(0, 150), numero: String(e.numero || '').trim().slice(0, 10),
    complemento: String(e.complemento || '').trim().slice(0, 60) || null, bairro: String(e.bairro || '').trim().slice(0, 80),
    cidade: String(e.cidade || '').trim().slice(0, 80), uf: String(e.uf || '').trim().toUpperCase(),
    // null ou vazio viraria 0 com Number(): trata como "não informado"
    lat: e.latitude == null || e.latitude === '' ? NaN : Number(e.latitude),
    lng: e.longitude == null || e.longitude === '' ? NaN : Number(e.longitude),
  };
  const faltando = [];
  if (d.nome.length < 3) faltando.push('nome do ponto');
  if (!d.canal) faltando.push('tipo de local');
  if (!d.categorias.length) faltando.push('pelo menos um tipo de material aceito');
  if (d.cep.length !== 8) faltando.push('CEP com 8 números');
  if (!d.logradouro || !d.numero || !d.bairro || !d.cidade) faltando.push('endereço completo');
  if (!/^[A-Z]{2}$/.test(d.uf)) faltando.push('UF');
  // Coordenadas dentro do Brasil (com folga)
  if (!(d.lat >= -34 && d.lat <= 6 && d.lng >= -74.5 && d.lng <= -28)) faltando.push('localização no mapa');
  return { d, faltando };
}

async function gravarCategorias(conn, idPonto, categorias) {
  await conn.query('DELETE FROM ponto_coleta_categoria WHERE id_ponto = ?', [idPonto]);
  for (const c of categorias) await conn.query('INSERT INTO ponto_coleta_categoria (id_ponto, categoria) VALUES (?, ?)', [idPonto, c]);
}

// GET /api/pontos/gestao?status=PENDENTE -> lista para a tela de gestão
router.get('/gestao', autenticar, permitir('ADMIN', 'RECICLADOR'), rota(async (req, res) => {
  const { onde, params: base } = await escopo(req.usuario);
  const params = [...base];
  const filtros = [onde];
  if (['PENDENTE', 'APROVADO', 'REJEITADO'].includes(req.query.status)) { filtros.push('g.status = ?'); params.push(req.query.status); }
  if (req.query.ativo === '0') filtros.push('g.ativo = FALSE');
  const [linhas] = await pool.query(`
    SELECT g.* FROM vw_gestao_pontos g WHERE ${filtros.join(' AND ')}
     ORDER BY FIELD(g.status, 'PENDENTE', 'REJEITADO', 'APROVADO'), g.criado_em DESC, g.id_ponto DESC`, params);
  const [contagem] = await pool.query(`
    SELECT g.status, SUM(g.ativo) AS ativos, COUNT(*) AS total FROM vw_gestao_pontos g WHERE ${onde} GROUP BY g.status`, base);
  res.json({ pontos: linhas, contagem, canais: CANAIS });
}));

// POST /api/pontos -> cadastra um ponto
router.post('/', autenticar, permitir('ADMIN', 'RECICLADOR'), rota(async (req, res) => {
  const { d, faltando } = validarPonto(req.body || {});
  if (faltando.length) return res.status(400).json({ erro: 'Confira: ' + faltando.join(', ') + '.' });
  const ehAdmin = req.usuario.perfil === 'ADMIN';
  const idRec = ehAdmin ? null : await idDoAtor(pool, 'reciclador', req.usuario.id_usuario);
  if (!ehAdmin && !idRec) return res.status(400).json({ erro: 'Usuário sem cadastro de reciclador.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [end] = await conn.query(
      'INSERT INTO endereco (logradouro, numero, complemento, bairro, cidade, uf, cep, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf, d.cep, d.lat, d.lng]);
    const [p] = await conn.query(
      `INSERT INTO ponto_coleta (nome, id_endereco, canal, telefone, horario, origem, id_reciclador, cadastrado_por, status)
       VALUES (?, ?, ?, ?, ?, 'CIRCUITOVERDE', ?, ?, ?)`,
      [d.nome, end.insertId, d.canal, d.telefone, d.horario, idRec, req.usuario.id_usuario, ehAdmin ? 'APROVADO' : 'PENDENTE']);
    await gravarCategorias(conn, p.insertId, d.categorias);
    await conn.commit();
    res.status(201).json({ id_ponto: p.insertId, status: ehAdmin ? 'APROVADO' : 'PENDENTE',
      mensagem: ehAdmin ? 'Ponto cadastrado e publicado no mapa.' : 'Ponto enviado. Ele aparece no mapa assim que o administrador aprovar.' });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

// Confere se o usuário pode mexer neste ponto; devolve o ponto ou null
async function pontoDoUsuario(usuario, idPonto) {
  const { onde, params } = await escopo(usuario);
  const [[p]] = await pool.query(`SELECT g.* FROM vw_gestao_pontos g WHERE g.id_ponto = ? AND ${onde}`, [idPonto, ...params]);
  return p || null;
}

// PUT /api/pontos/:id -> edita (o reciclador manda de volta para aprovação)
router.put('/:id(\\d+)', autenticar, permitir('ADMIN', 'RECICLADOR'), rota(async (req, res) => {
  const id = Number(req.params.id);
  const atual = await pontoDoUsuario(req.usuario, id);
  if (!atual) return res.status(404).json({ erro: 'Ponto não encontrado.' });
  const { d, faltando } = validarPonto(req.body || {});
  if (faltando.length) return res.status(400).json({ erro: 'Confira: ' + faltando.join(', ') + '.' });
  const ehAdmin = req.usuario.perfil === 'ADMIN';
  const novoStatus = ehAdmin ? atual.status : 'PENDENTE';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE endereco e JOIN ponto_coleta p ON p.id_endereco = e.id_endereco
          SET e.logradouro = ?, e.numero = ?, e.complemento = ?, e.bairro = ?, e.cidade = ?, e.uf = ?, e.cep = ?, e.latitude = ?, e.longitude = ?
        WHERE p.id_ponto = ?`,
      [d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf, d.cep, d.lat, d.lng, id]);
    await conn.query(
      'UPDATE ponto_coleta SET nome = ?, canal = ?, telefone = ?, horario = ?, status = ?, motivo_rejeicao = IF(? = \'PENDENTE\', NULL, motivo_rejeicao) WHERE id_ponto = ?',
      [d.nome, d.canal, d.telefone, d.horario, novoStatus, novoStatus, id]);
    await gravarCategorias(conn, id, d.categorias);
    await conn.commit();
    res.json({ id_ponto: id, status: novoStatus,
      mensagem: ehAdmin ? 'Ponto atualizado.' : 'Alterações enviadas. O ponto volta para o mapa assim que o administrador aprovar.' });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

// PATCH /api/pontos/:id/status { status: 'APROVADO'|'REJEITADO', motivo? } -> só ADMIN
router.patch('/:id(\\d+)/status', autenticar, permitir('ADMIN'), rota(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const motivo = String(req.body?.motivo || '').trim().slice(0, 200);
  if (!['APROVADO', 'REJEITADO'].includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
  if (status === 'REJEITADO' && motivo.length < 5) return res.status(400).json({ erro: 'Explique o motivo da rejeição (pelo menos 5 letras).' });
  const [r] = await pool.query('UPDATE ponto_coleta SET status = ?, motivo_rejeicao = ? WHERE id_ponto = ?',
    [status, status === 'REJEITADO' ? motivo : null, id]);
  if (!r.affectedRows) return res.status(404).json({ erro: 'Ponto não encontrado.' });
  res.json({ id_ponto: id, status });
}));

// PATCH /api/pontos/:id/ativo { ativo: true|false } -> ADMIN ou o reciclador dono
router.patch('/:id(\\d+)/ativo', autenticar, permitir('ADMIN', 'RECICLADOR'), rota(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await pontoDoUsuario(req.usuario, id))) return res.status(404).json({ erro: 'Ponto não encontrado.' });
  const ativo = !!req.body?.ativo;
  await pool.query('UPDATE ponto_coleta SET ativo = ? WHERE id_ponto = ?', [ativo, id]);
  res.json({ id_ponto: id, ativo });
}));

// GET /api/pontos/:id/historico -> linha do tempo de status (gravada pelo trigger)
router.get('/:id(\\d+)/historico', autenticar, permitir('ADMIN', 'RECICLADOR'), rota(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await pontoDoUsuario(req.usuario, id))) return res.status(404).json({ erro: 'Ponto não encontrado.' });
  const [linhas] = await pool.query('SELECT status, ativo, motivo, data_hora FROM ponto_coleta_historico WHERE id_ponto = ? ORDER BY data_hora', [id]);
  res.json(linhas);
}));

module.exports = router;
