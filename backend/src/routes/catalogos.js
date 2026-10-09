// Catálogos públicos e busca de pontos de coleta (UC03)
const router = require('express').Router();
const pool = require('../db');
const { rota } = require('../util');

// GET /api/tipos-equipamento
router.get('/tipos-equipamento', rota(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM tipo_equipamento ORDER BY nome');
  res.json(linhas);
}));

// GET /api/materiais
router.get('/materiais', rota(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM material ORDER BY nome');
  res.json(linhas);
}));

// GET /api/pontos-coleta?material=Cobre&cidade=Curitiba
router.get('/pontos-coleta', rota(async (req, res) => {
  const { material, cidade } = req.query;
  const filtros = ['r.ponto_coleta = TRUE'];
  const params = [];
  if (material) {
    filtros.push(`EXISTS (SELECT 1 FROM reciclador_material rm2
                            JOIN material m2 ON m2.id_material = rm2.id_material
                           WHERE rm2.id_reciclador = r.id_reciclador AND m2.nome = ?)`);
    params.push(material);
  }
  if (cidade)   { filtros.push('e.cidade = ?'); params.push(cidade); }

  const [linhas] = await pool.query(`
    SELECT r.id_reciclador, u.nome AS reciclador,
           e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep,
           GROUP_CONCAT(m.nome ORDER BY m.nome SEPARATOR ', ') AS materiais_aceitos
      FROM reciclador r
      JOIN usuario u              ON u.id_usuario = r.id_usuario
      JOIN endereco e             ON e.id_endereco = r.id_endereco
      JOIN reciclador_material rm ON rm.id_reciclador = r.id_reciclador
      JOIN material m             ON m.id_material = rm.id_material
     WHERE ${filtros.join(' AND ')}
     GROUP BY r.id_reciclador, u.nome, e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep
     ORDER BY e.cidade, u.nome`, params);
  res.json(linhas);
}));

module.exports = router;
