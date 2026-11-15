-- =====================================================================
-- CircuitoVerde | Script 03: consultas para relatórios e testes
-- =====================================================================
USE circuitoverde;

SET NAMES utf8mb4;

-- 1. Rastreio completo de cada item (status atual e certificado)
SELECT * FROM vw_rastreio_item;

-- 2. Histórico de status de uma coleta (gerado pelos triggers)
SELECT id_logistica, status, data_hora
  FROM status_logistica
 WHERE id_logistica = 2
 ORDER BY data_hora;

-- 3. Indicadores do painel
SELECT * FROM vw_kg_por_material ORDER BY kg_recuperados DESC;
SELECT * FROM vw_destinacao_por_tipo;
SELECT * FROM vw_coleta_por_cidade;
SELECT * FROM vw_tempo_medio_logistica;

-- 4. Pontos de coleta que aceitam um material, por cidade (UC03)
SELECT u.nome AS reciclador, e.cidade, e.uf, e.logradouro, e.numero
  FROM reciclador r
  JOIN usuario u             ON u.id_usuario = r.id_usuario
  JOIN endereco e            ON e.id_endereco = r.id_endereco
  JOIN reciclador_material rm ON rm.id_reciclador = r.id_reciclador
  JOIN material m            ON m.id_material = rm.id_material
 WHERE m.nome = 'Bateria de lítio'
   AND e.cidade = 'Curitiba'
   AND r.ponto_coleta = TRUE;

-- 5. Ranking de geradores por kg descartado
SELECT u.nome AS gerador, g.tipo, COUNT(i.id_item) AS itens, SUM(i.peso_kg) AS kg
  FROM gerador g
  JOIN usuario u ON u.id_usuario = g.id_usuario
  JOIN item_eletronico i ON i.id_gerador = g.id_gerador
 GROUP BY g.id_gerador, u.nome, g.tipo
 ORDER BY kg DESC;

-- 6. Itens entregues que ainda têm componentes sem destino (pendências)
SELECT i.id_item, c.id_componente, c.nome
  FROM item_eletronico i
  JOIN componente c ON c.id_item = i.id_item
  LEFT JOIN destino_final d ON d.id_componente = c.id_componente
 WHERE d.id_destino IS NULL;

-- 7. Testes de integridade (cada um DEVE dar erro; rode um por vez)
-- 7a. Peso negativo: viola a CHECK ck_item_peso
-- INSERT INTO item_eletronico (id_gerador, id_tipo, estado, peso_kg) VALUES (1, 1, 'SUCATA', -2);
-- 7b. Destino registrado por um reciclador que não recebeu o item: bloqueado pelo trigger
-- INSERT INTO destino_final (id_componente, id_reciclador, tipo) VALUES (10, 2, 'RECICLAGEM');
-- 7c. Certificado com componente sem destino: bloqueado pela procedure
-- CALL sp_emitir_certificado(4, @x);
