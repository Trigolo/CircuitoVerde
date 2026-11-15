-- =====================================================================
-- CircuitoVerde | Script 05: views do dashboard gráfico
-- Rode no banco que já existe (pode rodar quantas vezes quiser).
-- Instalações novas já recebem estas views pelo 01_schema.sql.
-- =====================================================================
USE circuitoverde;

-- Itens e peso descartados por mês
CREATE OR REPLACE VIEW vw_descartes_por_mes AS
SELECT DATE_FORMAT(data_descarte, '%Y-%m') AS mes,
       COUNT(*)                            AS itens,
       SUM(peso_kg)                        AS kg
  FROM item_eletronico
 GROUP BY DATE_FORMAT(data_descarte, '%Y-%m');

-- Itens e peso por tipo de equipamento
CREATE OR REPLACE VIEW vw_descartes_por_tipo AS
SELECT t.nome         AS equipamento,
       COUNT(i.id_item) AS itens,
       SUM(i.peso_kg)   AS kg
  FROM tipo_equipamento t
  JOIN item_eletronico i ON i.id_tipo = t.id_tipo
 GROUP BY t.id_tipo, t.nome;

-- Quantidade de coletas em cada status
CREATE OR REPLACE VIEW vw_status_coletas AS
SELECT status, COUNT(*) AS coletas
  FROM logistica_reversa
 GROUP BY status;
