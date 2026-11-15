-- =====================================================================
-- CircuitoVerde · 11 · Login por nome de usuário + usuário Gustavo
-- Cria a coluna "login" (nome de usuário) e um usuário Gustavo em cada perfil.
-- Na tela Entrar: Usuário "Gustavo", senha "Gustavo" e escolha o perfil.
-- O mesmo login pode existir em perfis diferentes (UNIQUE login + perfil).
-- Pode rodar mais de uma vez.
-- =====================================================================
USE circuitoverde;

-- ---------- 1. Coluna login (só cria se ainda não existir) ----------
DROP PROCEDURE IF EXISTS sp_add_login;
DELIMITER //
CREATE PROCEDURE sp_add_login()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'login') THEN
    ALTER TABLE usuario ADD COLUMN login VARCHAR(40) NULL AFTER nome;
    ALTER TABLE usuario ADD CONSTRAINT uq_usuario_login_perfil UNIQUE (login, perfil);
  END IF;
END //
DELIMITER ;
CALL sp_add_login();
DROP PROCEDURE sp_add_login;

-- ---------- 2. Usuário Gustavo, senha Gustavo (hash bcrypt) ----------
SET @senha = '$2a$10$IIEJEyomVdVGIRQ1tfSOXeImY9.QnAUv9JuD86w7STj/POb/RfPfG';

-- e-mail interno só para cumprir o NOT NULL/UNIQUE; o login é feito pelo nome
INSERT INTO usuario (nome, login, email, senha_hash, perfil) VALUES
  ('Gustavo', 'gustavo', 'gustavo.gerador@circuitoverde.local',       @senha, 'GERADOR'),
  ('Gustavo', 'gustavo', 'gustavo.transportador@circuitoverde.local', @senha, 'TRANSPORTADOR'),
  ('Gustavo', 'gustavo', 'gustavo.reciclador@circuitoverde.local',    @senha, 'RECICLADOR'),
  ('Gustavo', 'gustavo', 'gustavo.admin@circuitoverde.local',         @senha, 'ADMIN'),
  ('Gustavo', 'gustavo', 'gustavo.auditor@circuitoverde.local',       @senha, 'AUDITOR')
ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash), nome = VALUES(nome), ativo = TRUE;

-- ---------- 3. Cadastro de cada papel (gerador, transportador, reciclador) ----------
-- Endereço do Gustavo (reaproveitado se já existir)
INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep, latitude, longitude)
SELECT 'Rua XV de Novembro', '1000', 'Centro', 'Curitiba', 'PR', '80020310', -25.429600, -49.271900
 WHERE NOT EXISTS (SELECT 1 FROM gerador g JOIN usuario u ON u.id_usuario = g.id_usuario WHERE u.email = 'gustavo.gerador@circuitoverde.local');
SET @end_gustavo = LAST_INSERT_ID();

INSERT INTO gerador (id_usuario, id_endereco, tipo, documento, telefone)
SELECT u.id_usuario, @end_gustavo, 'PF', '90000000001', '41999990000'
  FROM usuario u
 WHERE u.email = 'gustavo.gerador@circuitoverde.local'
   AND NOT EXISTS (SELECT 1 FROM gerador g WHERE g.id_usuario = u.id_usuario);

INSERT INTO transportador (id_usuario, documento, placa_veiculo)
SELECT u.id_usuario, '90000000002', 'CVG2026'
  FROM usuario u
 WHERE u.email = 'gustavo.transportador@circuitoverde.local'
   AND NOT EXISTS (SELECT 1 FROM transportador t WHERE t.id_usuario = u.id_usuario);

INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep, latitude, longitude)
SELECT 'Rua João Bettega', '3000', 'Portão', 'Curitiba', 'PR', '81070000', -25.476300, -49.294900
 WHERE NOT EXISTS (SELECT 1 FROM reciclador r JOIN usuario u ON u.id_usuario = r.id_usuario WHERE u.email = 'gustavo.reciclador@circuitoverde.local');
SET @end_rec = LAST_INSERT_ID();

INSERT INTO reciclador (id_usuario, id_endereco, cnpj, licenca_ambiental, capacidade_kg_mes)
SELECT u.id_usuario, @end_rec, '90000000000199', 'LO-PR-2026-0999', 10000
  FROM usuario u
 WHERE u.email = 'gustavo.reciclador@circuitoverde.local'
   AND NOT EXISTS (SELECT 1 FROM reciclador r WHERE r.id_usuario = u.id_usuario);

INSERT IGNORE INTO reciclador_material (id_reciclador, id_material)
SELECT r.id_reciclador, m.id_material
  FROM reciclador r JOIN usuario u ON u.id_usuario = r.id_usuario CROSS JOIN material m
 WHERE u.email = 'gustavo.reciclador@circuitoverde.local';

-- ---------- Conferência ----------
SELECT u.id_usuario, u.nome, u.login, u.perfil,
       COALESCE(g.id_gerador, t.id_transportador, r.id_reciclador) AS id_no_papel
  FROM usuario u
  LEFT JOIN gerador g       ON g.id_usuario = u.id_usuario
  LEFT JOIN transportador t ON t.id_usuario = u.id_usuario
  LEFT JOIN reciclador r    ON r.id_usuario = u.id_usuario
 WHERE u.login = 'gustavo'
 ORDER BY u.perfil;
