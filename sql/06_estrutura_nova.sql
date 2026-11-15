-- =====================================================================
-- CircuitoVerde | Script 06: novas estruturas (versão 2 do sistema)
-- Pontos de coleta com geolocalização, panorama global do lixo eletrônico,
-- calculadora de impacto, ranking com selo verde e validação de certificado.
-- Rode DEPOIS dos scripts 01 a 05. Pode ser rodado de novo sem erro.
-- =====================================================================
SET NAMES utf8mb4;
USE circuitoverde;

DROP VIEW IF EXISTS vw_panorama;
DROP VIEW IF EXISTS vw_pontos_coleta;
DROP VIEW IF EXISTS vw_composicao_media_tipo;
DROP VIEW IF EXISTS vw_ranking_geradores;
DROP VIEW IF EXISTS vw_certificado_publico;
DROP FUNCTION IF EXISTS fn_distancia_km;
DROP TABLE IF EXISTS ponto_coleta_categoria;
DROP TABLE IF EXISTS ponto_coleta;
DROP TABLE IF EXISTS indicador_ewaste;
DROP TABLE IF EXISTS pais;
DROP TABLE IF EXISTS regiao;

-- ---------------------------------------------------------------------
-- 1. Geolocalização
-- ---------------------------------------------------------------------
-- Índice para filtrar rápido por "caixa" de latitude/longitude antes de calcular a distância
SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = 'endereco' AND index_name = 'idx_endereco_geo');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_endereco_geo ON endereco (latitude, longitude)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Coordenadas aproximadas dos endereços de teste (geradores e recicladores fictícios):
-- centro da cidade + um deslocamento aleatório de até ~4 km
UPDATE endereco e
  JOIN (SELECT 'Curitiba' cidade, 'PR' uf, -25.4321 lat, -49.2683 lng UNION ALL
        SELECT 'São José dos Pinhais', 'PR', -25.5347, -49.2063 UNION ALL
        SELECT 'Londrina', 'PR', -23.3133, -51.1615 UNION ALL
        SELECT 'Maringá', 'PR', -23.4205, -51.9333 UNION ALL
        SELECT 'Joinville', 'SC', -26.3034, -48.8455 UNION ALL
        SELECT 'Florianópolis', 'SC', -27.5941, -48.5560 UNION ALL
        SELECT 'Blumenau', 'SC', -26.9194, -49.0661 UNION ALL
        SELECT 'Porto Alegre', 'RS', -30.0293, -51.2332 UNION ALL
        SELECT 'São Paulo', 'SP', -23.5661, -46.6508 UNION ALL
        SELECT 'Campinas', 'SP', -22.9082, -47.0603) c
    ON c.cidade = e.cidade AND c.uf = e.uf
   SET e.latitude  = c.lat + (RAND() - 0.5) * 0.07,
       e.longitude = c.lng + (RAND() - 0.5) * 0.07
 WHERE e.latitude IS NULL;

-- Distância em km entre dois pontos (a função ST_Distance_Sphere do MySQL usa a fórmula de Haversine)
DELIMITER $$
CREATE FUNCTION fn_distancia_km (lat1 DECIMAL(9,6), lng1 DECIMAL(9,6), lat2 DECIMAL(9,6), lng2 DECIMAL(9,6))
RETURNS DECIMAL(10,3) DETERMINISTIC
BEGIN
  RETURN ST_Distance_Sphere(POINT(lng1, lat1), POINT(lng2, lat2)) / 1000;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- 2. Pontos de coleta (reais e fictícios) e categorias aceitas
