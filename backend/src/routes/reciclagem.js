// UC07 (componentes e materiais) e UC08 (destino final) - perfil RECICLADOR
const router = require('express').Router();
const pool = require('../db');
const { rota, idDoAtor } = require('../util');
const { autenticar, permitir } = require('../middlewares/auth');

// POST /api/componentes
// { id_item, nome, peso_kg, reaproveitavel, materiais: [ { id_material, peso_kg } ] }
// Grava o componente e sua composição numa TRANSAÇÃO: ou grava tudo, ou nada.
router.post('/componentes', autenticar, permitir('RECICLADOR'), rota(async (req, res) => {
  const { id_item, nome, peso_kg, reaproveitavel = false, materiais = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES (?, ?, ?, ?)',
      [id_item, nome, peso_kg, reaproveitavel]);
    for (const m of materiais) {
      await conn.query(
        'INSERT INTO componente_material (id_componente, id_material, peso_kg) VALUES (?, ?, ?)',
        [r.insertId, m.id_material, m.peso_kg]);
    }
    await conn.commit();
    res.status(201).json({ id_componente: r.insertId, materiais: materiais.length });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// POST /api/destinos  { id_componente, tipo, local_destino }
// O trigger trg_destino_bi impede destinar componente de item que não foi entregue a este reciclador.
router.post('/destinos', autenticar, permitir('RECICLADOR'), rota(async (req, res) => {
  const { id_componente, tipo, local_destino } = req.body;
  const idReciclador = await idDoAtor(pool, 'reciclador', req.usuario.id_usuario);
  const [r] = await pool.query(
    'INSERT INTO destino_final (id_componente, id_reciclador, tipo, local_destino) VALUES (?, ?, ?, ?)',
    [id_componente, idReciclador, tipo, local_destino || null]);
  res.status(201).json({ id_destino: r.insertId });
}));

module.exports = router;
