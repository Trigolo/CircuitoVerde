-- =====================================================================
-- CircuitoVerde | Script 04: carga de dados em massa (fictícios)
-- Rode DEPOIS do 01_schema.sql e do 02_dados_teste.sql.
--
-- O que este script cria:
--   * 12 novos recicladores / pontos de coleta em 10 cidades do Sul e Sudeste
--   * 4 novos transportadores
--   * novos tipos de equipamento (Tablet, Impressora, Roteador, TV LED)
--   * a procedure sp_carga_massa(geradores, itens), que gera geradores,
--     itens descartados nos últimos 12 meses, componentes, materiais,
--     coletas com histórico de status, destinos finais e certificados
--
-- Todos os nomes, documentos e endereços são FICTÍCIOS.
-- Senha de todos os usuários novos: 123456
-- =====================================================================
USE circuitoverde;

SET NAMES utf8mb4;
SET @old_safe = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;   -- o Workbench bloqueia UPDATE sem chave por padrão

SET @senha = '$2a$10$bgkfEe4Xfn2KSkDYyJeJ9ej37zljXcP6/czdXNn1xWVfmZkegwTBm'; -- "123456"

-- ---------------------------------------------------------------------
-- 1. Novos tipos de equipamento
-- ---------------------------------------------------------------------
INSERT IGNORE INTO tipo_equipamento (nome, categoria) VALUES
 ('Tablet',     'INFORMATICA'),
 ('Impressora', 'INFORMATICA'),
 ('Roteador',   'INFORMATICA'),
 ('TV LED',     'ENTRETENIMENTO');

-- ---------------------------------------------------------------------
-- 2. Novos recicladores / pontos de coleta
--    (procedure auxiliar para não repetir os 4 INSERTs de cada um)
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_novo_reciclador;
DELIMITER $$
CREATE PROCEDURE sp_novo_reciclador(
  IN p_nome VARCHAR(120), IN p_email VARCHAR(150), IN p_cnpj CHAR(14), IN p_licenca VARCHAR(40),
  IN p_capacidade DECIMAL(10,2), IN p_logradouro VARCHAR(150), IN p_numero VARCHAR(10),
  IN p_bairro VARCHAR(80), IN p_cidade VARCHAR(80), IN p_uf CHAR(2), IN p_cep CHAR(8),
  IN p_materiais VARCHAR(255))           -- lista separada por vírgula, ou 'TODOS'
BEGIN
  DECLARE v_usuario INT;
  DECLARE v_endereco INT;
  DECLARE v_reciclador INT;

  INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (p_nome, p_email, @senha, 'RECICLADOR');
  SET v_usuario = LAST_INSERT_ID();

  INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep)
  VALUES (p_logradouro, p_numero, p_bairro, p_cidade, p_uf, p_cep);
  SET v_endereco = LAST_INSERT_ID();

  INSERT INTO reciclador (id_usuario, id_endereco, cnpj, licenca_ambiental, capacidade_kg_mes)
  VALUES (v_usuario, v_endereco, p_cnpj, p_licenca, p_capacidade);
  SET v_reciclador = LAST_INSERT_ID();

  INSERT INTO reciclador_material (id_reciclador, id_material)
  SELECT v_reciclador, id_material FROM material
   WHERE p_materiais = 'TODOS' OR FIND_IN_SET(nome, p_materiais) > 0;
END$$
DELIMITER ;