-- ---------------------------------------------------------------------
CREATE TABLE ponto_coleta (
  id_ponto      INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  id_endereco   INT NOT NULL,
  canal         VARCHAR(40)  NOT NULL,              -- varejo, parceiro, assistência técnica, reciclador...
  origem        ENUM('ABREE','CIRCUITOVERDE','FICTICIO') NOT NULL,
  id_externo    INT NULL,                           -- id do ponto na base de origem
  id_reciclador INT NULL,                           -- quando o ponto é um reciclador da plataforma
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_ponto_externo   UNIQUE (origem, id_externo),
  CONSTRAINT uq_ponto_endereco  UNIQUE (id_endereco),
  CONSTRAINT fk_ponto_endereco  FOREIGN KEY (id_endereco)   REFERENCES endereco (id_endereco),
  CONSTRAINT fk_ponto_reciclador FOREIGN KEY (id_reciclador) REFERENCES reciclador (id_reciclador)
);

-- N:M resolvido: que tipos de equipamento cada ponto recebe
CREATE TABLE ponto_coleta_categoria (
  id_ponto  INT NOT NULL,
  categoria ENUM('INFORMATICA','TELEFONIA','ELETRODOMESTICO','ENTRETENIMENTO','PILHAS_BATERIAS','OUTRO') NOT NULL,
  PRIMARY KEY (id_ponto, categoria),
  CONSTRAINT fk_pcc_ponto FOREIGN KEY (id_ponto) REFERENCES ponto_coleta (id_ponto) ON DELETE CASCADE
);

-- Os recicladores da plataforma que recebem entregas também viram pontos de coleta
INSERT INTO ponto_coleta (nome, id_endereco, canal, origem, id_reciclador)
SELECT u.nome, r.id_endereco, 'Reciclador CircuitoVerde', 'CIRCUITOVERDE', r.id_reciclador
  FROM reciclador r JOIN usuario u ON u.id_usuario = r.id_usuario
 WHERE r.ponto_coleta = TRUE;

INSERT INTO ponto_coleta_categoria (id_ponto, categoria)
SELECT p.id_ponto, c.categoria
  FROM ponto_coleta p
  JOIN (SELECT 'INFORMATICA' categoria UNION ALL SELECT 'TELEFONIA' UNION ALL SELECT 'ELETRODOMESTICO'
        UNION ALL SELECT 'ENTRETENIMENTO' UNION ALL SELECT 'PILHAS_BATERIAS') c
 WHERE p.origem = 'CIRCUITOVERDE';

CREATE VIEW vw_pontos_coleta AS
SELECT p.id_ponto, p.nome, p.canal, p.origem, p.id_reciclador,
       e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep, e.latitude, e.longitude,
       GROUP_CONCAT(pc.categoria ORDER BY pc.categoria) AS categorias
  FROM ponto_coleta p
  JOIN endereco e ON e.id_endereco = p.id_endereco
  LEFT JOIN ponto_coleta_categoria pc ON pc.id_ponto = p.id_ponto
 WHERE p.ativo = TRUE
 GROUP BY p.id_ponto, p.nome, p.canal, p.origem, p.id_reciclador,
          e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep, e.latitude, e.longitude;

-- ---------------------------------------------------------------------
-- 3. Panorama global do lixo eletrônico (dados reais da ONU)
-- ---------------------------------------------------------------------
CREATE TABLE regiao (
  id_regiao  INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(40) NOT NULL,
  latitude   DECIMAL(9,6) NOT NULL,                 -- onde a bolha aparece no globo
  longitude  DECIMAL(9,6) NOT NULL,
  CONSTRAINT uq_regiao_nome UNIQUE (nome)
);

CREATE TABLE pais (
  id_pais    INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(80) NOT NULL,
  iso3       CHAR(3) NOT NULL,                      -- código ISO 3166 (ex.: BRA)
  id_regiao  INT NOT NULL,
  latitude   DECIMAL(9,6) NOT NULL,
  longitude  DECIMAL(9,6) NOT NULL,
  CONSTRAINT uq_pais_iso3 UNIQUE (iso3),
  CONSTRAINT fk_pais_regiao FOREIGN KEY (id_regiao) REFERENCES regiao (id_regiao)
);

