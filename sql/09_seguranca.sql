-- =====================================================================
-- CircuitoVerde · 09 · Segurança do banco (Checkpoint 3)
-- Princípio do menor privilégio: cada sistema/pessoa usa um usuário do
-- MySQL que só pode fazer o que precisa. Nada de usar "root" na API.
--
-- Papéis (ROLES, MySQL 8):
--   cv_papel_app        -> a API: lê tudo, grava só nas tabelas do fluxo,
--                          executa só a procedure e a função que usa.
--                          NÃO pode apagar (DELETE) nem mudar a estrutura (DDL).
--   cv_papel_relatorio  -> BI / Looker Studio: só lê as VIEWS (vw_*),
--                          nunca as tabelas com e-mail, CPF ou senha.
--   cv_papel_auditor    -> auditoria: lê todas as tabelas, não altera nada.
--   cv_papel_backup     -> mysqldump: o mínimo para copiar dados, views,
--                          triggers e procedures.
--
-- Antes deste, rode os scripts 01 a 08 (o 08_assistente.sql cria a tabela
-- assistente_conversa). Se o 08 ainda não foi rodado, este script avisa e pula
-- só as permissões do assistente; rode o 08 e depois este de novo.
-- Rode como root:  mysql -u root -p < 09_seguranca.sql
-- Depois TROQUE as senhas abaixo e coloque a do cv_app no .env da API:
--   DB_USER=cv_app   DB_PASSWORD=<a senha que você definiu>
-- =====================================================================
USE circuitoverde;

-- ---------- Limpa versões anteriores (o script pode rodar de novo) ----------
DROP USER IF EXISTS 'cv_app'@'localhost', 'cv_relatorio'@'localhost', 'cv_auditor'@'localhost', 'cv_backup'@'localhost';
DROP ROLE IF EXISTS 'cv_papel_app', 'cv_papel_relatorio', 'cv_papel_auditor', 'cv_papel_backup';

CREATE ROLE 'cv_papel_app', 'cv_papel_relatorio', 'cv_papel_auditor', 'cv_papel_backup';

-- ---------- 1. API ----------
GRANT SELECT ON circuitoverde.* TO 'cv_papel_app';
-- grava só onde o fluxo da aplicação grava
GRANT INSERT ON circuitoverde.usuario             TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.endereco            TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.gerador             TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.transportador       TO 'cv_papel_app';   -- cadastro de transportador
GRANT INSERT ON circuitoverde.reciclador          TO 'cv_papel_app';   -- cadastro de reciclador
GRANT INSERT ON circuitoverde.reciclador_material TO 'cv_papel_app';
-- Cadastro de pontos de coleta (13_gestao_pontos.sql). Ignorado se o 13 ainda não rodou.
GRANT INSERT ON circuitoverde.item_eletronico     TO 'cv_papel_app';
GRANT INSERT, UPDATE ON circuitoverde.logistica_reversa TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.componente          TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.componente_material TO 'cv_papel_app';
GRANT INSERT ON circuitoverde.destino_final       TO 'cv_papel_app';
-- status_logistica e certificado são gravados pelo trigger e pela procedure
-- (rodam com o privilégio de quem os criou), então a API não precisa de INSERT nelas.
GRANT EXECUTE ON PROCEDURE circuitoverde.sp_emitir_certificado TO 'cv_papel_app';
GRANT EXECUTE ON FUNCTION  circuitoverde.fn_distancia_km       TO 'cv_papel_app';

-- ---------- 2. Relatórios (só views, sem dados pessoais brutos) ----------
GRANT SELECT ON circuitoverde.vw_descartes_por_mes      TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_descartes_por_tipo     TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_destinacao_por_tipo    TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_kg_por_material        TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_coleta_por_cidade      TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_status_coletas         TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_tempo_medio_logistica  TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_composicao_media_tipo  TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_ranking_geradores      TO 'cv_papel_relatorio';   -- nomes de PF já abreviados
GRANT SELECT ON circuitoverde.vw_panorama               TO 'cv_papel_relatorio';
GRANT SELECT ON circuitoverde.vw_pontos_coleta          TO 'cv_papel_relatorio';

-- ---------- Permissões do assistente (só se o 08_assistente.sql já foi rodado) ----------
DROP PROCEDURE IF EXISTS sp_grant_se_existir;
DELIMITER //
CREATE PROCEDURE sp_grant_se_existir(IN p_objeto VARCHAR(64), IN p_grant VARCHAR(300))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'circuitoverde' AND table_name = p_objeto) THEN
    SET @g = p_grant; PREPARE s FROM @g; EXECUTE s; DEALLOCATE PREPARE s;
    SELECT CONCAT('OK: ', p_grant) AS resultado;
  ELSE
    SELECT CONCAT('PULADO: ', p_objeto, ' não existe. Rode o 08_assistente.sql e depois este script de novo.') AS resultado;
  END IF;
