-- =====================================================================
-- CircuitoVerde | Script 02: dados de teste (fictícios)
-- Rode depois do 01_schema.sql
-- =====================================================================
USE circuitoverde;

SET NAMES utf8mb4;

-- Usuários (senha_hash é apenas um exemplo de formato bcrypt)
INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES
 ('Ana Souza',             'ana@exemplo.com',        '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'GERADOR'),
 ('Escola Futuro Ltda',    'contato@futuro.edu.br',  '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'GERADOR'),
 ('Tech Escritórios S.A.', 'ti@techesc.com.br',      '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'GERADOR'),
 ('Recicla Sul Ltda',      'operacao@reciclasul.com','$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'RECICLADOR'),
 ('Coop. Eletro Verde',    'coop@eletroverde.org',   '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'RECICLADOR'),
 ('Carlos Lima',           'carlos@exemplo.com',     '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'TRANSPORTADOR'),
 ('Admin CircuitoVerde',   'admin@circuitoverde.app','$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234', 'ADMIN');

INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep) VALUES
 ('Rua das Flores',       '120',  'Centro',        'Curitiba',      'PR', '80010000'),
 ('Av. Brasil',           '1500', 'Água Verde',    'Curitiba',      'PR', '80240000'),
 ('Rua XV de Novembro',   '800',  'Centro',        'Joinville',     'SC', '89201000'),
 ('Rod. BR-277',          'km 5', 'CIC',           'Curitiba',      'PR', '81450000'),
 ('Rua do Reciclador',    '45',   'Boqueirão',     'Curitiba',      'PR', '81650000');

INSERT INTO gerador (id_usuario, id_endereco, tipo, documento, telefone) VALUES
 (1, 1, 'PF', '12345678901',    '41999990001'),
 (2, 2, 'PJ', '11222333000181', '4133330002'),
 (3, 3, 'PJ', '44555666000172', '4733330003');

INSERT INTO reciclador (id_usuario, id_endereco, cnpj, licenca_ambiental, capacidade_kg_mes) VALUES
 (4, 4, '77888999000163', 'LO-PR-2025-0001', 20000),
 (5, 5, '10203040000150', 'LO-PR-2025-0002',  5000);

INSERT INTO transportador (id_usuario, documento, placa_veiculo) VALUES
 (6, '98765432100', 'ABC1D23');

-- Catálogos (valores de referência ilustrativos)
INSERT INTO material (nome, categoria, perigoso, valor_ref_kg) VALUES
 ('Cobre',     'METAL',    FALSE, 35.00),
 ('Alumínio',  'METAL',    FALSE,  6.00),
 ('Ferro',     'METAL',    FALSE,  0.80),
 ('Plástico ABS', 'PLASTICO', FALSE, 1.50),
 ('Placa de circuito', 'PLACA', FALSE, 25.00),
 ('Bateria de lítio',  'BATERIA', TRUE, 10.00),
 ('Vidro',     'VIDRO',    FALSE,  0.20);

INSERT INTO reciclador_material (id_reciclador, id_material) VALUES
 (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),
 (2,1),(2,2),(2,4),(2,5);

INSERT INTO tipo_equipamento (nome, categoria) VALUES
 ('Notebook',    'INFORMATICA'),
 ('Desktop',     'INFORMATICA'),
 ('Smartphone',  'TELEFONIA'),
 ('Monitor LCD', 'INFORMATICA'),
 ('Micro-ondas', 'ELETRODOMESTICO');

-- Itens descartados
INSERT INTO item_eletronico (id_gerador, id_tipo, descricao, estado, peso_kg, data_descarte) VALUES
 (1, 3, 'Smartphone antigo com tela quebrada', 'DEFEITUOSO',  0.180, '2026-09-01 10:00:00'),
 (2, 1, 'Notebook do laboratório',             'SUCATA',      2.300, '2026-09-03 14:30:00'),
 (2, 4, 'Monitor 19 polegadas',                'DEFEITUOSO',  3.500, '2026-09-03 14:35:00'),
 (3, 2, 'Desktop do escritório',               'SUCATA',      8.000, '2026-09-10 09:00:00');

-- Componentes e composição
INSERT INTO componente (id_item, nome, peso_kg, reaproveitavel) VALUES
 (1, 'Bateria',            0.045, FALSE),
 (1, 'Placa principal',    0.030, FALSE),
 (1, 'Carcaça',            0.105, FALSE),
 (2, 'Bateria',            0.300, FALSE),
 (2, 'Placa-mãe',          0.400, FALSE),
 (2, 'Carcaça',            1.200, FALSE),
 (2, 'Memória RAM',        0.020, TRUE),
 (4, 'Gabinete',           5.500, FALSE),
 (4, 'Fonte',              1.500, TRUE),
 (4, 'Placa-mãe',          1.000, FALSE);

INSERT INTO componente_material (id_componente, id_material, peso_kg) VALUES
 (1, 6, 0.045),
 (2, 5, 0.025), (2, 1, 0.005),
 (3, 4, 0.080), (3, 2, 0.025),
 (4, 6, 0.300),
 (5, 5, 0.350), (5, 1, 0.050),
 (6, 4, 0.900), (6, 2, 0.300),
 (7, 5, 0.020),
 (8, 3, 4.500), (8, 4, 1.000),
 (9, 1, 0.400), (9, 3, 1.100),
 (10, 5, 0.900), (10, 1, 0.100);

-- Logística reversa (o trigger grava o status inicial automaticamente)
INSERT INTO logistica_reversa (id_item, id_reciclador, data_solicitacao) VALUES
 (1, 2, '2026-09-01 11:00:00'),
 (2, 1, '2026-09-03 15:00:00'),
 (3, 1, '2026-09-03 15:05:00'),
 (4, 1, '2026-09-10 10:00:00');

-- Avanço dos status (cada UPDATE gera uma linha em status_logistica)
UPDATE logistica_reversa SET status = 'AGENDADA', id_transportador = 1, data_agendada = '2026-09-05 09:00:00', rota = 'Centro > Água Verde > CIC' WHERE id_logistica IN (2, 3, 4);
UPDATE logistica_reversa SET status = 'EM_TRANSITO' WHERE id_logistica IN (2, 4);
UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = '2026-09-06 16:00:00' WHERE id_logistica = 2;
UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = '2026-09-12 11:00:00' WHERE id_logistica = 4;
UPDATE logistica_reversa SET status = 'ENTREGUE', data_entrega = '2026-09-02 17:00:00' WHERE id_logistica = 1;

-- Destino final (o trigger só aceita componentes já entregues ao reciclador)
INSERT INTO destino_final (id_componente, id_reciclador, tipo, local_destino) VALUES
 (1, 2, 'DESCARTE_ESPECIAL', 'Tratamento de baterias licenciado'),
 (2, 2, 'RECICLAGEM', 'Refino de metais'),
 (3, 2, 'RECICLAGEM', 'Moagem de plásticos'),
 (4, 1, 'DESCARTE_ESPECIAL', 'Tratamento de baterias licenciado'),
 (5, 1, 'RECICLAGEM', 'Refino de metais'),
 (6, 1, 'RECICLAGEM', 'Moagem de plásticos'),
 (7, 1, 'REUSO', 'Recondicionamento'),
 (8, 1, 'RECICLAGEM', 'Siderurgia'),
 (9, 1, 'REUSO', 'Recondicionamento');
-- componente 10 (placa-mãe do desktop) ainda sem destino: o item 4 ainda não pode ter certificado

-- Certificados: item 1 e item 2 têm todos os componentes destinados
CALL sp_emitir_certificado(1, @cert1);
CALL sp_emitir_certificado(2, @cert2);
SELECT @cert1 AS certificado_item_1, @cert2 AS certificado_item_2;
