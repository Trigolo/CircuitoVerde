-- =====================================================================
-- CircuitoVerde · 12 · Dados de demonstração do reciclador Gustavo
-- Cria 5 eletrônicos do Gustavo (gerador), levados pelo Gustavo (transportador)
-- até o Gustavo (reciclador), cada um parado numa etapa diferente:
--   1. Smartphone  -> EM TRÂNSITO        (reciclador confirma o recebimento)
--   2. Notebook    -> ENTREGUE           (reciclador registra os componentes)
--   3. Tablet      -> ENTREGUE + componentes sem destino (reciclador define o destino)
--   4. Monitor LCD -> ENTREGUE + componentes com destino (pronto para o certificado)
--   5. Desktop     -> SOLICITADA         (o transportador ainda vai aceitar)
-- O histórico de status é gravado pelos triggers, como no uso real.
-- Antes deste, rode o 11_usuario_gustavo.sql. Pode rodar de novo: não duplica.
-- =====================================================================
USE circuitoverde;

DROP PROCEDURE IF EXISTS sp_demo_reciclador;
DELIMITER //
CREATE PROCEDURE sp_demo_reciclador()
BEGIN
  DECLARE v_ger, v_tra, v_rec, v_item, v_log, v_comp INT;
  -- Tudo numa transação: se algo falhar no meio, nada fica pela metade
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SELECT g.id_gerador INTO v_ger FROM gerador g JOIN usuario u ON u.id_usuario = g.id_usuario
   WHERE u.login = 'gustavo' AND u.perfil = 'GERADOR';
  SELECT t.id_transportador INTO v_tra FROM transportador t JOIN usuario u ON u.id_usuario = t.id_usuario
   WHERE u.login = 'gustavo' AND u.perfil = 'TRANSPORTADOR';
  SELECT r.id_reciclador INTO v_rec FROM reciclador r JOIN usuario u ON u.id_usuario = r.id_usuario
   WHERE u.login = 'gustavo' AND u.perfil = 'RECICLADOR';

  IF v_ger IS NULL OR v_tra IS NULL OR v_rec IS NULL THEN
    SELECT 'PULADO: rode antes o 11_usuario_gustavo.sql.' AS resultado;
  ELSEIF EXISTS (SELECT 1 FROM item_eletronico WHERE id_gerador = v_ger AND descricao LIKE '[demo]%') THEN
    SELECT 'Os dados de demonstração já existem.' AS resultado;
  ELSE
    START TRANSACTION;
    -- 1. Smartphone em trânsito
    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg)
    VALUES (v_ger, (SELECT id_tipo FROM tipo_equipamento WHERE nome = 'Smartphone'), '[demo] celular antigo da gaveta', 'DEFEITUOSO', 0.180);
    SET v_item = LAST_INSERT_ID();
    INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (v_item, v_rec);
    SET v_log = LAST_INSERT_ID();
    UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = v_tra, data_agendada = NOW() + INTERVAL 1 HOUR, rota = 'Centro > Portão' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica = v_log;

    -- 2. Notebook entregue, sem componentes
    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg)
    VALUES (v_ger, (SELECT id_tipo FROM tipo_equipamento WHERE nome = 'Notebook'), '[demo] notebook do escritório', 'SUCATA', 2.300);
    SET v_item = LAST_INSERT_ID();
    INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (v_item, v_rec);
    SET v_log = LAST_INSERT_ID();
    UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = v_tra, data_agendada = NOW(), rota = 'Centro > Portão' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = NOW() WHERE id_logistica = v_log;

    -- 3. Tablet entregue, componentes sem destino
    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg)
    VALUES (v_ger, (SELECT id_tipo FROM tipo_equipamento WHERE nome = 'Tablet'), '[demo] tablet com tela quebrada', 'DEFEITUOSO', 0.500);
    SET v_item = LAST_INSERT_ID();
    INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (v_item, v_rec);
    SET v_log = LAST_INSERT_ID();
    UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = v_tra, data_agendada = NOW(), rota = 'Centro > Portão' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = NOW() WHERE id_logistica = v_log;
    INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES (v_item, 'Bateria', 0.150, FALSE);
    INSERT INTO componente_material VALUES (LAST_INSERT_ID(), (SELECT id_material FROM material WHERE nome LIKE 'Bateria de l%tio'), 0.150);
    INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES (v_item, 'Tela', 0.200, FALSE);
    INSERT INTO componente_material VALUES (LAST_INSERT_ID(), (SELECT id_material FROM material WHERE nome = 'Vidro'), 0.200);

    -- 4. Monitor entregue, todos os componentes com destino (pronto para certificar)
    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg)
    VALUES (v_ger, (SELECT id_tipo FROM tipo_equipamento WHERE nome = 'Monitor LCD'), '[demo] monitor que não liga', 'SUCATA', 3.500);
    SET v_item = LAST_INSERT_ID();
    INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (v_item, v_rec);
    SET v_log = LAST_INSERT_ID();
    UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = v_tra, data_agendada = NOW(), rota = 'Centro > Portão' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica = v_log;
    UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = NOW() WHERE id_logistica = v_log;
    INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES (v_item, 'Carcaça', 1.200, FALSE);
    SET v_comp = LAST_INSERT_ID();
    INSERT INTO componente_material VALUES (v_comp, (SELECT id_material FROM material WHERE nome LIKE 'Pl%stico ABS'), 1.200);
    INSERT INTO destino_final (id_componente, id_reciclador, tipo, local_destino) VALUES (v_comp, v_rec, 'RECICLAGEM', 'Moagem de plásticos');
    INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES (v_item, 'Placa principal', 0.400, FALSE);
    SET v_comp = LAST_INSERT_ID();
    INSERT INTO componente_material VALUES (v_comp, (SELECT id_material FROM material WHERE nome = 'Placa de circuito'), 0.350);
    INSERT INTO componente_material VALUES (v_comp, (SELECT id_material FROM material WHERE nome = 'Cobre'), 0.050);
    INSERT INTO destino_final (id_componente, id_reciclador, tipo, local_destino) VALUES (v_comp, v_rec, 'RECICLAGEM', 'Refino de metais');

    -- 5. Desktop só solicitado
    INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg)
    VALUES (v_ger, (SELECT id_tipo FROM tipo_equipamento WHERE nome = 'Desktop'), '[demo] gabinete velho', 'SUCATA', 7.000);
    INSERT INTO logistica_reversa (id_item, id_reciclador) VALUES (LAST_INSERT_ID(), v_rec);

    COMMIT;
    SELECT 'OK: 5 itens de demonstração criados para o Gustavo.' AS resultado;
  END IF;
END //
DELIMITER ;
CALL sp_demo_reciclador();
DROP PROCEDURE sp_demo_reciclador;

-- Conferência: o que o reciclador Gustavo vai ver
SELECT i.id_item, t.nome AS equipamento, l.status,
       (SELECT COUNT(*) FROM componente c WHERE c.id_item = i.id_item) AS componentes,
       (SELECT COUNT(*) FROM componente c JOIN destino_final d ON d.id_componente = c.id_componente WHERE c.id_item = i.id_item) AS com_destino
  FROM item_eletronico i
  JOIN tipo_equipamento t  ON t.id_tipo = i.id_tipo
  JOIN logistica_reversa l ON l.id_item = i.id_item
 WHERE i.descricao LIKE '[demo]%'
 ORDER BY i.id_item;