CALL sp_novo_reciclador('Verde Circuito Reciclagem Ltda', 'contato@verdecircuito.teste', '21345678000101', 'LO-PR-2025-0103', 15000, 'Rua João Bettega', '2200', 'Portão', 'Curitiba', 'PR', '81070000', 'TODOS');
CALL sp_novo_reciclador('Cooperativa Recicla Vida', 'coop@reciclavida.teste', '21345678000102', 'LO-PR-2025-0104', 4000, 'Rua Joinville', '940', 'Centro', 'São José dos Pinhais', 'PR', '83005000', 'Cobre,Alumínio,Ferro,Plástico ABS');
CALL sp_novo_reciclador('EletroCiclo Londrina Ltda', 'operacao@eletrociclo.teste', '21345678000103', 'LO-PR-2025-0105', 8000, 'Av. Tiradentes', '1500', 'Jardim Shangri-lá', 'Londrina', 'PR', '86070000', 'TODOS');
CALL sp_novo_reciclador('Maringá Sucata Eletrônica', 'contato@maringasucata.teste', '21345678000104', 'LO-PR-2025-0106', 6000, 'Av. Colombo', '5800', 'Zona 7', 'Maringá', 'PR', '87020000', 'Cobre,Alumínio,Ferro,Placa de circuito,Vidro');
CALL sp_novo_reciclador('Joinville Reversa Ltda', 'contato@joinvillereversa.teste', '21345678000105', 'LO-SC-2025-0201', 10000, 'Rua Dona Francisca', '3100', 'Saguaçu', 'Joinville', 'SC', '89221000', 'TODOS');
CALL sp_novo_reciclador('Ilha Recicla Eletrônicos', 'contato@ilharecicla.teste', '21345678000106', 'LO-SC-2025-0202', 5000, 'Rod. SC-401', '4500', 'Saco Grande', 'Florianópolis', 'SC', '88032000', 'Cobre,Alumínio,Placa de circuito,Bateria de lítio,Plástico ABS');
CALL sp_novo_reciclador('Vale Europeu Reciclagem', 'contato@valeeuropeu.teste', '21345678000107', 'LO-SC-2025-0203', 7000, 'Rua XV de Novembro', '1200', 'Centro', 'Blumenau', 'SC', '89010000', 'Ferro,Plástico ABS,Vidro,Alumínio');
CALL sp_novo_reciclador('Guaíba Tech Reciclagem Ltda', 'contato@guaibatech.teste', '21345678000108', 'LO-RS-2025-0301', 18000, 'Av. Assis Brasil', '7000', 'Sarandi', 'Porto Alegre', 'RS', '91010000', 'TODOS');
CALL sp_novo_reciclador('Cooperativa Gaúcha de Eletrônicos', 'coop@gauchaeletro.teste', '21345678000109', 'LO-RS-2025-0302', 3500, 'Rua Voluntários da Pátria', '2400', 'Floresta', 'Porto Alegre', 'RS', '90230010', 'Cobre,Ferro,Plástico ABS');
CALL sp_novo_reciclador('Paulista Logística Reversa S.A.', 'operacao@paulistareversa.teste', '21345678000110', 'LO-SP-2025-0401', 30000, 'Av. Marquês de São Vicente', '2800', 'Barra Funda', 'São Paulo', 'SP', '01139000', 'TODOS');
CALL sp_novo_reciclador('Zona Leste Recicla', 'contato@zonalesterecicla.teste', '21345678000111', 'LO-SP-2025-0402', 9000, 'Av. Aricanduva', '5500', 'Vila Matilde', 'São Paulo', 'SP', '03527000', 'Cobre,Alumínio,Ferro,Placa de circuito,Bateria de lítio');
CALL sp_novo_reciclador('Campinas E-Lixo Ltda', 'contato@campinaselixo.teste', '21345678000112', 'LO-SP-2025-0403', 12000, 'Av. John Boyd Dunlop', '3900', 'Jardim Ipaussurama', 'Campinas', 'SP', '13060000', 'TODOS');

-- ---------------------------------------------------------------------
-- 3. Novos transportadores
-- ---------------------------------------------------------------------
INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES
 ('Rafael Teixeira', 'rafael.transporte@teste.com', @senha, 'TRANSPORTADOR'),
 ('Juliana Prado',   'juliana.transporte@teste.com', @senha, 'TRANSPORTADOR'),
 ('Marcos Vieira',   'marcos.transporte@teste.com', @senha, 'TRANSPORTADOR'),
 ('Fernanda Lopes',  'fernanda.transporte@teste.com', @senha, 'TRANSPORTADOR');

