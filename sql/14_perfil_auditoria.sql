-- =====================================================================
-- CircuitoVerde · 14 · Perfil do usuário, relatórios, auditoria e notificações
-- Não cria tabelas: as telas novas usam as views e o histórico que os triggers já gravam.
--   1. Índice para a trilha de auditoria (eventos mais recentes primeiro)
--   2. Permissões POR COLUNA para a API editar o perfil (menor privilégio:
--      a API só altera nome, e-mail e senha do usuário; nunca o perfil ou o "ativo")
-- Pode rodar de novo.
-- =====================================================================
USE circuitoverde;

SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = 'status_logistica' AND index_name = 'idx_status_data_hora');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_status_data_hora ON status_logistica (data_hora)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DROP PROCEDURE IF EXISTS sp_grant_perfil;
DELIMITER //
CREATE PROCEDURE sp_grant_perfil()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1227, 1410, 3523, 1396, 1142
    SELECT 'PULADO: sem permissão para conceder (normal em banco gerenciado).' AS resultado;
  IF EXISTS (SELECT 1 FROM mysql.user WHERE user = 'cv_papel_app') THEN
    GRANT UPDATE (nome, email, senha_hash) ON circuitoverde.usuario TO 'cv_papel_app';
    GRANT UPDATE (telefone) ON circuitoverde.gerador TO 'cv_papel_app';
    GRANT UPDATE (placa_veiculo) ON circuitoverde.transportador TO 'cv_papel_app';
    GRANT UPDATE (licenca_ambiental, capacidade_kg_mes) ON circuitoverde.reciclador TO 'cv_papel_app';
    SELECT 'OK: permissões por coluna concedidas ao cv_papel_app.' AS resultado;
  END IF;
END //
DELIMITER ;
CALL sp_grant_perfil();
DROP PROCEDURE sp_grant_perfil;

-- Exemplo para a apresentação: o filtro por período usa o índice novo (type = range)
EXPLAIN SELECT id_status, status, data_hora FROM status_logistica WHERE data_hora >= NOW() - INTERVAL 7 DAY ORDER BY data_hora DESC;
