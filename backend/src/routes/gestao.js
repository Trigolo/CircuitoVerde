// Versão 5: relatórios (admin e auditor), trilha de auditoria e notificações de cada perfil
const router = require('express').Router();
const pool = require('../db');
const { rota, idDoAtor } = require('../util');
const { autenticar, permitir } = require('../middlewares/auth');

// GET /api/relatorios -> números e séries para os gráficos (tudo vem das views do banco)
router.get('/relatorios', autenticar, permitir('ADMIN', 'AUDITOR'), rota(async (req, res) => {
  const q = async (sql, p = []) => (await pool.query(sql, p))[0];
  const [porMes, porTipo, porMaterial, status, tempo, cidades, destinos, [totais]] = await Promise.all([
    q('SELECT * FROM (SELECT * FROM vw_descartes_por_mes ORDER BY mes DESC LIMIT 12) m ORDER BY mes'),
    q('SELECT * FROM vw_descartes_por_tipo ORDER BY kg DESC'),
    q('SELECT * FROM vw_kg_por_material ORDER BY kg_recuperados DESC'),
    q('SELECT * FROM vw_status_coletas'),
    q('SELECT * FROM vw_tempo_medio_logistica WHERE coletas_entregues > 0 ORDER BY dias_medios LIMIT 10'),
    q('SELECT * FROM vw_coleta_por_cidade ORDER BY kg_descartados DESC LIMIT 10'),
    q('SELECT * FROM vw_destinacao_por_tipo ORDER BY kg DESC'),
    q(`SELECT (SELECT COUNT(*) FROM item_eletronico) AS itens,
              (SELECT COALESCE(SUM(peso_kg), 0) FROM item_eletronico) AS kg,
              (SELECT COUNT(*) FROM certificado) AS certificados,
              (SELECT COALESCE(SUM(peso_total_kg), 0) FROM certificado) AS kg_certificado,
              (SELECT COUNT(*) FROM usuario WHERE ativo) AS usuarios,
              (SELECT COUNT(*) FROM vw_pontos_coleta) AS pontos`),
  ]);
  totais.taxa = totais.kg ? (totais.kg_certificado / totais.kg) * 100 : 0;
  res.json({ totais, porMes, porTipo, porMaterial, status, tempo, cidades, destinos });
}));