-- Um indicador vale para o mundo, para uma região OU para um país
CREATE TABLE indicador_ewaste (
  id_indicador  INT AUTO_INCREMENT PRIMARY KEY,
  ano           SMALLINT NOT NULL,
  escopo        ENUM('MUNDO','REGIAO','PAIS') NOT NULL,
  id_regiao     INT NULL,
  id_pais       INT NULL,
  gerado_mt     DECIMAL(8,3) NOT NULL,              -- milhões de toneladas geradas
  kg_habitante  DECIMAL(6,2) NULL,
  taxa_coleta   DECIMAL(5,2) NOT NULL,              -- % coletado e reciclado com documentação
  estimativa    BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = projeção, não medição
  fonte         VARCHAR(150) NOT NULL,
  CONSTRAINT ck_ind_escopo CHECK (
      (escopo = 'MUNDO'  AND id_regiao IS NULL     AND id_pais IS NULL) OR
      (escopo = 'REGIAO' AND id_regiao IS NOT NULL AND id_pais IS NULL) OR
      (escopo = 'PAIS'   AND id_pais   IS NOT NULL AND id_regiao IS NULL)),
  CONSTRAINT ck_ind_taxa CHECK (taxa_coleta BETWEEN 0 AND 100),
  CONSTRAINT ck_ind_gerado CHECK (gerado_mt > 0),
  CONSTRAINT uq_ind UNIQUE (ano, escopo, id_regiao, id_pais),
  CONSTRAINT fk_ind_regiao FOREIGN KEY (id_regiao) REFERENCES regiao (id_regiao),
  CONSTRAINT fk_ind_pais   FOREIGN KEY (id_pais)   REFERENCES pais (id_pais)
);

INSERT INTO regiao (nome, latitude, longitude) VALUES
  ('África', 4, 20), ('Américas', 22, -92), ('Ásia', 32, 103), ('Europa', 51, 15), ('Oceania', -25, 138);

INSERT INTO pais (nome, iso3, id_regiao, latitude, longitude)
SELECT 'Brasil', 'BRA', id_regiao, -10, -51 FROM regiao WHERE nome = 'Américas';

-- Fontes: Global E-waste Monitor 2020 e 2024 (ITU/UNITAR) e Global E-waste Statistics Partnership.
-- Os totais de 2022 por região foram calculados com kg por habitante x população (o relatório só publica kg/hab).
SET @gem20 = 'Global E-waste Monitor 2020 (ITU/UNU/UNITAR)';
SET @gem24 = 'Global E-waste Monitor 2024 (ITU/UNITAR)';
SET @est   = 'Estimativa: projeção do GEM 2024 (82 Mt em 2030, taxa de 20%)';

INSERT INTO indicador_ewaste (ano, escopo, id_regiao, id_pais, gerado_mt, kg_habitante, taxa_coleta, estimativa, fonte)
VALUES
  (2019, 'MUNDO', NULL, NULL, 53.6, 7.3, 17.4, FALSE, @gem20),
  (2022, 'MUNDO', NULL, NULL, 62.0, 7.8, 22.3, FALSE, @gem24),
  (2026, 'MUNDO', NULL, NULL, 72.0, NULL, 20.0, TRUE, @est);

