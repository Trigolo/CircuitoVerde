// UC02 (registrar descarte), rastreio e UC09 (certificado)
const router = require('express').Router();
const pool = require('../db');
const { rota, idDoAtor } = require('../util');
const { autenticar, permitir } = require('../middlewares/auth');

router.use(autenticar);

// POST /api/itens  (GERADOR)  { id_tipo, descricao, estado, peso_kg }
router.post('/', permitir('GERADOR'), rota(async (req, res) => {
  const { id_tipo, descricao, estado, peso_kg } = req.body;
  const idGerador = await idDoAtor(pool, 'gerador', req.usuario.id_usuario);
  if (!idGerador) return res.status(400).json({ erro: 'Usuário sem cadastro de gerador.' });

  const [r] = await pool.query(
    'INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg) VALUES (?, ?, ?, ?, ?)',
    [idGerador, id_tipo, descricao || null, estado, peso_kg]
  );
  res.status(201).json({ id_item: r.insertId, mensagem: 'Descarte registrado.' });
}));

// GET /api/itens  -> gerador vê os seus; admin/auditor/reciclador veem todos
router.get('/', rota(async (req, res) => {
  if (req.usuario.perfil === 'GERADOR') {
    const idGerador = await idDoAtor(pool, 'gerador', req.usuario.id_usuario);
    const [linhas] = await pool.query(
      `SELECT v.* FROM vw_rastreio_item v
         JOIN item_eletronico i ON i.id_item = v.id_item
        WHERE i.id_gerador = ? ORDER BY v.id_item`, [idGerador]);
    return res.json(linhas);
  }
  if (req.usuario.perfil === 'RECICLADOR') {
    const idRec = await idDoAtor(pool, 'reciclador', req.usuario.id_usuario);
    const [linhas] = await pool.query(
      `SELECT DISTINCT v.* FROM vw_rastreio_item v
         JOIN logistica_reversa l ON l.id_item = v.id_item
        WHERE l.id_reciclador = ? ORDER BY v.id_item`, [idRec]);
    return res.json(linhas);
  }
  if (req.usuario.perfil === 'TRANSPORTADOR') {   // só as coletas dele e as solicitadas ainda sem transportador
    const idTr = await idDoAtor(pool, 'transportador', req.usuario.id_usuario);
    const [linhas] = await pool.query(
      `SELECT DISTINCT v.* FROM vw_rastreio_item v
         JOIN logistica_reversa l ON l.id_item = v.id_item
        WHERE l.id_transportador = ? OR (l.id_transportador IS NULL AND l.status = 'SOLICITADA')
        ORDER BY v.id_item`, [idTr]);
    return res.json(linhas);
  }
  const [linhas] = await pool.query('SELECT * FROM vw_rastreio_item ORDER BY id_item');
  res.json(linhas);
}));

// Quem pode abrir o rastreio de um item: o gerador dono, o reciclador da coleta,
// o transportador da coleta ou admin/auditor (antes qualquer usuário logado abria qualquer item).
async function podeVerItem(usuario, idItem) {
  const { perfil, id_usuario } = usuario;
  if (perfil === 'ADMIN' || perfil === 'AUDITOR') return true;
  if (perfil === 'GERADOR') {
    const [[r]] = await pool.query(
      'SELECT 1 FROM item_eletronico i JOIN gerador g ON g.id_gerador = i.id_gerador WHERE i.id_item = ? AND g.id_usuario = ?', [idItem, id_usuario]);
    return !!r;
  }
  const tabela = perfil === 'RECICLADOR' ? 'reciclador' : perfil === 'TRANSPORTADOR' ? 'transportador' : null;
  if (!tabela) return false;
  const coluna = tabela === 'reciclador' ? 'id_reciclador' : 'id_transportador';
  const idAtor = await idDoAtor(pool, tabela, id_usuario);
  const [[r]] = await pool.query(`SELECT 1 FROM logistica_reversa WHERE id_item = ? AND ${coluna} = ?`, [idItem, idAtor]);
  // o transportador também vê itens com coleta ainda sem transportador (para poder agendar)
  if (!r && tabela === 'transportador') {
    const [[livre]] = await pool.query("SELECT 1 FROM logistica_reversa WHERE id_item = ? AND id_transportador IS NULL AND status = 'SOLICITADA'", [idItem]);
    return !!livre;
  }
  return !!r;
}

// GET /api/itens/:id  -> rastreio completo: item, componentes, destinos e histórico
router.get('/:id', rota(async (req, res) => {
  const id = Number(req.params.id);
  const [[item]] = await pool.query('SELECT * FROM vw_rastreio_item WHERE id_item = ?', [id]);
  if (!item || !(await podeVerItem(req.usuario, id))) return res.status(404).json({ erro: 'Item não encontrado.' });

  const [componentes] = await pool.query(
    `SELECT c.id_componente, c.nome, c.peso_kg, c.reaproveitavel,
            d.tipo AS destino, d.local_destino, d.data_destinacao
       FROM componente c
       LEFT JOIN destino_final d ON d.id_componente = c.id_componente
      WHERE c.id_item = ?`, [id]);

  const [historico] = await pool.query(
    `SELECT s.status, s.data_hora
       FROM status_logistica s
       JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
      WHERE l.id_item = ? ORDER BY s.data_hora`, [id]);

  // Dados do próprio item para a linha do tempo do rastreio (versão 2)
  const [[extra]] = await pool.query(
    `SELECT i.data_descarte, i.peso_kg, i.estado, c.data_emissao AS data_certificado
       FROM item_eletronico i LEFT JOIN certificado c ON c.id_item = i.id_item
      WHERE i.id_item = ?`, [id]);

  res.json({ ...item, ...extra, componentes, historico });
}));

// POST /api/itens/:id/certificado  (RECICLADOR ou ADMIN) -> chama a stored procedure
router.post('/:id/certificado', permitir('RECICLADOR', 'ADMIN'), rota(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_emitir_certificado(?, @codigo)', [Number(req.params.id)]);
    const [[r]] = await conn.query('SELECT @codigo AS codigo');
    res.status(201).json({ codigo: r.codigo, mensagem: 'Certificado emitido.' });
  } finally {
    conn.release();
  }
}));

module.exports = router;