INSERT INTO transportador (id_usuario, documento, placa_veiculo)
SELECT id_usuario,
       CONCAT('8', LPAD(id_usuario, 10, '0')),
       CONCAT(ELT(1 + (id_usuario % 4), 'BRA', 'QWE', 'RTY', 'UIO'), id_usuario % 10, 'A', LPAD(id_usuario % 100, 2, '0'))
  FROM usuario
 WHERE email LIKE '%.transporte@teste.com';

-- ---------------------------------------------------------------------
-- 4. Procedure de carga em massa
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_carga_massa;
DELIMITER $$
CREATE PROCEDURE sp_carga_massa(IN p_geradores INT, IN p_itens INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE v_usuario, v_endereco, v_gerador, v_tipo, v_reciclador, v_transp, v_log INT;
  DECLARE v_item_ini, v_item_fim, v_log_ini INT;
  DECLARE v_tipo_nome VARCHAR(60);
  DECLARE v_uf CHAR(2);
  DECLARE v_peso DECIMAL(8,3);
  DECLARE v_descarte, v_solic, v_agenda, v_entrega DATETIME;
  DECLARE v_sorte DOUBLE;
  DECLARE v_pf BOOLEAN;
  DECLARE v_codigo CHAR(36);
  DECLARE v_hoje DATETIME DEFAULT NOW();

  -- Cidades usadas para geradores (CEP com o prefixo real da região)
  DROP TEMPORARY TABLE IF EXISTS tmp_cidade;
  CREATE TEMPORARY TABLE tmp_cidade (n INT PRIMARY KEY, cidade VARCHAR(80), uf CHAR(2), cep2 CHAR(2), peso INT);
  INSERT INTO tmp_cidade VALUES
   (1,'Curitiba','PR','80',22), (2,'São José dos Pinhais','PR','83',6), (3,'Londrina','PR','86',8),
   (4,'Maringá','PR','87',6), (5,'Joinville','SC','89',9), (6,'Florianópolis','SC','88',8),
   (7,'Blumenau','SC','89',5), (8,'Porto Alegre','RS','90',12), (9,'São Paulo','SP','01',16),
   (10,'Campinas','SP','13',8);

  -- Faixa de peso (kg) de cada tipo de equipamento
  DROP TEMPORARY TABLE IF EXISTS tmp_faixa;
  CREATE TEMPORARY TABLE tmp_faixa (tipo VARCHAR(60) PRIMARY KEY, pmin DECIMAL(8,3), pmax DECIMAL(8,3), peso INT);
  INSERT INTO tmp_faixa VALUES
   ('Smartphone',0.140,0.230,25), ('Notebook',1.300,3.000,18), ('Desktop',5.000,10.000,10),
   ('Monitor LCD',2.500,6.000,10), ('Micro-ondas',9.000,15.000,5), ('Tablet',0.300,0.700,10),
   ('Impressora',3.000,8.000,8), ('Roteador',0.200,0.600,8), ('TV LED',6.000,15.000,6);

  -- Modelo de desmontagem: componentes (fração do peso) e materiais (fração do componente)
  DROP TEMPORARY TABLE IF EXISTS tmp_modelo;
  CREATE TEMPORARY TABLE tmp_modelo (tipo VARCHAR(60), comp VARCHAR(80), frac DECIMAL(4,3), reap BOOLEAN, material VARCHAR(60), mfrac DECIMAL(4,3));
  INSERT INTO tmp_modelo VALUES
   ('Smartphone','Bateria',.250,0,'Bateria de lítio',1), ('Smartphone','Placa principal',.200,0,'Placa de circuito',.900), ('Smartphone','Placa principal',.200,0,'Cobre',.100),
   ('Smartphone','Carcaça',.300,0,'Plástico ABS',.600), ('Smartphone','Carcaça',.300,0,'Alumínio',.400), ('Smartphone','Tela',.250,0,'Vidro',1),
   ('Notebook','Bateria',.150,0,'Bateria de lítio',1), ('Notebook','Placa-mãe',.200,0,'Placa de circuito',.850), ('Notebook','Placa-mãe',.200,0,'Cobre',.150),
   ('Notebook','Carcaça',.450,0,'Plástico ABS',.700), ('Notebook','Carcaça',.450,0,'Alumínio',.300), ('Notebook','Tela',.200,0,'Vidro',.800), ('Notebook','Tela',.200,0,'Plástico ABS',.200),
   ('Desktop','Gabinete',.600,0,'Ferro',.850), ('Desktop','Gabinete',.600,0,'Plástico ABS',.150), ('Desktop','Fonte',.200,1,'Cobre',.300), ('Desktop','Fonte',.200,1,'Ferro',.500),
   ('Desktop','Fonte',.200,1,'Placa de circuito',.200), ('Desktop','Placa-mãe',.200,0,'Placa de circuito',.900), ('Desktop','Placa-mãe',.200,0,'Cobre',.100),
   ('Monitor LCD','Tela',.400,0,'Vidro',.800), ('Monitor LCD','Tela',.400,0,'Plástico ABS',.200), ('Monitor LCD','Carcaça',.400,0,'Plástico ABS',1),
   ('Monitor LCD','Placa',.200,0,'Placa de circuito',.800), ('Monitor LCD','Placa',.200,0,'Cobre',.200),
   ('Micro-ondas','Gabinete',.700,0,'Ferro',1), ('Micro-ondas','Transformador',.200,0,'Cobre',.600), ('Micro-ondas','Transformador',.200,0,'Ferro',.400), ('Micro-ondas','Placa',.100,0,'Placa de circuito',1),
   ('Tablet','Bateria',.300,0,'Bateria de lítio',1), ('Tablet','Placa',.200,0,'Placa de circuito',.900), ('Tablet','Placa',.200,0,'Cobre',.100),
   ('Tablet','Tela',.300,0,'Vidro',1), ('Tablet','Carcaça',.200,0,'Alumínio',1),
   ('Impressora','Carcaça',.600,0,'Plástico ABS',1), ('Impressora','Motor',.250,1,'Cobre',.400), ('Impressora','Motor',.250,1,'Ferro',.600), ('Impressora','Placa',.150,0,'Placa de circuito',1),
   ('Roteador','Carcaça',.600,0,'Plástico ABS',1), ('Roteador','Placa',.400,0,'Placa de circuito',.900), ('Roteador','Placa',.400,0,'Cobre',.100),
   ('TV LED','Tela',.400,0,'Vidro',.700), ('TV LED','Tela',.400,0,'Plástico ABS',.300), ('TV LED','Carcaça',.350,0,'Plástico ABS',.800),
   ('TV LED','Carcaça',.350,0,'Alumínio',.200), ('TV LED','Placa',.250,0,'Placa de circuito',.800), ('TV LED','Placa',.250,0,'Cobre',.200);

  -- ---------- 4.1 Geradores ----------
  WHILE i <= p_geradores DO
    SET v_pf = RAND() < 0.6;
    SELECT cidade, uf, cep2 INTO @cid, @uf, @cep2 FROM tmp_cidade ORDER BY -LOG(RAND()) / peso LIMIT 1;

    INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (
      IF(v_pf,
         CONCAT(ELT(1 + FLOOR(RAND()*16), 'Lucas','Mariana','Pedro','Beatriz','João','Camila','Rafael','Larissa','Gabriel','Fernanda','Bruno','Juliana','Thiago','Patrícia','Diego','Aline'), ' ',
                ELT(1 + FLOOR(RAND()*12), 'Silva','Santos','Oliveira','Souza','Pereira','Costa','Rodrigues','Almeida','Nascimento','Lima','Araújo','Ferreira')),
         CONCAT(ELT(1 + FLOOR(RAND()*12), 'Alfa','Nova','Prime','Delta','Vértice','Horizonte','Sigma','Orion','Atlas','Ponto','Rede','Elo'), ' ',
                ELT(1 + FLOOR(RAND()*10), 'Tecnologia','Contabilidade','Escola','Clínica','Engenharia','Comércio','Advocacia','Logística','Telecom','Consultoria'), ' Ltda')),
      CONCAT('gerador', LPAD(i, 4, '0'), '@teste.com'), @senha, 'GERADOR');
    SET v_usuario = LAST_INSERT_ID();

    INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep) VALUES (
      CONCAT(ELT(1 + FLOOR(RAND()*3), 'Rua ', 'Av. ', 'Travessa '),
             ELT(1 + FLOOR(RAND()*10), 'das Palmeiras','Brasil','Sete de Setembro','dos Andradas','Santos Dumont','Marechal Deodoro','das Acácias','Getúlio Vargas','Tiradentes','Rio Branco')),
      FLOOR(10 + RAND()*3000),
      ELT(1 + FLOOR(RAND()*6), 'Centro','Jardim América','Vila Nova','Bela Vista','São Francisco','Industrial'),
      @cid, @uf, CONCAT(@cep2, LPAD(FLOOR(RAND()*999999), 6, '0')));
    SET v_endereco = LAST_INSERT_ID();

    INSERT INTO gerador (id_usuario, id_endereco, tipo, documento, telefone) VALUES (
      v_usuario, v_endereco, IF(v_pf, 'PF', 'PJ'),
      IF(v_pf, CONCAT('9', LPAD(v_usuario, 10, '0')), CONCAT('9', LPAD(v_usuario, 13, '0'))),
      CONCAT('4', FLOOR(1 + RAND()*9), '9', LPAD(FLOOR(RAND()*99999999), 8, '0')));
    SET i = i + 1;
  END WHILE;

  -- ---------- 4.2 Itens descartados (últimos 12 meses) ----------
  SELECT COALESCE(MAX(id_item), 0) + 1 INTO v_item_ini FROM item_eletronico;
  SET i = 1;
  WHILE i <= p_itens DO
    -- PJ descartam mais: sorteio com peso maior para geradores PJ
    SELECT id_gerador INTO v_gerador FROM gerador ORDER BY -LOG(RAND()) / IF(tipo = 'PJ', 3, 1) LIMIT 1;
    SELECT tipo, pmin + RAND() * (pmax - pmin) INTO v_tipo_nome, v_peso FROM tmp_faixa ORDER BY -LOG(RAND()) / peso LIMIT 1;
    SELECT id_tipo INTO v_tipo FROM tipo_equipamento WHERE nome = v_tipo_nome;

    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg, data_descarte) VALUES (
      v_gerador, v_tipo, CONCAT(v_tipo_nome, ' ', ELT(1 + FLOOR(RAND()*4), 'antigo', 'sem uso', 'com defeito', 'substituído')),
      ELT(1 + FLOOR(RAND()*3), 'FUNCIONANDO', 'DEFEITUOSO', 'SUCATA'),
      v_peso,
      v_hoje - INTERVAL FLOOR(1 + RAND()*365) DAY - INTERVAL FLOOR(RAND()*600) MINUTE);
    SET i = i + 1;
  END WHILE;
  SELECT MAX(id_item) INTO v_item_fim FROM item_eletronico;

  -- ---------- 4.3 Componentes e composição (set-based, a partir do modelo) ----------
  INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel)
  SELECT i2.id_item, m.comp, GREATEST(0.001, ROUND(i2.peso_kg * m.frac, 3)), m.reap
    FROM item_eletronico i2
    JOIN tipo_equipamento t ON t.id_tipo = i2.id_tipo
    JOIN (SELECT DISTINCT tipo, comp, frac, reap FROM tmp_modelo) m ON m.tipo = t.nome
   WHERE i2.id_item BETWEEN v_item_ini AND v_item_fim;

  INSERT INTO componente_material (id_componente, id_material, peso_kg)
  SELECT c.id_componente, mat.id_material, GREATEST(0.001, ROUND(c.peso_kg * m.mfrac, 3))
    FROM componente c
    JOIN item_eletronico i2 ON i2.id_item = c.id_item
    JOIN tipo_equipamento t ON t.id_tipo = i2.id_tipo
    JOIN tmp_modelo m       ON m.tipo = t.nome AND m.comp = c.nome
    JOIN material mat       ON mat.nome = m.material
   WHERE i2.id_item BETWEEN v_item_ini AND v_item_fim;

  -- ---------- 4.4 Logística reversa (os triggers gravam o histórico) ----------
  SELECT COALESCE(MAX(id_logistica), 0) + 1 INTO v_log_ini FROM logistica_reversa;
  SET i = v_item_ini;
  WHILE i <= v_item_fim DO
    SET v_sorte = RAND();
    IF v_sorte < 0.90 THEN   -- 10% dos itens ainda não pediram coleta
      SELECT i2.data_descarte, e.uf INTO v_descarte, v_uf
        FROM item_eletronico i2 JOIN gerador g ON g.id_gerador = i2.id_gerador
        JOIN endereco e ON e.id_endereco = g.id_endereco WHERE i2.id_item = i;

      -- reciclador do mesmo estado (se existir), sorteado
      SET v_reciclador = NULL;
      SELECT r.id_reciclador INTO v_reciclador FROM reciclador r JOIN endereco e ON e.id_endereco = r.id_endereco
       WHERE e.uf = v_uf ORDER BY RAND() LIMIT 1;
      IF v_reciclador IS NULL THEN
        SELECT id_reciclador INTO v_reciclador FROM reciclador ORDER BY RAND() LIMIT 1;
      END IF;
      SELECT id_transportador INTO v_transp FROM transportador ORDER BY RAND() LIMIT 1;

      SET v_solic   = LEAST(v_hoje - INTERVAL 30 MINUTE, v_descarte + INTERVAL FLOOR(RAND()*72) HOUR);
      SET v_agenda  = DATE(v_solic) + INTERVAL FLOOR(1 + RAND()*5) DAY + INTERVAL FLOOR(8 + RAND()*9) HOUR;
      SET v_entrega = v_agenda + INTERVAL FLOOR(2 + RAND()*96) HOUR;

      INSERT INTO logistica_reversa (id_item, id_reciclador, data_solicitacao) VALUES (i, v_reciclador, v_solic);
      SET v_log = LAST_INSERT_ID();
      SET v_sorte = RAND();

      IF v_sorte < 0.04 THEN
        UPDATE logistica_reversa SET status = 'CANCELADA' WHERE id_logistica = v_log;
      ELSEIF v_solic + INTERVAL 1 DAY > v_hoje OR v_sorte < 0.07 THEN
        SET @nada = 0;  -- continua SOLICITADA
      ELSE
        UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = v_transp, data_agendada = v_agenda,
               rota = CONCAT('Rota ', ELT(1 + FLOOR(RAND()*4), 'Norte', 'Sul', 'Leste', 'Oeste'))
         WHERE id_logistica = v_log;
        IF v_agenda < v_hoje AND v_sorte >= 0.10 THEN
          UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica = v_log;
          IF v_entrega < v_hoje AND v_sorte >= 0.13 THEN
            UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = v_entrega WHERE id_logistica = v_log;
          END IF;
        END IF;
      END IF;
    END IF;
    SET i = i + 1;
  END WHILE;

  -- Ajusta a data/hora do histórico (os triggers gravaram NOW()) para datas coerentes
  UPDATE status_logistica s JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
     SET s.data_hora = LEAST(v_hoje, CASE s.status
           WHEN 'SOLICITADA'  THEN l.data_solicitacao
           WHEN 'AGENDADA'    THEN l.data_solicitacao + INTERVAL 2 HOUR
           WHEN 'EM_TRANSITO' THEN l.data_agendada
           WHEN 'ENTREGUE'    THEN l.data_entrega
           WHEN 'CANCELADA'   THEN l.data_solicitacao + INTERVAL 1 DAY
         END)
   WHERE l.id_logistica >= v_log_ini;

  -- ---------- 4.5 Destino final dos componentes ----------
  -- 85% dos itens entregues têm todos os componentes destinados; os demais ficam com pendência
  DROP TEMPORARY TABLE IF EXISTS tmp_entregue;
  CREATE TEMPORARY TABLE tmp_entregue AS
  SELECT l.id_item, l.id_reciclador, l.data_entrega, (RAND() < 0.85) AS completo
    FROM logistica_reversa l
   WHERE l.status = 'ENTREGUE' AND l.id_item BETWEEN v_item_ini AND v_item_fim;

  INSERT INTO destino_final (id_componente, id_reciclador, tipo, data_destinacao, local_destino)
  SELECT c.id_componente, e.id_reciclador,
         CASE WHEN c.nome = 'Bateria' THEN 'DESCARTE_ESPECIAL'
              WHEN c.reaproveitavel   THEN 'REUSO'
              ELSE 'RECICLAGEM' END,
         LEAST(v_hoje, e.data_entrega + INTERVAL FLOOR(1 + RAND()*10) DAY),
         CASE WHEN c.nome = 'Bateria' THEN 'Tratamento de baterias licenciado'
              WHEN c.reaproveitavel   THEN 'Recondicionamento'
              WHEN c.nome LIKE 'Placa%' THEN 'Refino de metais preciosos'
              WHEN c.nome = 'Tela' THEN 'Reciclagem de vidro'
              ELSE 'Separação e moagem' END
    FROM tmp_entregue e
    JOIN componente c ON c.id_item = e.id_item
   WHERE e.completo
      OR c.id_componente <> (SELECT MAX(c2.id_componente) FROM componente c2 WHERE c2.id_item = e.id_item);

  -- ---------- 4.6 Certificados (pela procedure oficial) ----------
  SET i = v_item_ini;
  WHILE i <= v_item_fim DO
    IF EXISTS (SELECT 1 FROM tmp_entregue WHERE id_item = i AND completo) THEN
      CALL sp_emitir_certificado(i, v_codigo);
      UPDATE certificado
         SET data_emissao = LEAST(v_hoje, (SELECT MAX(d.data_destinacao) FROM destino_final d
                                            JOIN componente c ON c.id_componente = d.id_componente
                                           WHERE c.id_item = i) + INTERVAL 1 DAY)
       WHERE id_item = i;
    END IF;
    SET i = i + 1;
  END WHILE;

  DROP TEMPORARY TABLE IF EXISTS tmp_cidade, tmp_faixa, tmp_modelo, tmp_entregue;

  -- Resumo
  SELECT (SELECT COUNT(*) FROM gerador)           AS geradores,
         (SELECT COUNT(*) FROM reciclador)        AS recicladores,
         (SELECT COUNT(*) FROM item_eletronico)   AS itens,
         (SELECT COUNT(*) FROM componente)        AS componentes,
         (SELECT COUNT(*) FROM logistica_reversa) AS coletas,
         (SELECT COUNT(*) FROM status_logistica)  AS historico_status,
         (SELECT COUNT(*) FROM destino_final)     AS destinos,
         (SELECT COUNT(*) FROM certificado)       AS certificados;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- 5. Executa a carga: 80 geradores e 500 itens (ajuste se quiser mais)
-- ---------------------------------------------------------------------
CALL sp_carga_massa(80, 500);

-- Corrige também as datas do histórico dos dados do script 02
UPDATE status_logistica s JOIN logistica_reversa l ON l.id_logistica = s.id_logistica
   SET s.data_hora = CASE s.status
         WHEN 'SOLICITADA'  THEN l.data_solicitacao
         WHEN 'AGENDADA'    THEN l.data_solicitacao + INTERVAL 2 HOUR
         WHEN 'EM_TRANSITO' THEN l.data_agendada
         WHEN 'ENTREGUE'    THEN l.data_entrega
         ELSE s.data_hora END
 WHERE l.id_logistica <= 4;

SET SQL_SAFE_UPDATES = @old_safe;