INSERT INTO indicador_ewaste (ano, escopo, id_regiao, gerado_mt, kg_habitante, taxa_coleta, estimativa, fonte)
SELECT d.ano, 'REGIAO', r.id_regiao, d.gerado, d.kg, d.taxa, d.est, d.fonte
  FROM regiao r JOIN (
    SELECT 2019 ano, 'África' reg, 2.9 gerado, 2.5 kg, 0.9 taxa, FALSE est, @gem20 fonte UNION ALL
    SELECT 2019, 'Américas', 13.1, 13.3, 9.4,  FALSE, @gem20 UNION ALL
    SELECT 2019, 'Ásia',     24.9, 5.6,  11.7, FALSE, @gem20 UNION ALL
    SELECT 2019, 'Europa',   12.0, 16.2, 42.5, FALSE, @gem20 UNION ALL
    SELECT 2019, 'Oceania',  0.7,  16.1, 8.8,  FALSE, @gem20 UNION ALL
    SELECT 2022, 'África',   3.6,  2.5,  0.7,  FALSE, @gem24 UNION ALL
    SELECT 2022, 'Américas', 14.5, 14.1, 30.0, FALSE, @gem24 UNION ALL
    SELECT 2022, 'Ásia',     30.2, 6.4,  11.8, FALSE, @gem24 UNION ALL
    SELECT 2022, 'Europa',   13.1, 17.6, 42.8, FALSE, @gem24 UNION ALL
    SELECT 2022, 'Oceania',  0.7,  16.1, 41.4, FALSE, @gem24) d ON d.reg = r.nome;

-- 2026 estimado: total de 2022 x (72/62) e taxa de 2022 x (20/22,3), mantendo a proporção de cada região
INSERT INTO indicador_ewaste (ano, escopo, id_regiao, gerado_mt, kg_habitante, taxa_coleta, estimativa, fonte)
SELECT 2026, 'REGIAO', id_regiao, ROUND(gerado_mt * 72 / 62, 1), NULL, ROUND(taxa_coleta * 20 / 22.3, 1), TRUE, @est
  FROM indicador_ewaste WHERE ano = 2022 AND escopo = 'REGIAO';

INSERT INTO indicador_ewaste (ano, escopo, id_pais, gerado_mt, kg_habitante, taxa_coleta, estimativa, fonte)
SELECT 2022, 'PAIS', id_pais, 2.443, 11.4, 3.2, FALSE, 'Global E-waste Statistics Partnership (GEM 2024)'
  FROM pais WHERE iso3 = 'BRA';

-- Volume sem destino documentado (descarte inadequado) calculado pela view
CREATE VIEW vw_panorama AS
SELECT i.ano, i.escopo, i.estimativa, i.fonte,
       COALESCE(r.nome, p.nome, 'Mundo')            AS local,
       COALESCE(r.latitude, p.latitude)             AS latitude,
       COALESCE(r.longitude, p.longitude)           AS longitude,
       i.gerado_mt, i.kg_habitante, i.taxa_coleta,
       ROUND(i.gerado_mt * (1 - i.taxa_coleta / 100), 2) AS sem_destino_mt
  FROM indicador_ewaste i
  LEFT JOIN regiao r ON r.id_regiao = i.id_regiao
  LEFT JOIN pais p   ON p.id_pais = i.id_pais;

-- ---------------------------------------------------------------------
-- 4. Calculadora de impacto: composição média de cada tipo de equipamento,
--    aprendida com o que os recicladores já registraram no banco
-- ---------------------------------------------------------------------
CREATE VIEW vw_composicao_media_tipo AS
SELECT t.id_tipo, t.nome AS equipamento, m.id_material, m.nome AS material, m.categoria, m.valor_ref_kg,
       ROUND(SUM(cm.peso_kg) / pt.kg_itens, 4) AS kg_por_kg,          -- fração do peso do equipamento
       ROUND(pt.kg_itens / pt.itens, 3)        AS peso_medio_item_kg,
       pt.itens                                AS itens_analisados
  FROM componente_material cm
  JOIN componente c        ON c.id_componente = cm.id_componente
  JOIN item_eletronico i   ON i.id_item = c.id_item
  JOIN tipo_equipamento t  ON t.id_tipo = i.id_tipo
  JOIN material m          ON m.id_material = cm.id_material
  JOIN (SELECT i2.id_tipo, COUNT(*) itens, SUM(i2.peso_kg) kg_itens
          FROM item_eletronico i2
         WHERE EXISTS (SELECT 1 FROM componente c2 WHERE c2.id_item = i2.id_item)
         GROUP BY i2.id_tipo) pt ON pt.id_tipo = t.id_tipo
 GROUP BY t.id_tipo, t.nome, m.id_material, m.nome, m.categoria, m.valor_ref_kg, pt.kg_itens, pt.itens;

