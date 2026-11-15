-- =====================================================================
-- CircuitoVerde · 10 · Índices para as consultas mais usadas (Checkpoint 3)
-- Cada índice abaixo atende uma tela ou rota da API. As FKs, o e-mail,
-- o documento, o código do certificado e a geolocalização já têm índice
-- (criados nos scripts 01 e 06).
-- O script pode rodar mais de uma vez: só cria o que ainda não existe.
-- =====================================================================
USE circuitoverde;

DROP PROCEDURE IF EXISTS sp_criar_indice;
DELIMITER //
CREATE PROCEDURE sp_criar_indice(IN p_tabela VARCHAR(64), IN p_indice VARCHAR(64), IN p_colunas VARCHAR(200))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                  WHERE table_schema = DATABASE() AND table_name = p_tabela AND index_name = p_indice) THEN
    SET @ddl = CONCAT('CREATE INDEX ', p_indice, ' ON ', p_tabela, ' (', p_colunas, ')');
    PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END //
DELIMITER ;

-- Tela "Coletas" do reciclador: WHERE id_reciclador = ? [AND status = ?] ORDER BY data_solicitacao
CALL sp_criar_indice('logistica_reversa', 'idx_log_reciclador_status', 'id_reciclador, status, data_solicitacao');
-- Tela "Coletas" do transportador/admin: WHERE status = ? ORDER BY data_solicitacao DESC
CALL sp_criar_indice('logistica_reversa', 'idx_log_status_data', 'status, data_solicitacao');
-- Linha do tempo do rastreio: WHERE id_logistica = ? ORDER BY data_hora
CALL sp_criar_indice('status_logistica', 'idx_status_log_data', 'id_logistica, data_hora');
-- "Meus descartes": WHERE id_gerador = ? ORDER BY data_descarte
CALL sp_criar_indice('item_eletronico', 'idx_item_gerador_data', 'id_gerador, data_descarte');
-- Validar certificado (exemplo) e relatórios por período: ORDER BY data_emissao DESC
CALL sp_criar_indice('certificado', 'idx_cert_data', 'data_emissao');
-- Mapa de pontos: só pontos ativos, por origem (resumo da tela de pontos)
CALL sp_criar_indice('ponto_coleta', 'idx_ponto_ativo_origem', 'ativo, origem');

DROP PROCEDURE sp_criar_indice;

-- ---------- Como mostrar o ganho na apresentação ----------
-- EXPLAIN mostra se o MySQL usa o índice (coluna "key") e quantas linhas ele lê ("rows").
EXPLAIN SELECT id_logistica, status FROM logistica_reversa
 WHERE id_reciclador = 1 AND status = 'ENTREGUE' ORDER BY data_solicitacao DESC;

EXPLAIN SELECT status, data_hora FROM status_logistica
 WHERE id_logistica = 10 ORDER BY data_hora;

-- Índices da tabela de coletas
SHOW INDEX FROM logistica_reversa;
