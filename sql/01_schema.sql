-- =====================================================================
-- CircuitoVerde - Economia Circular de Resíduos Eletrônicos
-- A3 Banco de Dados | Script 01: criação do banco (DDL)
-- SGBD: MySQL 8.0 | Normalização: até a 3ª FN
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS circuitoverde;
CREATE DATABASE circuitoverde
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE circuitoverde;

-- ---------------------------------------------------------------------
-- 1. Usuários e endereços
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
  nome         VARCHAR(120) NOT NULL,
  email        VARCHAR(150) NOT NULL,
  senha_hash   CHAR(60)     NOT NULL,           -- hash bcrypt gerado pela API
  perfil       ENUM('GERADOR','RECICLADOR','TRANSPORTADOR','ADMIN','AUDITOR') NOT NULL,
  ativo        BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuario_email UNIQUE (email)
);

-- Endereço atômico (1ª FN): cada parte em uma coluna
CREATE TABLE endereco (
  id_endereco  INT AUTO_INCREMENT PRIMARY KEY,
  logradouro   VARCHAR(150) NOT NULL,
  numero       VARCHAR(10)  NOT NULL,
  complemento  VARCHAR(60),
  bairro       VARCHAR(80)  NOT NULL,
  cidade       VARCHAR(80)  NOT NULL,
  uf           CHAR(2)      NOT NULL,
  cep          CHAR(8)      NOT NULL,
  latitude     DECIMAL(9,6),
  longitude    DECIMAL(9,6),
  CONSTRAINT ck_endereco_cep CHECK (cep REGEXP '^[0-9]{8}$'),
  CONSTRAINT ck_endereco_uf  CHECK (uf REGEXP '^[A-Z]{2}$')
);
CREATE INDEX idx_endereco_cidade_uf ON endereco (cidade, uf);

-- ---------------------------------------------------------------------
-- 2. Atores: gerador, reciclador, transportador
-- ---------------------------------------------------------------------
CREATE TABLE gerador (
  id_gerador   INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT NOT NULL,
  id_endereco  INT NOT NULL,
  tipo         ENUM('PF','PJ') NOT NULL,
  documento    VARCHAR(14) NOT NULL,            -- CPF (11) ou CNPJ (14), só números
  telefone     VARCHAR(15),
  CONSTRAINT uq_gerador_usuario   UNIQUE (id_usuario),
  CONSTRAINT uq_gerador_documento UNIQUE (documento),
  CONSTRAINT ck_gerador_documento CHECK (
    (tipo = 'PF' AND documento REGEXP '^[0-9]{11}$') OR
    (tipo = 'PJ' AND documento REGEXP '^[0-9]{14}$')),
  CONSTRAINT fk_gerador_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario (id_usuario),
  CONSTRAINT fk_gerador_endereco FOREIGN KEY (id_endereco) REFERENCES endereco (id_endereco)
);

CREATE TABLE reciclador (
  id_reciclador      INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT NOT NULL,
  id_endereco        INT NOT NULL,
  cnpj               CHAR(14) NOT NULL,
  licenca_ambiental  VARCHAR(40) NOT NULL,
  capacidade_kg_mes  DECIMAL(10,2) NOT NULL,
  ponto_coleta       BOOLEAN NOT NULL DEFAULT TRUE, -- recebe entregas diretas?
  CONSTRAINT uq_reciclador_usuario UNIQUE (id_usuario),
  CONSTRAINT uq_reciclador_cnpj    UNIQUE (cnpj),
  CONSTRAINT ck_reciclador_cnpj    CHECK (cnpj REGEXP '^[0-9]{14}$'),
  CONSTRAINT ck_reciclador_cap     CHECK (capacidade_kg_mes > 0),
  CONSTRAINT fk_reciclador_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario (id_usuario),
  CONSTRAINT fk_reciclador_endereco FOREIGN KEY (id_endereco) REFERENCES endereco (id_endereco)
);

