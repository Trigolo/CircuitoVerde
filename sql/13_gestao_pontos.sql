-- =====================================================================
-- CircuitoVerde · 13 · Cadastro e aprovação de pontos de coleta
-- O ADMIN cadastra, edita, aprova, rejeita e desativa qualquer ponto.
-- O RECICLADOR cadastra os pontos dele, que ficam PENDENTES até o ADMIN aprovar.
-- Só pontos APROVADOS e ativos aparecem no mapa público (vw_pontos_coleta).
-- Toda mudança de status fica registrada em ponto_coleta_historico (trigger).
-- Pode rodar de novo: só cria o que ainda não existe.
-- =====================================================================
USE circuitoverde;

-- ---------- 1. Novas colunas em ponto_coleta ----------
DROP PROCEDURE IF EXISTS sp_add_coluna;
DELIMITER //
CREATE PROCEDURE sp_add_coluna(IN p_tabela VARCHAR(64), IN p_coluna VARCHAR(64), IN p_def VARCHAR(400))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = p_tabela AND column_name = p_coluna) THEN
    SET @s = CONCAT('ALTER TABLE ', p_tabela, ' ADD COLUMN ', p_coluna, ' ', p_def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;
-- Pontos que já existem (ABREE, recicladores, fictícios) continuam aprovados
CALL sp_add_coluna('ponto_coleta', 'status',          'ENUM(''PENDENTE'',''APROVADO'',''REJEITADO'') NOT NULL DEFAULT ''APROVADO'' AFTER ativo');
CALL sp_add_coluna('ponto_coleta', 'motivo_rejeicao', 'VARCHAR(200) NULL AFTER status');
CALL sp_add_coluna('ponto_coleta', 'telefone',        'VARCHAR(15) NULL AFTER canal');
CALL sp_add_coluna('ponto_coleta', 'horario',         'VARCHAR(120) NULL AFTER telefone');
CALL sp_add_coluna('ponto_coleta', 'cadastrado_por',  'INT NULL AFTER id_reciclador');
CALL sp_add_coluna('ponto_coleta', 'criado_em',       'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER cadastrado_por');
DROP PROCEDURE sp_add_coluna;

-- Chave estrangeira e índice (só se ainda não existirem)
SET @existe := (SELECT COUNT(*) FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = 'ponto_coleta' AND constraint_name = 'fk_ponto_cadastrado_por');
SET @sql := IF(@existe = 0, 'ALTER TABLE ponto_coleta ADD CONSTRAINT fk_ponto_cadastrado_por FOREIGN KEY (cadastrado_por) REFERENCES usuario (id_usuario)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = 'ponto_coleta' AND index_name = 'idx_ponto_status');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_ponto_status ON ponto_coleta (status, ativo)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 2. Histórico de status (auditoria) ----------
CREATE TABLE IF NOT EXISTS ponto_coleta_historico (
  id_historico INT AUTO_INCREMENT PRIMARY KEY,
  id_ponto     INT NOT NULL,
  status       ENUM('PENDENTE','APROVADO','REJEITADO') NOT NULL,
  ativo        BOOLEAN NOT NULL,
  motivo       VARCHAR(200) NULL,
  data_hora    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pch_ponto FOREIGN KEY (id_ponto) REFERENCES ponto_coleta (id_ponto) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_ponto_ai;
DROP TRIGGER IF EXISTS trg_ponto_au;
DELIMITER $$
CREATE TRIGGER trg_ponto_ai
AFTER INSERT ON ponto_coleta
FOR EACH ROW
BEGIN
  INSERT INTO ponto_coleta_historico (id_ponto, status, ativo) VALUES (NEW.id_ponto, NEW.status, NEW.ativo);
END$$

CREATE TRIGGER trg_ponto_au
AFTER UPDATE ON ponto_coleta
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status OR NEW.ativo <> OLD.ativo THEN
    INSERT INTO ponto_coleta_historico (id_ponto, status, ativo, motivo)
    VALUES (NEW.id_ponto, NEW.status, NEW.ativo, NEW.motivo_rejeicao);
  END IF;
END$$
DELIMITER ;

-- ---------- 3. Mapa público: só pontos aprovados e ativos ----------
CREATE OR REPLACE VIEW vw_pontos_coleta AS
SELECT p.id_ponto, p.nome, p.canal, p.origem, p.id_reciclador, p.telefone, p.horario,
       e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep, e.latitude, e.longitude,
       GROUP_CONCAT(pc.categoria ORDER BY pc.categoria) AS categorias
  FROM ponto_coleta p
  JOIN endereco e ON e.id_endereco = p.id_endereco
  LEFT JOIN ponto_coleta_categoria pc ON pc.id_ponto = p.id_ponto
 WHERE p.ativo = TRUE AND p.status = 'APROVADO'
 GROUP BY p.id_ponto, p.nome, p.canal, p.origem, p.id_reciclador, p.telefone, p.horario,
          e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep, e.latitude, e.longitude;

-- Gestão (admin e reciclador): todos os pontos, com quem cadastrou
CREATE OR REPLACE VIEW vw_gestao_pontos AS
SELECT p.id_ponto, p.nome, p.canal, p.origem, p.id_reciclador, p.telefone, p.horario,
       p.status, p.motivo_rejeicao, p.ativo, p.criado_em, p.atualizado_em,
       p.cadastrado_por, uc.nome AS cadastrado_por_nome, ur.nome AS reciclador,
       e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep, e.latitude, e.longitude,
       (SELECT GROUP_CONCAT(pc.categoria ORDER BY pc.categoria) FROM ponto_coleta_categoria pc WHERE pc.id_ponto = p.id_ponto) AS categorias
  FROM ponto_coleta p
  JOIN endereco e        ON e.id_endereco = p.id_endereco
  LEFT JOIN usuario uc   ON uc.id_usuario = p.cadastrado_por
  LEFT JOIN reciclador r ON r.id_reciclador = p.id_reciclador
  LEFT JOIN usuario ur   ON ur.id_usuario = r.id_usuario;

-- ---------- 4. Permissões da API (menor privilégio) ----------
-- Só se o 09_seguranca.sql já criou o papel; em banco gerenciado o admin pode não ter GRANT OPTION
DROP PROCEDURE IF EXISTS sp_grant_pontos;
DELIMITER //
CREATE PROCEDURE sp_grant_pontos()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1227, 1410, 3523, 1396, 1142
    SELECT 'PULADO: sem permissão para conceder (normal em banco gerenciado).' AS resultado;
  IF EXISTS (SELECT 1 FROM mysql.user WHERE user = 'cv_papel_app') THEN
    GRANT INSERT, UPDATE ON circuitoverde.ponto_coleta TO 'cv_papel_app';
    GRANT INSERT, DELETE ON circuitoverde.ponto_coleta_categoria TO 'cv_papel_app';   -- trocar as categorias de um ponto
    GRANT UPDATE ON circuitoverde.endereco TO 'cv_papel_app';
    GRANT SELECT ON circuitoverde.vw_gestao_pontos TO 'cv_papel_auditor';
  END IF;
END //
DELIMITER ;
CALL sp_grant_pontos();
DROP PROCEDURE sp_grant_pontos;

-- ---------- Conferência ----------
SELECT status, ativo, COUNT(*) AS pontos FROM ponto_coleta GROUP BY status, ativo;