// GET /api/auditoria?limite=100 -> trilha gravada pelos triggers (coletas e pontos de coleta)
router.get('/auditoria', autenticar, permitir('ADMIN', 'AUDITOR'), rota(async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite) || 100, 10), 500);
  const [coletas] = await pool.query(`
    SELECT s.id_status, s.data_hora, s.status, l.id_logistica, l.id_item, t.nome AS equipamento,
           ur.nome AS reciclador, ut.nome AS transportador, ug.nome AS gerador
      FROM status_logistica s
      JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
      JOIN item_eletronico i   ON i.id_item = l.id_item
      JOIN tipo_equipamento t  ON t.id_tipo = i.id_tipo
      JOIN gerador g           ON g.id_gerador = i.id_gerador
      JOIN usuario ug          ON ug.id_usuario = g.id_usuario
      JOIN reciclador r        ON r.id_reciclador = l.id_reciclador
      JOIN usuario ur          ON ur.id_usuario = r.id_usuario
      LEFT JOIN transportador tr ON tr.id_transportador = l.id_transportador
      LEFT JOIN usuario ut     ON ut.id_usuario = tr.id_usuario
     ORDER BY s.data_hora DESC, s.id_status DESC
     LIMIT ?`, [limite]);
  let pontos = [];
  try {   // a tabela só existe depois do 13_gestao_pontos.sql
    [pontos] = await pool.query(`
      SELECT h.id_historico, h.data_hora, h.status, h.ativo, h.motivo, p.id_ponto, p.nome, e.cidade, e.uf
        FROM ponto_coleta_historico h
        JOIN ponto_coleta p ON p.id_ponto = h.id_ponto
        JOIN endereco e     ON e.id_endereco = p.id_endereco
       ORDER BY h.data_hora DESC, h.id_historico DESC
       LIMIT ?`, [limite]);
  } catch (err) { if (err.code !== 'ER_NO_SUCH_TABLE') throw err; }
  const [[resumo]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM status_logistica WHERE data_hora >= NOW() - INTERVAL 7 DAY) AS eventos_7d,
           (SELECT COUNT(*) FROM status_logistica WHERE status = 'CANCELADA') AS cancelamentos,
           (SELECT COUNT(*) FROM certificado WHERE data_emissao >= NOW() - INTERVAL 30 DAY) AS certificados_30d,
           (SELECT COUNT(*) FROM status_logistica) AS eventos_total`);
  res.json({ resumo, coletas, pontos });
}));

// GET /api/notificacoes -> avisos dos últimos 30 dias para o perfil logado.
// Não precisa de tabela nova: os avisos são montados a partir do histórico que os triggers já gravam.
const NOMES = { SOLICITADA: 'solicitada', AGENDADA: 'agendada', EM_TRANSITO: 'saiu para coleta', ENTREGUE: 'entregue ao reciclador', CANCELADA: 'cancelada' };
router.get('/notificacoes', autenticar, rota(async (req, res) => {
  const { perfil, id_usuario } = req.usuario;
  const avisos = [];
  const add = (linhas, fn) => linhas.forEach((l) => avisos.push(fn(l)));
  const janela = 'NOW() - INTERVAL 30 DAY';

  if (perfil === 'GERADOR') {
    const idG = await idDoAtor(pool, 'gerador', id_usuario);
    const [st] = await pool.query(`
      SELECT s.id_status, s.status, s.data_hora, l.id_item, t.nome AS equipamento
        FROM status_logistica s JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
        JOIN item_eletronico i ON i.id_item = l.id_item JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
       WHERE i.id_gerador = ? AND s.status <> 'SOLICITADA' AND s.data_hora >= ${janela}
       ORDER BY s.data_hora DESC LIMIT 20`, [idG ?? -1]);
    add(st, (l) => ({ id: `s${l.id_status}`, quando: l.data_hora, tipo: l.status === 'CANCELADA' ? 'alerta' : 'info',
      titulo: `${l.equipamento} nº ${l.id_item}`, texto: `Coleta ${NOMES[l.status]}.`, tela: 'meus' }));
    const [ce] = await pool.query(`
      SELECT c.id_certificado, c.data_emissao, c.id_item, t.nome AS equipamento FROM certificado c
        JOIN item_eletronico i ON i.id_item = c.id_item JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
       WHERE i.id_gerador = ? AND c.data_emissao >= ${janela} ORDER BY c.data_emissao DESC LIMIT 10`, [idG ?? -1]);
    add(ce, (l) => ({ id: `c${l.id_certificado}`, quando: l.data_emissao, tipo: 'sucesso',
      titulo: 'Certificado emitido', texto: `${l.equipamento} nº ${l.id_item} teve destino comprovado.`, tela: 'meus' }));
  }
  if (perfil === 'TRANSPORTADOR') {
    const [li] = await pool.query(`
      SELECT l.id_logistica, l.data_solicitacao, l.id_item, t.nome AS equipamento, e.cidade
        FROM logistica_reversa l JOIN item_eletronico i ON i.id_item = l.id_item
        JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo JOIN gerador g ON g.id_gerador = i.id_gerador
        JOIN endereco e ON e.id_endereco = g.id_endereco
       WHERE l.status = 'SOLICITADA' AND l.id_transportador IS NULL AND l.data_solicitacao >= ${janela}
       ORDER BY l.data_solicitacao DESC LIMIT 15`);
    add(li, (l) => ({ id: `l${l.id_logistica}`, quando: l.data_solicitacao, tipo: 'info',
      titulo: 'Nova coleta disponível', texto: `${l.equipamento} nº ${l.id_item} em ${l.cidade}.`, tela: 'coletas' }));
  }
  if (perfil === 'RECICLADOR') {
    const idR = await idDoAtor(pool, 'reciclador', id_usuario);
    const [st] = await pool.query(`
      SELECT s.id_status, s.status, s.data_hora, l.id_item, t.nome AS equipamento
        FROM status_logistica s JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
        JOIN item_eletronico i ON i.id_item = l.id_item JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
       WHERE l.id_reciclador = ? AND s.status IN ('SOLICITADA', 'EM_TRANSITO', 'ENTREGUE') AND s.data_hora >= ${janela}
       ORDER BY s.data_hora DESC LIMIT 20`, [idR ?? -1]);
    add(st, (l) => ({ id: `s${l.id_status}`, quando: l.data_hora, tipo: l.status === 'ENTREGUE' ? 'sucesso' : 'info',
      titulo: `${l.equipamento} nº ${l.id_item}`,
      texto: { SOLICITADA: 'Um gerador escolheu você para a reciclagem.', EM_TRANSITO: 'Está a caminho. Confirme quando chegar.', ENTREGUE: 'Chegou. Registre os componentes.' }[l.status],
      tela: 'reciclagem' }));
    try {
      const [hp] = await pool.query(`
        SELECT h.id_historico, h.status, h.motivo, h.data_hora, p.nome FROM ponto_coleta_historico h
          JOIN ponto_coleta p ON p.id_ponto = h.id_ponto
         WHERE (p.id_reciclador = ? OR p.cadastrado_por = ?) AND h.status IN ('APROVADO', 'REJEITADO')
           AND h.data_hora >= ${janela} ORDER BY h.data_hora DESC LIMIT 10`, [idR ?? -1, id_usuario]);
      add(hp, (l) => ({ id: `h${l.id_historico}`, quando: l.data_hora, tipo: l.status === 'APROVADO' ? 'sucesso' : 'alerta',
        titulo: l.status === 'APROVADO' ? 'Ponto aprovado' : 'Ponto rejeitado',
        texto: l.status === 'APROVADO' ? `"${l.nome}" já aparece no mapa.` : `"${l.nome}": ${l.motivo || 'veja o motivo e corrija.'}`, tela: 'gpontos' }));
    } catch (err) { if (err.code !== 'ER_NO_SUCH_TABLE') throw err; }
  }
  if (perfil === 'ADMIN') {
    try {
      const [pp] = await pool.query(`
        SELECT p.id_ponto, p.nome, p.atualizado_em, e.cidade, e.uf FROM ponto_coleta p JOIN endereco e ON e.id_endereco = p.id_endereco
         WHERE p.status = 'PENDENTE' ORDER BY p.atualizado_em DESC LIMIT 15`);
      add(pp, (l) => ({ id: `p${l.id_ponto}-${l.atualizado_em}`, quando: l.atualizado_em, tipo: 'alerta',
        titulo: 'Ponto aguardando aprovação', texto: `${l.nome} · ${l.cidade}/${l.uf}`, tela: 'gpontos' }));
    } catch (err) { if (err.code !== 'ER_BAD_FIELD_ERROR') throw err; }
  }
  if (perfil === 'ADMIN' || perfil === 'AUDITOR') {
    const [ce] = await pool.query(`
      SELECT c.id_certificado, c.data_emissao, c.id_item, t.nome AS equipamento FROM certificado c
        JOIN item_eletronico i ON i.id_item = c.id_item JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
       WHERE c.data_emissao >= ${janela} ORDER BY c.data_emissao DESC LIMIT 10`);
    add(ce, (l) => ({ id: `c${l.id_certificado}`, quando: l.data_emissao, tipo: 'sucesso',
      titulo: 'Certificado emitido', texto: `${l.equipamento} nº ${l.id_item}.`, tela: perfil === 'ADMIN' ? 'itens' : 'auditoria' }));
  }
  avisos.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
  res.json(avisos.slice(0, 25));
}));

module.exports = router;