-- ---------------------------------------------------------------------
-- 5. Ranking de geradores com selo verde
--    Nome de pessoa física aparece abreviado (privacidade: LGPD)
-- ---------------------------------------------------------------------
CREATE VIEW vw_ranking_geradores AS
SELECT x.*,
       CASE WHEN x.kg_certificado >= 25 THEN 'OURO'
            WHEN x.kg_certificado >= 10 THEN 'PRATA'
            WHEN x.kg_certificado > 0   THEN 'BRONZE'
            ELSE 'SEM_SELO' END AS selo,
       RANK() OVER (ORDER BY x.kg_certificado DESC, x.itens_certificados DESC) AS posicao
  FROM (
    SELECT g.id_gerador, g.tipo,
           CASE WHEN g.tipo = 'PJ' THEN u.nome
                ELSE CONCAT(SUBSTRING_INDEX(u.nome, ' ', 1), ' ',
                            LEFT(SUBSTRING_INDEX(u.nome, ' ', -1), 1), '.') END AS nome_publico,
           e.cidade, e.uf,
           COUNT(i.id_item)                         AS itens,
           COALESCE(SUM(i.peso_kg), 0)              AS kg_descartado,
           COUNT(c.id_certificado)                  AS itens_certificados,
           COALESCE(SUM(c.peso_total_kg), 0)        AS kg_certificado
      FROM gerador g
      JOIN usuario u  ON u.id_usuario = g.id_usuario
      JOIN endereco e ON e.id_endereco = g.id_endereco
      LEFT JOIN item_eletronico i ON i.id_gerador = g.id_gerador
      LEFT JOIN certificado c     ON c.id_item = i.id_item
     GROUP BY g.id_gerador, g.tipo, u.nome, e.cidade, e.uf) x;

-- ---------------------------------------------------------------------
-- 6. Validação pública do certificado (QR Code): só dados não sensíveis
-- ---------------------------------------------------------------------
CREATE VIEW vw_certificado_publico AS
SELECT c.codigo, c.data_emissao, c.peso_total_kg, i.id_item,
       t.nome AS equipamento, ur.nome AS reciclador,
       CASE WHEN g.tipo = 'PJ' THEN ug.nome
            ELSE CONCAT(SUBSTRING_INDEX(ug.nome, ' ', 1), ' ', LEFT(SUBSTRING_INDEX(ug.nome, ' ', -1), 1), '.') END AS gerador,
       (SELECT COUNT(*) FROM componente co WHERE co.id_item = i.id_item) AS componentes,
       (SELECT COALESCE(SUM(co.peso_kg), 0) FROM componente co JOIN destino_final d ON d.id_componente = co.id_componente
         WHERE co.id_item = i.id_item AND d.tipo IN ('RECICLAGEM','REUSO')) AS kg_reaproveitado
  FROM certificado c
  JOIN item_eletronico i  ON i.id_item = c.id_item
  JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
  JOIN gerador g          ON g.id_gerador = i.id_gerador
  JOIN usuario ug         ON ug.id_usuario = g.id_usuario
  LEFT JOIN logistica_reversa l ON l.id_item = i.id_item AND l.status = 'ENTREGUE'
  LEFT JOIN reciclador r  ON r.id_reciclador = l.id_reciclador
  LEFT JOIN usuario ur    ON ur.id_usuario = r.id_usuario;

-- Conferência
SELECT 'pontos (recicladores)' AS item, COUNT(*) AS total FROM ponto_coleta
UNION ALL SELECT 'indicadores globais', COUNT(*) FROM indicador_ewaste
UNION ALL SELECT 'enderecos com coordenadas', COUNT(*) FROM endereco WHERE latitude IS NOT NULL;