END //
DELIMITER ;
CALL sp_grant_se_existir('assistente_conversa',       'GRANT INSERT ON circuitoverde.assistente_conversa TO ''cv_papel_app''');
CALL sp_grant_se_existir('vw_assistente_uso',         'GRANT SELECT ON circuitoverde.vw_assistente_uso TO ''cv_papel_relatorio''');
CALL sp_grant_se_existir('vw_assistente_ferramentas', 'GRANT SELECT ON circuitoverde.vw_assistente_ferramentas TO ''cv_papel_relatorio''');
CALL sp_grant_se_existir('ponto_coleta_historico',    'GRANT INSERT, UPDATE ON circuitoverde.ponto_coleta TO ''cv_papel_app''');
CALL sp_grant_se_existir('ponto_coleta_historico',    'GRANT INSERT, DELETE ON circuitoverde.ponto_coleta_categoria TO ''cv_papel_app''');
CALL sp_grant_se_existir('ponto_coleta_historico',    'GRANT UPDATE ON circuitoverde.endereco TO ''cv_papel_app''');
CALL sp_grant_se_existir('vw_gestao_pontos',          'GRANT SELECT ON circuitoverde.vw_gestao_pontos TO ''cv_papel_auditor''');
DROP PROCEDURE sp_grant_se_existir;

-- ---------- 3. Auditoria (leitura total, nenhuma escrita) ----------
GRANT SELECT, SHOW VIEW ON circuitoverde.* TO 'cv_papel_auditor';

-- ---------- 4. Backup (mysqldump com views, triggers e procedures) ----------
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT ON circuitoverde.* TO 'cv_papel_backup';
-- Permissão global: em banco gerenciado (Aiven) o admin não pode concedê-la; aí o script avisa e segue
DROP PROCEDURE IF EXISTS sp_grant_global_backup;
DELIMITER //
CREATE PROCEDURE sp_grant_global_backup()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1227, 1045, 1410
    SELECT 'PULADO: sem permissão para PROCESS/SHOW_ROUTINE (normal em banco gerenciado como o Aiven).' AS resultado;
  GRANT PROCESS, SHOW_ROUTINE ON *.* TO 'cv_papel_backup';
END //
DELIMITER ;
CALL sp_grant_global_backup();
DROP PROCEDURE sp_grant_global_backup;

-- ---------- Usuários (TROQUE AS SENHAS antes de usar de verdade) ----------
-- Bloqueio por 1 dia após 5 senhas erradas seguidas (exceto o cv_app).
-- Não use # nas senhas: no arquivo .env o # começa um comentário e corta a senha.
-- A API não tem bloqueio por senha errada: se o .env estiver errado, travar o cv_app derrubaria o site.
CREATE USER 'cv_app'@'localhost'       IDENTIFIED BY 'Troque-App_2026';
CREATE USER 'cv_relatorio'@'localhost' IDENTIFIED BY 'Troque-Relatorio_2026' FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;
CREATE USER 'cv_auditor'@'localhost'   IDENTIFIED BY 'Troque-Auditor_2026'   FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;
CREATE USER 'cv_backup'@'localhost'    IDENTIFIED BY 'Troque-Backup_2026'    FAILED_LOGIN_ATTEMPTS 5 PASSWORD_LOCK_TIME 1;

GRANT 'cv_papel_app'       TO 'cv_app'@'localhost';
GRANT 'cv_papel_relatorio' TO 'cv_relatorio'@'localhost';
GRANT 'cv_papel_auditor'   TO 'cv_auditor'@'localhost';
GRANT 'cv_papel_backup'    TO 'cv_backup'@'localhost';

-- O papel já vem ativo quando o usuário conecta
SET DEFAULT ROLE ALL TO 'cv_app'@'localhost', 'cv_relatorio'@'localhost', 'cv_auditor'@'localhost', 'cv_backup'@'localhost';

-- ---------- Conferência ----------
SHOW GRANTS FOR 'cv_app'@'localhost' USING 'cv_papel_app';
SHOW GRANTS FOR 'cv_relatorio'@'localhost' USING 'cv_papel_relatorio';

-- ---------- Teste rápido (rode logado como cv_app) ----------
-- mysql -u cv_app -p circuitoverde
--   SELECT COUNT(*) FROM vw_rastreio_item;          -- funciona
--   DELETE FROM item_eletronico WHERE id_item = 1;  -- ERRO 1142: DELETE command denied
--   DROP TABLE material;                            -- ERRO 1142: DROP command denied
-- mysql -u cv_relatorio -p circuitoverde
--   SELECT * FROM vw_status_coletas;                -- funciona
--   SELECT email, senha_hash FROM usuario;          -- ERRO 1142: SELECT command denied
