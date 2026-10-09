// UC04 (solicitar coleta), UC05 (aceitar/agendar) e UC06 (atualizar status)
const router = require('express').Router();
const pool = require('../db');
const { rota, idDoAtor } = require('../util');
const { autenticar, permitir } = require('../middlewares/auth');

router.use(autenticar);

// Transições de status permitidas
const PROXIMOS = {
  SOLICITADA:  ['AGENDADA', 'CANCELADA'],
  AGENDADA:    ['EM_TRANSITO', 'CANCELADA'],
  EM_TRANSITO: ['ENTREGUE'],
  ENTREGUE:    [],
  CANCELADA:   [],
};

// POST /api/logisticas  (GERADOR)  { id_item, id_reciclador }
router.post('/', permitir('GERADOR'), rota(async (req, res) => {
  const { id_item, id_reciclador } = req.body;
  const idGerador = await idDoAtor(pool, 'gerador', req.usuario.id_usuario);

  const [[item]] = await pool.query(
    'SELECT id_item FROM item_eletronico WHERE id_item = ? AND id_gerador = ?', [id_item, idGerador]);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado entre os seus descartes.' });

  const [[aberta]] = await pool.query(
    "SELECT id_logistica FROM logistica_reversa WHERE id_item = ? AND status <> 'CANCELADA'", [id_item]);
  if (aberta) return res.status(409).json({ erro: 'Este item já tem uma coleta em andamento.' });

  const [r] = await pool.query(
    'INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (?, ?)', [id_item, id_reciclador]);
  res.status(201).json({ id_logistica: r.insertId, status: 'SOLICITADA' });
}));

// GET /api/logisticas?status=SOLICITADA  (TRANSPORTADOR, RECICLADOR, ADMIN)
router.get('/', permitir('TRANSPORTADOR', 'RECICLADOR', 'ADMIN'), rota(async (req, res) => {
  const params = [];
  let filtro = '';
  if (req.query.status) { filtro = 'WHERE l.status = ?'; params.push(req.query.status); }
  const [linhas] = await pool.query(`
    SELECT l.*, t.nome AS equipamento, i.peso_kg, ur.nome AS reciclador
      FROM logistica_reversa l
      JOIN item_eletronico i  ON i.id_item = l.id_item
      JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
      JOIN reciclador r       ON r.id_reciclador = l.id_reciclador
      JOIN usuario ur         ON ur.id_usuario = r.id_usuario
      ${filtro}
     ORDER BY l.data_solicitacao DESC`, params);
  res.json(linhas);
}));

// PATCH /api/logisticas/:id/status  { status, data_agendada?, rota? }
// O trigger trg_logistica_au grava cada mudança em status_logistica.
router.patch('/:id/status', permitir('TRANSPORTADOR', 'RECICLADOR', 'ADMIN'), rota(async (req, res) => {
  const id = Number(req.params.id);
  const { status, data_agendada, rota: rotaColeta } = req.body;

  const [[atual]] = await pool.query('SELECT status FROM logistica_reversa WHERE id_logistica = ?', [id]);
  if (!atual) return res.status(404).json({ erro: 'Coleta não encontrada.' });
  if (!(PROXIMOS[atual.status] || []).includes(status)) {
    return res.status(400).json({ erro: `Não é possível ir de ${atual.status} para ${status}.` });
  }

  const campos = ['status = ?'];
  const params = [status];
  if (status === 'AGENDADA') {
    if (req.usuario.perfil === 'TRANSPORTADOR') {
      campos.push('id_transportador = ?');
      params.push(await idDoAtor(pool, 'transportador', req.usuario.id_usuario));
    }
    if (data_agendada) { campos.push('data_agendada = ?'); params.push(data_agendada); }
    if (rotaColeta)    { campos.push('rota = ?');          params.push(rotaColeta); }
  }
  if (status === 'ENTREGUE') campos.push('data_entrega = NOW()');

  params.push(id);
  await pool.query(`UPDATE logistica_reversa SET ${campos.join(', ')} WHERE id_logistica = ?`, params);
  res.json({ id_logistica: id, de: atual.status, para: status });
}));

module.exports = router;