CREATE TABLE transportador (
  id_transportador INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario       INT NOT NULL,
  documento        VARCHAR(14) NOT NULL,
  placa_veiculo    CHAR(7) NOT NULL,
  CONSTRAINT uq_transportador_usuario UNIQUE (id_usuario),
  CONSTRAINT uq_transportador_doc     UNIQUE (documento),
  CONSTRAINT fk_transportador_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

-- ---------------------------------------------------------------------
-- 3. Catálogos: materiais e tipos de equipamento
-- ---------------------------------------------------------------------
CREATE TABLE material (
  id_material   INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(60) NOT NULL,
  categoria     ENUM('METAL','PLASTICO','VIDRO','PLACA','BATERIA','OUTRO') NOT NULL,
  perigoso      BOOLEAN NOT NULL DEFAULT FALSE,
  valor_ref_kg  DECIMAL(10,2) NOT NULL DEFAULT 0,  -- valor de referência (R$/kg), ilustrativo
  CONSTRAINT uq_material_nome UNIQUE (nome),
  CONSTRAINT ck_material_valor CHECK (valor_ref_kg >= 0)
);

-- N:M resolvido (1ª FN): materiais que cada reciclador aceita
CREATE TABLE reciclador_material (
  id_reciclador INT NOT NULL,
  id_material   INT NOT NULL,
  PRIMARY KEY (id_reciclador, id_material),
  CONSTRAINT fk_rm_reciclador FOREIGN KEY (id_reciclador) REFERENCES reciclador (id_reciclador) ON DELETE CASCADE,
  CONSTRAINT fk_rm_material   FOREIGN KEY (id_material)   REFERENCES material (id_material)
);

CREATE TABLE tipo_equipamento (
  id_tipo   INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(60) NOT NULL,
  categoria ENUM('INFORMATICA','TELEFONIA','ELETRODOMESTICO','ENTRETENIMENTO','PILHAS_BATERIAS','OUTRO') NOT NULL,
  CONSTRAINT uq_tipo_nome UNIQUE (nome)
);

-- ---------------------------------------------------------------------
-- 4. Ciclo do resíduo: item, componentes, materiais
-- ---------------------------------------------------------------------
CREATE TABLE item_eletronico (
  id_item        INT AUTO_INCREMENT PRIMARY KEY,
  id_gerador     INT NOT NULL,
  id_tipo        INT NOT NULL,
  descricao      VARCHAR(150),
  estado         ENUM('FUNCIONANDO','DEFEITUOSO','SUCATA') NOT NULL,
  peso_kg        DECIMAL(8,3) NOT NULL,
  data_descarte  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_item_peso CHECK (peso_kg > 0),
  CONSTRAINT fk_item_gerador FOREIGN KEY (id_gerador) REFERENCES gerador (id_gerador),
  CONSTRAINT fk_item_tipo    FOREIGN KEY (id_tipo)    REFERENCES tipo_equipamento (id_tipo)
);
CREATE INDEX idx_item_data ON item_eletronico (data_descarte);

CREATE TABLE componente (
  id_componente  INT AUTO_INCREMENT PRIMARY KEY,
  id_item        INT NOT NULL,
  nome           VARCHAR(80) NOT NULL,
  peso_kg        DECIMAL(8,3) NOT NULL,
  reaproveitavel BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_componente_peso CHECK (peso_kg > 0),
  CONSTRAINT fk_componente_item FOREIGN KEY (id_item) REFERENCES item_eletronico (id_item) ON DELETE CASCADE
);

-- N:M resolvido (3ª FN): composição de cada componente
CREATE TABLE componente_material (
  id_componente INT NOT NULL,
  id_material   INT NOT NULL,
  peso_kg       DECIMAL(8,3) NOT NULL,
  PRIMARY KEY (id_componente, id_material),
  CONSTRAINT ck_cm_peso CHECK (peso_kg > 0),
  CONSTRAINT fk_cm_componente FOREIGN KEY (id_componente) REFERENCES componente (id_componente) ON DELETE CASCADE,
  CONSTRAINT fk_cm_material   FOREIGN KEY (id_material)   REFERENCES material (id_material)
);

-- ---------------------------------------------------------------------
-- 5. Logística reversa e histórico de status
-- ---------------------------------------------------------------------
CREATE TABLE logistica_reversa (
  id_logistica     INT AUTO_INCREMENT PRIMARY KEY,
  id_item          INT NOT NULL,
  id_reciclador    INT NOT NULL,
  id_transportador INT NULL,                     -- definido quando a coleta é aceita
  data_solicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_agendada    DATETIME NULL,
  data_entrega     DATETIME NULL,
  rota             VARCHAR(255),
  status           ENUM('SOLICITADA','AGENDADA','EM_TRANSITO','ENTREGUE','CANCELADA') NOT NULL DEFAULT 'SOLICITADA',
  CONSTRAINT fk_log_item          FOREIGN KEY (id_item)          REFERENCES item_eletronico (id_item),
  CONSTRAINT fk_log_reciclador    FOREIGN KEY (id_reciclador)    REFERENCES reciclador (id_reciclador),
  CONSTRAINT fk_log_transportador FOREIGN KEY (id_transportador) REFERENCES transportador (id_transportador)
);
CREATE INDEX idx_log_status ON logistica_reversa (status);

CREATE TABLE status_logistica (
  id_status    INT AUTO_INCREMENT PRIMARY KEY,
  id_logistica INT NOT NULL,
  status       ENUM('SOLICITADA','AGENDADA','EM_TRANSITO','ENTREGUE','CANCELADA') NOT NULL,
  data_hora    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_status_logistica FOREIGN KEY (id_logistica) REFERENCES logistica_reversa (id_logistica) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6. Destino final e certificado
-- ---------------------------------------------------------------------
CREATE TABLE destino_final (
  id_destino      INT AUTO_INCREMENT PRIMARY KEY,
  id_componente   INT NOT NULL,
  id_reciclador   INT NOT NULL,
  tipo            ENUM('RECICLAGEM','REUSO','DESCARTE_ESPECIAL') NOT NULL,
  data_destinacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  local_destino   VARCHAR(150),
  CONSTRAINT uq_destino_componente UNIQUE (id_componente),   -- um destino por componente
  CONSTRAINT fk_destino_componente FOREIGN KEY (id_componente) REFERENCES componente (id_componente),
  CONSTRAINT fk_destino_reciclador FOREIGN KEY (id_reciclador) REFERENCES reciclador (id_reciclador)
);

CREATE TABLE certificado (
  id_certificado INT AUTO_INCREMENT PRIMARY KEY,
  id_item        INT NOT NULL,
  codigo         CHAR(36) NOT NULL,              -- UUID para validação pública
  data_emissao   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  peso_total_kg  DECIMAL(8,3) NOT NULL,
  CONSTRAINT uq_certificado_item   UNIQUE (id_item),
  CONSTRAINT uq_certificado_codigo UNIQUE (codigo),
  CONSTRAINT fk_certificado_item   FOREIGN KEY (id_item) REFERENCES item_eletronico (id_item)
);

-- =====================================================================
-- TRIGGERS: histórico automático de status da logística reversa
-- =====================================================================
DELIMITER $$

CREATE TRIGGER trg_logistica_ai
AFTER INSERT ON logistica_reversa
FOR EACH ROW
BEGIN
  INSERT INTO status_logistica (id_logistica, status) VALUES (NEW.id_logistica, NEW.status);
END$$

CREATE TRIGGER trg_logistica_au
AFTER UPDATE ON logistica_reversa
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO status_logistica (id_logistica, status) VALUES (NEW.id_logistica, NEW.status);
  END IF;
END$$

-- Impede destinar um componente cujo item ainda não foi entregue ao reciclador
CREATE TRIGGER trg_destino_bi
BEFORE INSERT ON destino_final
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
      SELECT 1
        FROM componente c
        JOIN logistica_reversa l ON l.id_item = c.id_item
       WHERE c.id_componente = NEW.id_componente
         AND l.id_reciclador = NEW.id_reciclador
         AND l.status = 'ENTREGUE') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Componente ainda não foi entregue a este reciclador.';
  END IF;
END$$

-- =====================================================================
-- STORED PROCEDURE: emite o certificado de destinação (transação)
-- =====================================================================
CREATE PROCEDURE sp_emitir_certificado (IN p_id_item INT, OUT p_codigo CHAR(36))
BEGIN
  DECLARE v_total      INT;
  DECLARE v_destinados INT;
  DECLARE v_peso       DECIMAL(8,3);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT peso_kg INTO v_peso
    FROM item_eletronico WHERE id_item = p_id_item FOR UPDATE;
  IF v_peso IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item não encontrado.';
  END IF;

  SELECT COUNT(*), COUNT(d.id_destino) INTO v_total, v_destinados
    FROM componente c
    LEFT JOIN destino_final d ON d.id_componente = c.id_componente
   WHERE c.id_item = p_id_item;

  IF v_total = 0 OR v_total <> v_destinados THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Todos os componentes precisam de destino final antes do certificado.';
  END IF;

  SET p_codigo = UUID();
  INSERT INTO certificado (id_item, codigo, peso_total_kg)
  VALUES (p_id_item, p_codigo, v_peso);

  COMMIT;
END$$

DELIMITER ;

-- =====================================================================
-- VIEWS: indicadores de impacto (painel e auditoria)
-- =====================================================================
CREATE VIEW vw_kg_por_material AS
SELECT m.nome AS material,
       m.categoria,
       SUM(cm.peso_kg)                  AS kg_recuperados,
       SUM(cm.peso_kg * m.valor_ref_kg) AS valor_estimado_reais
  FROM componente_material cm
  JOIN material m      ON m.id_material = cm.id_material
  JOIN destino_final d ON d.id_componente = cm.id_componente
 WHERE d.tipo IN ('RECICLAGEM','REUSO')
 GROUP BY m.id_material, m.nome, m.categoria;

CREATE VIEW vw_destinacao_por_tipo AS
SELECT d.tipo,
       COUNT(*)       AS componentes,
       SUM(c.peso_kg) AS kg
  FROM destino_final d
  JOIN componente c ON c.id_componente = d.id_componente
 GROUP BY d.tipo;

CREATE VIEW vw_coleta_por_cidade AS
SELECT e.cidade, e.uf,
       COUNT(i.id_item) AS itens,
       SUM(i.peso_kg)   AS kg_descartados
  FROM item_eletronico i
  JOIN gerador g  ON g.id_gerador = i.id_gerador
  JOIN endereco e ON e.id_endereco = g.id_endereco
 GROUP BY e.cidade, e.uf;

CREATE VIEW vw_tempo_medio_logistica AS
SELECT r.id_reciclador,
       u.nome AS reciclador,
       COUNT(*) AS coletas_entregues,
       ROUND(AVG(TIMESTAMPDIFF(HOUR, l.data_solicitacao, l.data_entrega)) / 24, 1) AS dias_medios
  FROM logistica_reversa l
  JOIN reciclador r ON r.id_reciclador = l.id_reciclador
  JOIN usuario u    ON u.id_usuario = r.id_usuario
 WHERE l.status = 'ENTREGUE'
 GROUP BY r.id_reciclador, u.nome;

CREATE VIEW vw_rastreio_item AS
SELECT i.id_item,
       t.nome    AS equipamento,
       ug.nome   AS gerador,
       l.status  AS status_atual,
       ur.nome   AS reciclador,
       c.codigo  AS certificado
  FROM item_eletronico i
  JOIN tipo_equipamento t ON t.id_tipo = i.id_tipo
  JOIN gerador g          ON g.id_gerador = i.id_gerador
  JOIN usuario ug         ON ug.id_usuario = g.id_usuario
  LEFT JOIN logistica_reversa l ON l.id_item = i.id_item AND l.status <> 'CANCELADA'
  LEFT JOIN reciclador r  ON r.id_reciclador = l.id_reciclador
  LEFT JOIN usuario ur    ON ur.id_usuario = r.id_usuario
  LEFT JOIN certificado c ON c.id_item = i.id_item;
