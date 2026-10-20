// Pontos de coleta com geolocalização (reais da ABREE, recicladores da plataforma e fictícios)
const router = require('express').Router();
const pool = require('../db');
const { rota } = require('../util');

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

module.exports = router;
