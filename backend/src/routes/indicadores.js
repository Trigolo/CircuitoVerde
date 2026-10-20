// UC10 - Painel de indicadores (lê as views do banco)
const router = require('express').Router();
const pool = require('../db');
const { rota } = require('../util');

// GET /api/indicadores  (público: transparência do impacto)
router.get('/', rota(async (req, res) => {
  const [[totais]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM item_eletronico)                    AS itens_descartados,
           (SELECT COALESCE(SUM(peso_kg),0) FROM item_eletronico)    AS kg_descartados,
           (SELECT COUNT(*) FROM certificado)                        AS certificados_emitidos,
           (SELECT COALESCE(SUM(peso_total_kg),0) FROM certificado)  AS kg_com_destino_comprovado,
           (SELECT COUNT(*) FROM reciclador WHERE ponto_coleta)      AS pontos_coleta,
           (SELECT COUNT(*) FROM gerador)                            AS geradores`);
  const [porMaterial] = await pool.query('SELECT * FROM vw_kg_por_material ORDER BY kg_recuperados DESC');
  const [porDestino]  = await pool.query('SELECT * FROM vw_destinacao_por_tipo');
  const [porCidade]   = await pool.query('SELECT * FROM vw_coleta_por_cidade ORDER BY kg_descartados DESC');
  const [tempo]       = await pool.query('SELECT * FROM vw_tempo_medio_logistica ORDER BY coletas_entregues DESC');
  const [porMes]      = await pool.query('SELECT * FROM (SELECT * FROM vw_descartes_por_mes ORDER BY mes DESC LIMIT 12) t ORDER BY mes');
  const [porTipo]     = await pool.query('SELECT * FROM vw_descartes_por_tipo ORDER BY itens DESC');
  const [status]      = await pool.query('SELECT * FROM vw_status_coletas');
  res.json({
    totais,
    por_material: porMaterial,
    por_destino: porDestino,
    por_cidade: porCidade,
    tempo_logistica: tempo,
    por_mes: porMes,
    por_tipo: porTipo,
    status_coletas: status,
  });
}));

module.exports = router;
