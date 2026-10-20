// Panorama global, calculadora de impacto, ranking com selo verde e validação de certificado
const router = require('express').Router();
const pool = require('../db');
const { rota } = require('../util');

// GET /api/panorama -> dados do globo, agrupados por ano, e a taxa da própria plataforma
router.get('/panorama', rota(async (req, res) => {
  const [linhas] = await pool.query('SELECT * FROM vw_panorama ORDER BY ano, escopo, local');
  const anos = {};
  for (const l of linhas) {
    const a = (anos[l.ano] ||= { ano: l.ano, estimativa: !!l.estimativa, mundo: null, regioes: [], paises: [] });
    if (l.escopo === 'MUNDO') a.mundo = l;
    else if (l.escopo === 'REGIAO') a.regioes.push(l);
    else a.paises.push(l);
  }
  const [[plataforma]] = await pool.query(`
    SELECT COALESCE(SUM(i.peso_kg), 0) AS kg_descartado,
           COALESCE(SUM(c.peso_total_kg), 0) AS kg_certificado
      FROM item_eletronico i LEFT JOIN certificado c ON c.id_item = i.id_item`);
  plataforma.taxa = plataforma.kg_descartado ? (plataforma.kg_certificado / plataforma.kg_descartado) * 100 : 0;
  res.json({ anos: Object.values(anos), plataforma });
}));

// GET /api/calculadora?id_tipo=3&quantidade=2&peso_kg=0.4
// Usa a composição média aprendida com os registros dos recicladores (vw_composicao_media_tipo)
router.get('/calculadora', rota(async (req, res) => {
  const idTipo = Number(req.query.id_tipo);
  const quantidade = Math.min(Math.max(Number(req.query.quantidade) || 1, 1), 10000);
  const [comp] = await pool.query('SELECT * FROM vw_composicao_media_tipo WHERE id_tipo = ? ORDER BY kg_por_kg DESC', [idTipo]);
  if (!comp.length) return res.status(404).json({ erro: 'Ainda não há dados de reciclagem para este equipamento.' });

  const pesoUnit = Number(req.query.peso_kg) > 0 ? Number(req.query.peso_kg) : Number(comp[0].peso_medio_item_kg);
  const pesoTotal = pesoUnit * quantidade;
  const materiais = comp.map((m) => {
    const kg = Number(m.kg_por_kg) * pesoTotal;
    return { material: m.material, categoria: m.categoria, kg, valor_reais: kg * Number(m.valor_ref_kg) };
  });
  res.json({
    equipamento: comp[0].equipamento,
    itens_analisados: comp[0].itens_analisados,
    peso_medio_item_kg: Number(comp[0].peso_medio_item_kg),
    quantidade, peso_total_kg: pesoTotal, materiais,
    kg_recuperavel: materiais.reduce((s, m) => s + m.kg, 0),
    valor_total_reais: materiais.reduce((s, m) => s + m.valor_reais, 0),
  });
}));

// GET /api/ranking -> geradores ordenados por kg com destino certificado
router.get('/ranking', rota(async (req, res) => {
  const [linhas] = await pool.query(`
    SELECT posicao, nome_publico, tipo, cidade, uf, itens, kg_descartado, itens_certificados, kg_certificado, selo
      FROM vw_ranking_geradores WHERE itens > 0 ORDER BY posicao LIMIT 50`);
  const [selos] = await pool.query('SELECT selo, COUNT(*) AS geradores FROM vw_ranking_geradores GROUP BY selo');
  res.json({ ranking: linhas, selos });
}));

// GET /api/certificados/:codigo -> validação pública (é o link do QR Code)
router.get('/certificados/:codigo', rota(async (req, res) => {
  const codigo = String(req.params.codigo);
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) return res.status(400).json({ erro: 'Código inválido.' });
  const [[cert]] = await pool.query('SELECT * FROM vw_certificado_publico WHERE codigo = ?', [codigo]);
  if (!cert) return res.status(404).json({ erro: 'Certificado não encontrado.' });
  res.json(cert);
}));

module.exports = router;
