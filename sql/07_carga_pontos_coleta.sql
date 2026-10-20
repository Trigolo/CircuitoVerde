-- =====================================================================
-- CircuitoVerde | Script 07: carga de pontos de coleta
-- Pontos REAIS: base pública de pontos de recebimento da ABREE (Associação Brasileira
--   de Reciclagem de Eletroeletrônicos e Eletrodomésticos), consultada em 19/10/2026,
--   produto "Telefone Celular", nas 27 capitais e em cidades do interior.
--   Foram carregados 285 pontos (os mais próximos do centro de cada cidade).
-- Pontos FICTÍCIOS: municípios onde a busca não retornou nenhum ponto (raio de 10 km).
--   Ficam marcados com origem = 'FICTICIO' e aparecem com aviso no site.
-- Rode DEPOIS do 06_estrutura_nova.sql.
-- =====================================================================
SET NAMES utf8mb4;
USE circuitoverde;

START TRANSACTION;

-- Tabela temporária: cada linha vira um endereço + um ponto de coleta
DROP TEMPORARY TABLE IF EXISTS tmp_ponto;
CREATE TEMPORARY TABLE tmp_ponto (
  id_externo INT NULL, nome VARCHAR(120), logradouro VARCHAR(150), numero VARCHAR(10), bairro VARCHAR(80),
  cidade VARCHAR(80), uf CHAR(2), cep CHAR(8), canal VARCHAR(40), latitude DECIMAL(9,6), longitude DECIMAL(9,6),
  origem ENUM('ABREE','FICTICIO'));

INSERT INTO tmp_ponto VALUES
  (149712, 'Bemol - Rio Branco', 'Est. da Floresta', '2320', 'Centro', 'Rio Branco', 'AC', '69912900', 'Parceiro', -9.976636, -67.850731, 'ABREE'),
  (145361, 'Loja Vivo Via Verde Shopping', 'Estrada da Floresta', '2320', 'Floresta Sul', 'Rio Branco', 'AC', '69912290', 'Varejo', -9.985828, -67.848409, 'ABREE'),
  (149655, 'SENAI - Distrito Industrial - Rio Branco', 'R. das Acácias', '673', 'Centro', 'Rio Branco', 'AC', '69920202', 'Parceiro', -9.943676, -67.871195, 'ABREE'),
  (150741, 'Secretaria Municipal - Rio Branco', 'R. Antonio da Rocha Viana', 'S/N', 'Centro', 'Rio Branco', 'AC', '69914610', 'Parceiro', -9.950970, -67.824297, 'ABREE'),
  (150293, '3d Notebook - Epson', 'R. Jose de Melo', '61', 'Centro', 'Rio Branco', 'AC', '69900403', 'Parceiro', -9.970189, -67.813656, 'ABREE'),
  (151310, 'Quality Informatica', 'Avenida Ceara', '1904', 'Centro', 'Rio Branco', 'AC', '69900379', 'Parceiro', -9.970626, -67.813534, 'ABREE'),
  (144536, 'Loja Vivo', 'Avenida Epaminondas Jacome', '3048', 'Centro', 'Rio Branco', 'AC', '69908420', 'Varejo', -9.977027, -67.809707, 'ABREE'),
  (144535, 'Loja Vivo', 'Travessa Campo do Branco', '450', 'Centro', 'Rio Branco', 'AC', '69905022', 'Varejo', -9.968294, -67.807092, 'ABREE'),
  (144537, 'Loja Vivo', 'Avenida Ceara', '803', 'Ceramica', 'Rio Branco', 'AC', '69905066', 'Varejo', -9.972420, -67.803476, 'ABREE'),
  (160452, 'Agência dos Correios Rio Branco', 'Avenida Epaminondas Jacome', '2858', 'Centro', 'Rio Branco', 'AC', '69900970', 'Parceiro', -10.012980, -67.808995, 'ABREE'),
  (151322, 'Jet Pecas e Baterias', 'Alameda Presidente Medice', '1180', 'Centro', 'Rio Branco', 'AC', '69906037', 'Parceiro', -9.999466, -67.800119, 'ABREE'),
  (149389, 'Casas Bahia - Maceió - Centro 1', 'R. do Comércio', '288', 'Centro', 'Maceió', 'AL', '57020000', 'Parceiro', -9.664106, -35.737491, 'ABREE'),
  (154621, 'Agência dos Correios Central Maceio', 'Rua do Sol', '57', 'Centro', 'Maceió', 'AL', '57020970', 'Parceiro', -9.664694, -35.736194, 'ABREE'),
  (147340, 'Magazine Luiza - Filial 728', 'Rua do Comercio', '514', 'Centro', 'Maceió', 'AL', '57020000', 'Parceiro', -9.662267, -35.738060, 'ABREE'),
  (147339, 'Magazine Luiza - Filial 726', 'Rua do Livramento', '207', 'Centro', 'Maceió', 'AL', '57020030', 'Parceiro', -9.664814, -35.739666, 'ABREE'),
  (161365, 'Agência Franqueada dos Correios Centro', 'Rua Doutor Pedro Monteiro', '292', 'Centro', 'Maceió', 'AL', '57020972', 'Parceiro', -9.668020, -35.739930, 'ABREE'),
  (143187, 'Central das Impressoras', 'Avenida Clodoaldo Fonseca', '211', 'Farol', 'Maceió', 'AL', '57051150', 'Parceiro', -9.659661, -35.734204, 'ABREE'),
  (145835, 'World Supri', 'Rua Goncalves Dias', '225', 'Farol', 'Maceió', 'AL', '57051330', 'Parceiro', -9.654799, -35.734375, 'ABREE'),
  (143169, 'Casa das Tintas', 'Avenida Comendador Leao', '1346', 'Poco', 'Maceió', 'AL', '57025000', 'Parceiro', -9.658668, -35.722959, 'ABREE'),
  (143170, 'Casa das Tintas', 'Avenida Fernandes Lima', '328', 'Farol', 'Maceió', 'AL', '57050000', 'Parceiro', -9.647791, -35.733604, 'ABREE'),
  (152676, 'Camelo Bebidas', 'Avenida Siqueira Campos', '1510', 'Centro', 'Maceió', 'AL', '57010003', 'Parceiro', -9.670430, -35.754170, 'ABREE'),
  (160818, 'Agência dos Correios Marco Zero', 'Rua Claudomiro de Moraes', '0', 'Centro', 'Macapá', 'AP', '68903971', 'Parceiro', 0.018740, -51.078490, 'ABREE'),
  (152133, 'Papelaria Jhc', 'Rua Benedito Lino do Carmo', '2159', 'Centro', 'Macapá', 'AP', '68904366', 'Parceiro', -0.010701, -51.089111, 'ABREE'),
  (149976, 'Universidade Federal do Amapá – Campus Marco Zero', 'Rod. Josmar. Chaves Pinto', 'Km 02', 'Centro', 'Macapá', 'AP', '68903419', 'Parceiro', -0.004535, -51.084086, 'ABREE'),
  (161211, 'Agência dos Correios Beirol', 'Rua Jovino Dinoa', '0', 'Centro', 'Macapá', 'AP', '68902970', 'Parceiro', 0.014615, -51.074101, 'ABREE'),
  (153192, 'Unidade Jadlog Macapa 01', 'Rua Professor Tostes', '2740', 'Centro', 'Macapá', 'AP', '68902892', 'Parceiro', 0.023916, -51.071470, 'ABREE'),
  (161373, 'Agência Franqueada dos Correios Centro Norte', 'Avenida Fab', '1854', 'Centro', 'Macapá', 'AP', '68906973', 'Parceiro', 0.032309, -51.071001, 'ABREE'),
  (144859, 'Loja Vivo Amapa Garden Shopping', 'Rodovia Juscelino Kubitschek', '2141', 'Universidade', 'Macapá', 'AP', '68903419', 'Varejo', -0.008665, -51.080686, 'ABREE'),
  (150298, 'Tecnomix - Epson', 'R. Hamilton Silva', '2654', 'Centro', 'Macapá', 'AP', '68901140', 'Parceiro', 0.025706, -51.065172, 'ABREE'),
  (145012, 'Loja Vivo Macapa Shopping', 'Rua Leopoldo Machado', '2334', 'Trem', 'Macapá', 'AP', '68900098', 'Varejo', 0.031185, -51.063039, 'ABREE'),
  (160621, 'Agência dos Correios Sao Lazaro', 'Rua Adilson Jose Pinto Pereira', '156', 'Centro', 'Macapá', 'AP', '68908973', 'Parceiro', 0.047530, -51.062801, 'ABREE'),
  (144255, 'Loja Vivo', 'Rua Marcilio Dias', '171', 'Centro', 'Manaus', 'AM', '69005270', 'Varejo', -3.136260, -60.023395, 'ABREE'),
  (149464, 'Bemol Manaus - Matriz', 'R. Miranda Leão', '41', 'Centro', 'Manaus', 'AM', '69005901', 'Parceiro', -3.138164, -60.023875, 'ABREE'),
  (144256, 'Loja Vivo', 'Rua Doutor Moreira', '168', 'Centro', 'Manaus', 'AM', '69005250', 'Varejo', -3.136629, -60.022040, 'ABREE'),
  (154722, 'Agência dos Correios Saldanha Marinho', 'Rua Barroso', '226', 'Centro', 'Manaus', 'AM', '69010972', 'Parceiro', -3.132843, -60.023080, 'ABREE'),
  (144257, 'Loja Vivo', 'Avenida Eduardo Ribeiro', '654', 'Centro', 'Manaus', 'AM', '69005160', 'Varejo', -3.131333, -60.023987, 'ABREE'),
  (154775, 'Agência dos Correios Monsenhor Coutinho', 'Rua do Congresso', '90', 'Centro', 'Manaus', 'AM', '69010970', 'Parceiro', -3.128881, -60.023341, 'ABREE'),
  (150641, 'Ghm Tec Assessoria - Epson', 'R. Emilio Moreira', '289', 'Centro', 'Manaus', 'AM', '69020245', 'Parceiro', -3.130241, -60.015605, 'ABREE'),
  (149465, 'Bemol Manaus - Educandos', 'Av. Leopoldo Peres', '199', 'Centro', 'Manaus', 'AM', '69074355', 'Parceiro', -3.142804, -60.010420, 'ABREE'),
  (154773, 'Agência dos Correios Cachoeirinha', 'Avenida Silves', '363', 'Centro', 'Manaus', 'AM', '69065970', 'Parceiro', -3.128331, -60.006292, 'ABREE'),
  (143372, 'Colortel Comercio e Assessoria Tecnica LTDA', 'Rua Carmen Miranda', '1025', 'Cachoeirinha', 'Manaus', 'AM', '69065160', 'Assistência técnica', -3.130014, -60.004422, 'ABREE'),
  (149407, 'TV Lar - Manaus - Manaus Plaza Shopping', 'Av. Djalma Batista', '2100', 'Centro', 'Manaus', 'AM', '69050010', 'Parceiro', -3.110803, -60.023541, 'ABREE'),
  (152044, 'Inforjet Serv', 'Avenida Sete de Setembro', '71', 'Centro', 'Salvador', 'BA', '40020450', 'Parceiro', -12.978134, -38.514479, 'ABREE'),
  (154507, 'Luza Cosmeticos - Periperi - Filial', 'Rua Carlos Gomes', '43', 'Centro', 'Salvador', 'BA', '40727045', 'Parceiro', -12.978468, -38.515107, 'ABREE'),
  (148739, 'Casas Bahia Salvador - Baixa dos Sapateiros', 'Av. José Joaquim Seabra', '72', 'Centro', 'Salvador', 'BA', '40025001', 'Parceiro', -12.975590, -38.509676, 'ABREE'),
  (154788, 'Agência dos Correios Central Salvador', 'Praca da Inglaterra', '2', 'Centro', 'Salvador', 'BA', '40015970', 'Parceiro', -12.971000, -38.513000, 'ABREE'),
  (147983, 'Magazine Luiza - Filial 982', 'Avenida Sete de Setembro', '282', 'Dois de Julho', 'Salvador', 'BA', '40060001', 'Varejo', -12.980133, -38.514796, 'ABREE'),
  (153145, 'Luza Cosmeticos', 'Avenida Sete de Setembro', '470', 'Centro', 'Salvador', 'BA', '40020455', 'Parceiro', -12.981404, -38.514738, 'ABREE'),
  (152542, 'Rentmed - Locacao e Venda de Equip.', 'Avenida Estados Unidos', '528', 'Centro', 'Salvador', 'BA', '40010020', 'Parceiro', -12.968994, -38.510939, 'ABREE'),
  (155267, 'Agência dos Correios Central de Fortaleza', 'Rua Senador Alencar', '38', 'Centro', 'Fortaleza', 'CE', '60030970', 'Parceiro', -3.725477, -38.526241, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (151801, 'Mais Envios Mercado Central', 'Avenida Alberto Nepomuceno', '199', 'Centro', 'Fortaleza', 'CE', '60060182', 'Parceiro', -3.723482, -38.524113, 'ABREE'),
  (147620, 'Magazine Luiza - Filial 840', 'Rua General Sampaio', 'S/N', 'Centro', 'Fortaleza', 'CE', '60020030', 'Parceiro', -3.724780, -38.530212, 'ABREE'),
  (148751, 'Casas Bahia Fortaleza - Praça do Ferreira', 'Travessa Pará', '20', 'Centro', 'Fortaleza', 'CE', '60025120', 'Parceiro', -3.726723, -38.527400, 'ABREE'),
  (151796, 'Mais Envios Sao Jose', 'Rua Governador Sampaio', '83', 'Centro', 'Fortaleza', 'CE', '60055050', 'Parceiro', -3.726035, -38.524514, 'ABREE'),
  (145394, 'Magazine Luiza - Filial 740', 'Rua Senador Pompeu', '1012', 'Centro', 'Fortaleza', 'CE', '60025000', 'Varejo', -3.727495, -38.529965, 'ABREE'),
  (144000, 'Loja Vivo', 'Rua Barao do Rio Branco', '1197', 'Centro', 'Fortaleza', 'CE', '60025060', 'Varejo', -3.728817, -38.528823, 'ABREE'),
  (162507, 'Locker Est Galeria dos Estados', 'Scs Quadra 1', 'S/N', 'Centro', 'Brasília', 'DF', '70301989', 'Parceiro', -15.799112, -47.885735, 'ABREE'),
  (164102, 'Locker Caixa Cultural', 'Sbs Quadra 4', 'BLOCO A', 'Centro', 'Brasília', 'DF', '70070989', 'Parceiro', -15.803866, -47.884294, 'ABREE'),
  (162504, 'Locker Estacao Central DF', 'Sdn', '0', 'Centro', 'Brasília', 'DF', '70077989', 'Parceiro', -15.793735, -47.883467, 'ABREE'),
  (145095, 'Loja Vivo Patio Brasil Shopping', 'Setor Scs Quadra 7 Bloco a', 'S/N', 'Asa Sul', 'Brasília', 'DF', '70307902', 'Varejo', -15.797235, -47.889058, 'ABREE'),
  (148329, 'Loja TIM - Brasilia', 'St Sdn Conjunto a', 'S/N', 'Asa Norte', 'Brasília', 'DF', '70077900', 'Varejo', -15.792224, -47.883563, 'ABREE'),
  (161917, 'Agência Franqueada dos Correios Scs', 'Scs Quadra 6 Bloco a Loja 246', '0', 'Centro', 'Brasília', 'DF', '70306970', 'Parceiro', -15.796079, -47.890492, 'ABREE'),
  (145740, 'Magazine Luiza - Filial 1531', 'Sdn Lote Unico', 'S/N', 'Asa Norte', 'Brasília', 'DF', '70077900', 'Varejo', -15.797515, -47.891887, 'ABREE'),
  (155526, 'Agência dos Correios Central de Vitoria', 'Avenida Jeronimo Monteiro', '310', 'Centro', 'Vitória', 'ES', '29010970', 'Parceiro', -20.321007, -40.336642, 'ABREE'),
  (148815, 'Casas Bahia Vitória - Centro', 'Av. Jerônimo Monteiro', '173', 'Centro', 'Vitória', 'ES', '29010002', 'Parceiro', -20.321213, -40.337902, 'ABREE'),
  (161395, 'Agência Franqueada dos Correios Praca Getulio Vargas', 'Rua Engenheiro Pinto Pacca', '25', 'Centro', 'Vitória', 'ES', '29010973', 'Parceiro', -20.319391, -40.331845, 'ABREE'),
  (161399, 'Agência Franqueada dos Correios Parque Moscoso', 'Rua General Osorio', '147', 'Centro', 'Vitória', 'ES', '29018973', 'Parceiro', -20.318961, -40.340988, 'ABREE'),
  (161819, 'Agência Franqueada dos Correios Bairro Vila Rubim', 'Avenida Marcos de Azevedo', '212', 'Centro', 'Vitória', 'ES', '29025973', 'Parceiro', -20.319961, -40.344847, 'ABREE'),
  (145518, 'Michigan Service', 'Rua Professora Zilda Andrade', '195', 'De Lourdes', 'Vitória', 'ES', '29042751', 'Assistência técnica', -20.307199, -40.318045, 'ABREE'),
  (150213, 'Sams Club - Vitória', 'Av. Marechal Mascarenhas de Moraes', '1905', 'Centro', 'Vitória', 'ES', '29053245', 'Parceiro', -20.316990, -40.310842, 'ABREE'),
  (155621, 'Agência dos Correios Central de Goiania', 'Praca Dr Pedro Ludovico Teixeira', '11', 'Centro', 'Goiânia', 'GO', '74001970', 'Parceiro', -16.679577, -49.257684, 'ABREE'),
  (146061, 'Loja TIM Av Anhanguera GO', 'Av. Anhanguera', '4980', 'Setor Central', 'Goiânia', 'GO', '74040010', 'Varejo', -16.674514, -49.257396, 'ABREE'),
  (148786, 'Casas Bahia Goiânia - Anhanguera', 'Av. Anhanguera', '4603', 'Centro', 'Goiânia', 'GO', '74043011', 'Parceiro', -16.673998, -49.253931, 'ABREE'),
  (161319, 'Agência Franqueada dos Correios Praca do Bandeirante', 'Rua 4', '811', 'Centro', 'Goiânia', 'GO', '74025970', 'Parceiro', -16.674023, -49.259890, 'ABREE'),
  (145401, 'Magazine Luiza - Filial 1029', 'Avenida Anhanguera', '4495', 'Setor Central', 'Goiânia', 'GO', '74043011', 'Varejo', -16.673975, -49.253119, 'ABREE'),
  (153912, 'Exclusiva Utilidades Setor Sul', 'Av 85', '467', 'Centro', 'Goiânia', 'GO', '74080010', 'Parceiro', -16.686261, -49.259390, 'ABREE'),
  (161251, 'Agência Franqueada dos Correios 84', 'Rua 84', '552', 'Centro', 'Goiânia', 'GO', '74080970', 'Parceiro', -16.687048, -49.254473, 'ABREE'),
  (149414, 'Casas Bahia - São Luís Centro', 'Av. Oswaldo Cruz', '301', 'Centro', 'São Luís', 'MA', '65020250', 'Parceiro', -2.530477, -44.300823, 'ABREE'),
  (145500, 'Magazine Luiza - Filial 1334', 'Rua da Paz', 'S/N', 'Centro', 'São Luís', 'MA', '65020450', 'Varejo', -2.530638, -44.298884, 'ABREE'),
  (155837, 'Agência dos Correios Central de Sao Luis', 'Rua Sao Pantaleao', '997', 'Centro', 'São Luís', 'MA', '65015972', 'Parceiro', -2.528101, -44.307001, 'ABREE'),
  (147244, 'Mateus Supermercados - Super Cajazeiras', 'Avenida Guaxenduba', '288', 'Centro', 'São Luís', 'MA', '65010000', 'Parceiro', -2.535947, -44.301443, 'ABREE'),
  (145590, 'Parque Bom Menino', 'Av. Alexandre de Moura', 'S/N', 'Centro', 'São Luís', 'MA', '65025470', 'Parceiro', -2.533719, -44.293369, 'ABREE'),
  (145591, 'Parque Rangedor', 'Rua das Palmeiras', '2', 'Jardim Renascenca', 'São Luís', 'MA', '65075300', 'Parceiro', -2.510480, -44.296599, 'ABREE'),
  (155931, 'Agência dos Correios Joao Paulo', 'Avenida Joao Pessoa', '211', 'Centro', 'São Luís', 'MA', '65041970', 'Parceiro', -2.539241, -44.291301, 'ABREE'),
  (144663, 'Loja Vivo', 'Avenida Colares Moreira', '22', 'Renascenca', 'São Luís', 'MA', '65075441', 'Varejo', -2.506680, -44.295983, 'ABREE'),
  (143399, 'Magazine Luiza - Filial 1187', 'Avenida Pernambuco', '241', 'Centro', 'Cuiabá', 'MT', '78055560', 'Varejo', -15.595414, -56.092582, 'ABREE'),
  (149351, 'Lojas Americanas - Cuiabá - Centro Norte', 'R. Joaquim Murtinho', '196', 'Centro', 'Cuiabá', 'MT', '78005290', 'Parceiro', -15.597769, -56.097093, 'ABREE'),
  (153822, 'Bom Reparo', 'Rua Baltazar Navarros', '173', 'Centro', 'Cuiabá', 'MT', '78010020', 'Parceiro', -15.598731, -56.090770, 'ABREE'),
  (161329, 'Agência Franqueada dos Correios Cuiaba', 'Av Historiador Rubens de Mendonca', '352', 'Centro', 'Cuiabá', 'MT', '78008973', 'Parceiro', -15.600001, -56.097601, 'ABREE'),
  (149347, 'Pantanal Shopping - Cuiabá', 'Av. Historiador Rubens de Mendonça', '3300', 'Centro', 'Cuiabá', 'MT', '78020250', 'Parceiro', -15.601882, -56.097280, 'ABREE'),
  (143425, 'Ecodescarte', 'Rua Miranda Reis', '151', 'Pocao', 'Cuiabá', 'MT', '78015640', 'Parceiro', -15.603629, -56.092709, 'ABREE'),
  (161326, 'Agência Franqueada dos Correios Barao de Melgaco', 'Rua Barao de Melgaco', '2754', 'Centro', 'Cuiabá', 'MT', '78020973', 'Parceiro', -15.601061, -56.100899, 'ABREE'),
  (143400, 'Magazine Luiza - Filial 1186', 'Avenida Fernando Correa', 'S/N', 'Centro', 'Cuiabá', 'MT', '78065000', 'Varejo', -15.585359, -56.093936, 'ABREE'),
  (143129, 'Magazine Luiza - Filial 80', 'Rua Barao do Rio Branco', '1046', 'Centro', 'Campo Grande', 'MS', '79002170', 'Varejo', -20.463179, -54.618599, 'ABREE'),
  (149047, 'Casas Bahia Campo Grande - Centro', 'R. 14 de Julho', '2376', 'Centro', 'Campo Grande', 'MS', '79002336', 'Parceiro', -20.463246, -54.617592, 'ABREE'),
  (146063, 'Loja TIM Campo Grande', 'Rua Quatorze de Julho', '1909', 'Vila Cidade', 'Campo Grande', 'MS', '79002331', 'Varejo', -20.463784, -54.617241, 'ABREE'),
  (156849, 'Agência dos Correios Central de Campo Grande', 'Avenida Calogeras', '2309', 'Centro', 'Campo Grande', 'MS', '79002970', 'Parceiro', -20.461930, -54.619932, 'ABREE'),
  (143130, 'Magazine Luiza - Filial 453', 'Rua Dom Aquino', '1259', 'Centro', 'Campo Grande', 'MS', '79002185', 'Varejo', -20.461336, -54.619049, 'ABREE'),
  (147787, 'Magazine Luiza - Filial 82', 'Rua Treze de Maio', '2538', 'Sao Francisco', 'Campo Grande', 'MS', '79002351', 'Varejo', -20.462667, -54.615793, 'ABREE'),
  (156910, 'Agência dos Correios Estacao Rodoviaria', 'Rua Vasconcelos Fernandes', '226', 'Centro', 'Campo Grande', 'MS', '79008970', 'Parceiro', -20.462802, -54.623273, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (161616, 'Agência Franqueada dos Correios Estacao Central', 'Avenida dos Andradas', '471', 'Centro', 'Belo Horizonte', 'MG', '30120970', 'Parceiro', -19.918212, -43.934613, 'ABREE'),
  (147560, 'Xi Informatica e Papelaria', 'Rua dos Carijos', '136', 'Centro', 'Belo Horizonte', 'MG', '30120060', 'Parceiro', -19.919471, -43.936703, 'ABREE'),
  (148755, 'Casas Bahia Belo Horizonte - Hipercentro', 'R. dos Tupinambás', '346', 'Centro', 'Belo Horizonte', 'MG', '30120070', 'Parceiro', -19.917949, -43.937510, 'ABREE'),
  (156227, 'Agência dos Correios Aarao Reis', 'Rua Rio de Janeiro', '234', 'Centro', 'Belo Horizonte', 'MG', '30161970', 'Parceiro', -19.916234, -43.938164, 'ABREE'),
  (143710, 'Loja Vivo', 'Avenida Afonso Pena', '785', 'Centro', 'Belo Horizonte', 'MG', '30130002', 'Varejo', -19.920021, -43.937702, 'ABREE'),
  (150628, 'Tecnosys - Epson', 'Av. Francisco Sales', '494', 'Centro', 'Belo Horizonte', 'MG', '30150220', 'Parceiro', -19.919694, -43.929787, 'ABREE'),
  (157085, 'Agência dos Correios Central de Belem', 'Avenida Presidente Vargas', '498', 'Centro', 'Belém', 'PA', '66017970', 'Parceiro', -1.451533, -48.496679, 'ABREE'),
  (143707, 'Loja Vivo', 'Avenida Presidente Vargas', '552', 'Campina', 'Belém', 'PA', '66017000', 'Varejo', -1.451958, -48.496514, 'ABREE'),
  (149600, 'Casas Bahia - Belém - XV de Novembro', 'R. Quinze de Novembro', '138', 'Centro', 'Belém', 'PA', '66013060', 'Parceiro', -1.452689, -48.502370, 'ABREE'),
  (145458, 'Magazine Luiza - Filial 1284', 'Rua Quinze de Novembro', '64', 'Campina', 'Belém', 'PA', '66013060', 'Varejo', -1.453034, -48.502891, 'ABREE'),
  (148353, 'Loja TIM - Belem', 'Travessa Padre Eutiquio', '1078', 'Batista Campos', 'Belém', 'PA', '66023710', 'Varejo', -1.457618, -48.494725, 'ABREE'),
  (152178, 'Tech Fuzion Informatica', 'Travessa Padre Eutiquio', '1760', 'Centro', 'Belém', 'PA', '66033590', 'Parceiro', -1.457641, -48.494495, 'ABREE'),
  (148354, 'Loja TIM - Belem', 'Avenida Visconde de Souza Franco', '776', 'Reduto', 'Belém', 'PA', '66053000', 'Varejo', -1.446649, -48.490372, 'ABREE'),
  (147473, 'Magazine Luiza - Filial 762', 'Rua Aristides Lobo', '54', 'Centro', 'João Pessoa', 'PB', '58010320', 'Parceiro', -7.119225, -34.885908, 'ABREE'),
  (151586, 'Center Informatica', 'Avenida General Osorio', '200', 'Centro', 'João Pessoa', 'PB', '58010780', 'Parceiro', -7.118281, -34.884656, 'ABREE'),
  (162309, 'Agência Franqueada dos Correios Rodoviaria Joao Pessoa', 'Rua Francisco Londres', 'S/N', 'Centro', 'João Pessoa', 'PB', '58010973', 'Parceiro', -7.119195, -34.891090, 'ABREE'),
  (162318, 'Agência Franqueada dos Correios Ponto de Cem Reis', 'Rua Duque de Caxias', '137', 'Centro', 'João Pessoa', 'PB', '58010974', 'Parceiro', -7.116787, -34.883542, 'ABREE'),
  (143569, 'Magazine Luiza - Filial 703', 'Rua Treze de Maio', '127', 'Centro', 'João Pessoa', 'PB', '58013070', 'Varejo', -7.117758, -34.881775, 'ABREE'),
  (149401, 'Casas Bahia - João Pessoa - Centro 2', 'R. Eliseu César', '69', 'Centro', 'João Pessoa', 'PB', '58013100', 'Parceiro', -7.117957, -34.881383, 'ABREE'),
  (157984, 'Agência dos Correios Marechal Deodoro', 'Rua Marechal Deodoro', '298', 'Centro', 'Curitiba', 'PR', '80011970', 'Parceiro', -25.431431, -49.269461, 'ABREE'),
  (148724, 'Casas Bahia Curitiba - Marechal Deodoro', 'R. Marechal Deodoro', '327', 'Centro', 'Curitiba', 'PR', '80020320', 'Parceiro', -25.431072, -49.269196, 'ABREE'),
  (165028, 'Loja TIM CTBA PR', 'Rua XV de Novembro', '525', 'Centro', 'Curitiba', 'PR', '80020310', 'Parceiro', -25.429975, -49.268960, 'ABREE'),
  (148729, 'Casas Bahia Curitiba - Centro 2', 'R. Marechal Deodoro', '113', 'Centro', 'Curitiba', 'PR', '80020320', 'Parceiro', -25.431852, -49.271182, 'ABREE'),
  (143932, 'Loja Vivo', 'Avenida Marechal Deodoro', '60', 'Centro', 'Curitiba', 'PR', '80010010', 'Varejo', -25.432471, -49.271609, 'ABREE'),
  (143933, 'Loja Vivo', 'Rua XV de Novembro', '168', 'Centro', 'Curitiba', 'PR', '80020310', 'Varejo', -25.431513, -49.272146, 'ABREE'),
  (157423, 'Agência dos Correios Central de Recife', 'Avenida Guararapes', '250', 'Centro', 'Recife', 'PE', '50010970', 'Parceiro', -8.062272, -34.880143, 'ABREE'),
  (145168, 'Loja Vivo Shopping Boa Vista', 'Rua Jose de Alencar', '105', 'Boa Vista', 'Recife', 'PE', '50070075', 'Varejo', -8.063644, -34.881507, 'ABREE'),
  (145413, 'Magazine Luiza - Filial 708', 'Rua da Concordia', '188', 'Santo Antonio', 'Recife', 'PE', '50010520', 'Varejo', -8.065434, -34.881564, 'ABREE'),
  (150651, 'Lojas Império - Rua da Palma', 'R. da Concórdia', '233', 'Centro', 'Recife', 'PE', '50010520', 'Parceiro', -8.065939, -34.881405, 'ABREE'),
  (161960, 'Agência Franqueada dos Correios Boa Vista', 'Rua do Riachuelo', '325', 'Centro', 'Recife', 'PE', '50050971', 'Parceiro', -8.060427, -34.881289, 'ABREE'),
  (161818, 'Agência Franqueada dos Correios Bairro de Sao Jose', 'Rua Vinte e Quatro de Maio', '59', 'Centro', 'Recife', 'PE', '50020970', 'Parceiro', -8.066526, -34.880760, 'ABREE'),
  (149267, 'Lojas Americanas Recife - Floriano Peixoto', 'R. Floriano Peixoto', '113', 'Centro', 'Recife', 'PE', '50020060', 'Parceiro', -8.065423, -34.882242, 'ABREE'),
  (157627, 'Agência dos Correios Central de Teresina', 'Avenida Antonino Freire', '1407', 'Centro', 'Teresina', 'PI', '64001970', 'Parceiro', -5.090581, -42.812353, 'ABREE'),
  (149409, 'Casas Bahia - Teresina - Centro 1', 'R. Alvaro Mendes', '1173', 'Centro', 'Teresina', 'PI', '64000060', 'Parceiro', -5.090937, -42.814481, 'ABREE'),
  (144754, 'Loja Vivo', 'Rua Barroso', '47', 'Centro', 'Teresina', 'PI', '64001130', 'Varejo', -5.092238, -42.813880, 'ABREE'),
  (161910, 'Agência Franqueada dos Correios Cidade de Teresina', 'Rua Barroso', '151', 'Centro', 'Teresina', 'PI', '64001971', 'Parceiro', -5.091676, -42.814352, 'ABREE'),
  (147488, 'Magazine Luiza - Filial 861', 'Rua Paissandu', '1190', 'Centro', 'Teresina', 'PI', '64001120', 'Parceiro', -5.092817, -42.813553, 'ABREE'),
  (161915, 'Agência Franqueada dos Correios Centro', 'Rua Alvaro Mendes', '2108', 'Centro', 'Teresina', 'PI', '64000973', 'Parceiro', -5.087544, -42.815089, 'ABREE'),
  (146143, 'Loja TIM Centro Rio Branco', 'Av. Rio Branco', '122', 'Centro', 'Rio de Janeiro', 'RJ', '20040001', 'Varejo', -22.904764, -43.178099, 'ABREE'),
  (151172, '18 Cargas - Centro', 'Av Rio Branco', '133', 'Centro', 'Rio de Janeiro', 'RJ', '20040006', 'Parceiro', -22.904495, -43.177889, 'ABREE'),
  (150122, 'Casas Bahia - Rio de Janeiro - Rua Uruguaiana', 'R. Uruguaiana', '5', 'Centro', 'Rio de Janeiro', 'RJ', '20050093', 'Parceiro', -22.906272, -43.179070, 'ABREE'),
  (144543, 'Loja Vivo', 'Avenida Rio Branco', '156', 'Centro', 'Rio de Janeiro', 'RJ', '20040003', 'Varejo', -22.906833, -43.177223, 'ABREE'),
  (149175, 'Lojas Americanas Rio de Janeiro - Centro', 'R. do Ouvidor', '175', 'Centro', 'Rio de Janeiro', 'RJ', '20040031', 'Parceiro', -22.904730, -43.179923, 'ABREE'),
  (161738, 'Agência Franqueada dos Correios Perrone', 'Rua do Ouvidor', '60', 'Centro', 'Rio de Janeiro', 'RJ', '20040970', 'Parceiro', -22.902673, -43.176542, 'ABREE'),
  (158339, 'Agência dos Correios Central de Natal', 'Av Engenheiro Hildebrando de Gois', '221', 'Centro', 'Natal', 'RN', '59010970', 'Parceiro', -5.774473, -35.204506, 'ABREE'),
  (158362, 'Agência dos Correios Cidade Alta', 'Avenida Rio Branco', '538', 'Centro', 'Natal', 'RN', '59025970', 'Parceiro', -5.785006, -35.206497, 'ABREE'),
  (149396, 'Casas Bahia - Natal - Cidade Alta', 'Av. Rio Branco', '683', 'Centro', 'Natal', 'RN', '59025003', 'Parceiro', -5.787273, -35.207141, 'ABREE'),
  (145368, 'Loja Wine Natal', 'Avenida Afonso Pena', '688', 'Tirol', 'Natal', 'RN', '59020100', 'Varejo', -5.790220, -35.198405, 'ABREE'),
  (165493, 'BR Postal', 'Rua Ceara Mirim', '673', 'Tirol', 'Natal', 'RN', '59020240', 'Parceiro', -5.795092, -35.200205, 'ABREE'),
  (158347, 'Agência dos Correios Princesa Isabel', 'Avenida Hermes da Fonseca', '1160', 'Centro', 'Natal', 'RN', '59020970', 'Parceiro', -5.798212, -35.199965, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (161846, 'Agência Franqueada dos Correios Rua da Praia', 'Rua dos Andradas', '1001', 'Centro', 'Porto Alegre', 'RS', '90020971', 'Parceiro', -30.030697, -51.231853, 'ABREE'),
  (158511, 'Agência dos Correios Central de Porto Alegre', 'Rua Siqueira Campos', '1100', 'Centro', 'Porto Alegre', 'RS', '90001970', 'Parceiro', -30.028097, -51.230451, 'ABREE'),
  (144485, 'Loja Vivo', 'Rua Uruguai', '292', 'Centro', 'Porto Alegre', 'RS', '90010140', 'Varejo', -30.029332, -51.228499, 'ABREE'),
  (146204, 'Loja TIM Rua da Praia', 'Rua dos Andradas', '1415', 'Centro Historico', 'Porto Alegre', 'RS', '90020011', 'Varejo', -30.030041, -51.227417, 'ABREE'),
  (161938, 'Agência Franqueada dos Correios Andradas', 'Rua dos Andradas', '1444', 'Centro', 'Porto Alegre', 'RS', '90020970', 'Parceiro', -30.029716, -51.227029, 'ABREE'),
  (146067, 'Loja TIM Porto Velho', 'Av. Prefeito Chiquilito Erse', '3288', 'Flodoaldo Pontes Pinto', 'Porto Velho', 'RO', '76820408', 'Varejo', -8.754479, -63.912854, 'ABREE'),
  (161436, 'Agência Franqueada dos Correios Dom Pedro Segundo', 'Rua Dom Pedro II', '3000', 'Centro', 'Porto Velho', 'RO', '76820970', 'Parceiro', -8.762586, -63.903895, 'ABREE'),
  (160133, 'Agência dos Correios Shopping Cidadao', 'Avenida Sete de Setembro', '830', 'Centro', 'Porto Velho', 'RO', '76801975', 'Parceiro', -8.764657, -63.902342, 'ABREE'),
  (149710, 'Bemol Farma - Porto Velho', 'R. Marechal Deodoro', '2275', 'Centro', 'Porto Velho', 'RO', '76801098', 'Parceiro', -8.761995, -63.899603, 'ABREE'),
  (144493, 'Loja Vivo', 'Avenida Sete de Setembro', '1160', 'Centro', 'Porto Velho', 'RO', '76801097', 'Varejo', -8.764334, -63.899580, 'ABREE'),
  (157041, 'Agência dos Correios Central de Porto Velho', 'Avenida Presidente Dutra', '2701', 'Centro', 'Porto Velho', 'RO', '76801974', 'Parceiro', -8.748338, -63.909432, 'ABREE'),
  (144492, 'Loja Vivo', 'Rua Getulio Vargas', '1941', 'Nossa Senhora das Gracas', 'Porto Velho', 'RO', '76804097', 'Varejo', -8.762419, -63.895217, 'ABREE'),
  (160852, 'Agência dos Correios Boa Vista', 'Praca Centro Civico', '112', 'Centro', 'Boa Vista', 'RR', '69301970', 'Parceiro', 2.821140, -60.670850, 'ABREE'),
  (146123, 'Loja TIM Boa Vista', 'Rua Coronel Pinto', '802', 'Centro', 'Boa Vista', 'RR', '69301150', 'Varejo', 2.823585, -60.673088, 'ABREE'),
  (143727, 'Loja Vivo', 'Avenida Sebastiao Diniz', '676', 'Centro', 'Boa Vista', 'RR', '69301040', 'Varejo', 2.818981, -60.668037, 'ABREE'),
  (143728, 'Loja Vivo', 'Rua Presidente Costa e Silva', '941', 'Sao Francisco', 'Boa Vista', 'RR', '69305115', 'Varejo', 2.829937, -60.674108, 'ABREE'),
  (143726, 'Loja Vivo', 'Avenida Capitao Julio Bezerra', '957', 'Sao Francisco', 'Boa Vista', 'RR', '69305025', 'Varejo', 2.830623, -60.670828, 'ABREE'),
  (150303, 'Atatec - Epson', 'V das Flores', '792', 'Centro', 'Boa Vista', 'RR', '69309393', 'Parceiro', 2.820423, -60.704008, 'ABREE'),
  (153185, 'Unidade Jadlog Boa Vista 02', 'Av Mario Homem de Melo', '4126', 'Centro', 'Boa Vista', 'RR', '69309198', 'Parceiro', 2.823532, -60.710848, 'ABREE'),
  (148393, 'Loja TIM - Florianopolis', 'Rua Felipe Schmidt', '447', 'Centro', 'Florianópolis', 'SC', '88010001', 'Varejo', -27.595397, -48.554116, 'ABREE'),
  (161478, 'Agência Franqueada dos Correios Avenida Rio Branco', 'Avenida Rio Branco', '380', 'Centro', 'Florianópolis', 'SC', '88015974', 'Parceiro', -27.591941, -48.554528, 'ABREE'),
  (161482, 'Agência Franqueada dos Correios Rua Alvaro de Carvalho', 'Rua Alvaro de Carvalho', '290', 'Centro', 'Florianópolis', 'SC', '88010975', 'Parceiro', -27.595175, -48.552774, 'ABREE'),
  (149141, 'Supermercados Angeloni Florianópolis - Centro', 'R. Esteves Júnior', '307', 'Centro', 'Florianópolis', 'SC', '88015130', 'Parceiro', -27.592141, -48.553186, 'ABREE'),
  (148743, 'Casas Bahia Florianópolis', 'R. Conselheiro Mafra', '28', 'Centro', 'Florianópolis', 'SC', '88010100', 'Parceiro', -27.597253, -48.552021, 'ABREE'),
  (143485, 'Magazine Luiza - Filial 375', 'Rua Felipe Schmidt', '162', 'Centro', 'Florianópolis', 'SC', '88010000', 'Varejo', -27.596746, -48.551487, 'ABREE'),
  (145349, 'Loja Vivo Top Center Shopping', 'Avenida Paulista', '854', 'Bela Vista', 'São Paulo', 'SP', '01310100', 'Varejo', -23.565806, -46.650801, 'ABREE'),
  (146161, 'Loja TIM Avenida Paulista', 'Avenida Paulista', '771', 'Bela Vista', 'São Paulo', 'SP', '01311100', 'Varejo', -23.566677, -46.650564, 'ABREE'),
  (162041, 'Agência Franqueada dos Correios Brigadeiro Luis Antonio', 'Av Brigadeiro Luis Antonio', '2375', 'Centro', 'São Paulo', 'SP', '01401970', 'Parceiro', -23.568342, -46.649601, 'ABREE'),
  (145196, 'Loja Vivo Shopping Cidade Sao Paulo', 'Avenida Paulista', '1230', 'Bela Vista', 'São Paulo', 'SP', '01310100', 'Varejo', -23.564101, -46.652803, 'ABREE'),
  (148922, 'Fast Shop - Shopping Cidade São Paulo', 'Av. Paulista', '1230', 'Centro', 'São Paulo', 'SP', '01310100', 'Parceiro', -23.563645, -46.652883, 'ABREE'),
  (152198, 'Zoom Copias e Comunicacao Visual', 'Avenida Paulista', '1159', 'Centro', 'São Paulo', 'SP', '01311200', 'Parceiro', -23.563894, -46.653465, 'ABREE'),
  (148895, 'Green Eletron - Fiesp', 'Av. Paulista', '1313', 'Centro', 'São Paulo', 'SP', '01311923', 'Parceiro', -23.564012, -46.654215, 'ABREE'),
  (161943, 'Agência Franqueada dos Correios Cerqueira Cesar', 'Rua Pamplona', '710', 'Centro', 'São Paulo', 'SP', '01405971', 'Parceiro', -23.564200, -46.654431, 'ABREE'),
  (159156, 'Agência dos Correios Central de Sergipe', 'Rua Laranjeiras', '229', 'Centro', 'Aracaju', 'SE', '49010970', 'Parceiro', -10.911725, -37.050237, 'ABREE'),
  (149387, 'Casas Bahia - Aracaju - Centro 1', 'R. São Cristóvao', '231', 'Centro', 'Aracaju', 'SE', '49010380', 'Parceiro', -10.910781, -37.050223, 'ABREE'),
  (143638, 'Loja Vivo', 'Rua Joao Pessoa', '293', 'Centro', 'Aracaju', 'SE', '49010130', 'Varejo', -10.909919, -37.049270, 'ABREE'),
  (143040, 'Magazine Luiza - Filial 744', 'Rua Joao Pessoa', '320', 'Centro', 'Aracaju', 'SE', '49010130', 'Varejo', -10.909791, -37.048881, 'ABREE'),
  (146219, 'Sema Aracaju', 'R. Santa Luzia', '926', 'Centro', 'Aracaju', 'SE', '49015190', 'Parceiro', -10.916092, -37.051604, 'ABREE'),
  (149605, 'Casas Bahia - Palmas - JK', 'Av. Juscelino Kubitschek', '123', 'Centro', 'Palmas', 'TO', '77006014', 'Parceiro', -10.184464, -48.331357, 'ABREE'),
  (144375, 'Loja Vivo', 'Avenida NS-2', '104', 'Centro', 'Palmas', 'TO', '77020030', 'Varejo', -10.186258, -48.327126, 'ABREE'),
  (150027, 'Sociedade de Ensino Serra do Carmo (fasec)', 'Q 103 Norte R. de Pedestre 3', 'S/N', 'Plano Diretor Norte', 'Palmas', 'TO', '77001018', 'Parceiro', -10.182639, -48.339467, 'ABREE'),
  (160787, 'Agência dos Correios JK', 'Quadra Acse 1 Avenida JK', 'S/N', 'Centro', 'Palmas', 'TO', '77020970', 'Parceiro', -10.184990, -48.325623, 'ABREE'),
  (160718, 'Agência dos Correios Palmas', 'Av Joaquim Teotonio Segurado', 'S/N', 'Centro', 'Palmas', 'TO', '77001970', 'Parceiro', -10.176670, -48.334410, 'ABREE'),
  (144916, 'Loja Vivo Capim Dourado Shopping', 'Avenida Juscelino Kubitschek', '5', 'Plano Diretor Norte', 'Palmas', 'TO', '77001098', 'Varejo', -10.184071, -48.321185, 'ABREE'),
  (148544, 'Casas Bahia Campinas - Alvares Machado', 'R. Álvares Machado', '681', 'Centro', 'Campinas', 'SP', '13013071', 'Parceiro', -22.908123, -47.061913, 'ABREE'),
  (159382, 'Agência dos Correios Campinas', 'Avenida Francisco Glicerio', '889', 'Centro', 'Campinas', 'SP', '13012970', 'Parceiro', -22.906767, -47.058826, 'ABREE'),
  (148538, 'Casas Bahia Ribeirão Preto', 'R. Duque de Caxias', '761', 'Centro', 'Ribeirão Preto', 'SP', '14015020', 'Parceiro', -21.175546, -47.807055, 'ABREE'),
  (144531, 'Loja Vivo', 'Rua Tibirica', '539', 'Centro', 'Ribeirão Preto', 'SP', '14010090', 'Varejo', -21.176375, -47.809850, 'ABREE'),
  (146925, 'Magazine Luiza - Filial 54', 'Rua General Osorio', '484', 'Centro', 'Ribeirão Preto', 'SP', '14010000', 'Varejo', -21.175233, -47.809313, 'ABREE'),
  (143164, 'Carrefour Uberlandia', 'Avenida Joao Naves de Avila', '1441', 'Santa Monica', 'Uberlândia', 'MG', '38405140', 'Varejo', -18.911965, -48.259527, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (155993, 'Agência dos Correios Center Shopping', 'Avenida Joao Naves de Avila', '1331', 'Centro', 'Uberlândia', 'MG', '38408975', 'Parceiro', -18.909228, -48.261254, 'ABREE'),
  (146085, 'Loja TIM Halfed Juiz de Fora MG', 'Rua Halfeld', '698', 'Centro', 'Juiz de Fora', 'MG', '36010003', 'Varejo', -21.760911, -43.348175, 'ABREE'),
  (149861, 'Casas Bahia - Juiz de Fora Centro', 'R. Halfeld', '639', 'Centro', 'Juiz de Fora', 'MG', '36010002', 'Parceiro', -21.760943, -43.347522, 'ABREE'),
  (149420, 'Ponto Frio - Juiz de Fora Centro', 'R. Halfeld', '747', 'Centro', 'Juiz de Fora', 'MG', '36010003', 'Parceiro', -21.761428, -43.348493, 'ABREE'),
  (149384, 'Casas Bahia - Montes Claros - Centro 2', 'R. Dom Pedro II', '390', 'Centro', 'Montes Claros', 'MG', '39400058', 'Parceiro', -16.725296, -43.865328, 'ABREE'),
  (161505, 'Agência Franqueada dos Correios Doutor Veloso', 'Rua Doutor Veloso', '544', 'Centro', 'Montes Claros', 'MG', '39400971', 'Parceiro', -16.724409, -43.866945, 'ABREE'),
  (157817, 'Agência dos Correios Londrina', 'Rua Maestro Egidio Camargo do Amaral', '246', 'Centro', 'Londrina', 'PR', '86001970', 'Parceiro', -23.313202, -51.158596, 'ABREE'),
  (144236, 'Loja Vivo', 'Avenida Parana', '203', 'Centro', 'Londrina', 'PR', '86010390', 'Varejo', -23.310548, -51.161991, 'ABREE'),
  (143856, 'Loja Vivo', 'Avenida Brasil', '6565', 'Centro', 'Cascavel', 'PR', '85801000', 'Varejo', -24.955630, -53.461170, 'ABREE'),
  (157779, 'Agência dos Correios Cascavel', 'Rua Souza Naves', '3613', 'Centro', 'Cascavel', 'PR', '85806970', 'Parceiro', -24.957182, -53.458543, 'ABREE'),
  (143574, 'Magazine Luiza - Filial 465', 'Rua Quinze de Novembro', '350', 'Centro', 'Joinville', 'SC', '89201600', 'Varejo', -26.304376, -48.846374, 'ABREE'),
  (161467, 'Agência Franqueada dos Correios Jacob Richlin', 'Rua Jacob Richlin', '173', 'Centro', 'Joinville', 'SC', '89201974', 'Parceiro', -26.303683, -48.847342, 'ABREE'),
  (158956, 'Agência dos Correios Chapeco', 'Praca Coronel Bertaso', '154', 'Centro', 'Chapecó', 'SC', '89801970', 'Parceiro', -27.103841, -52.613622, 'ABREE'),
  (143880, 'Loja Vivo', 'Avenida Getulio Dorneles Vargas', '538', 'Centro', 'Chapecó', 'SC', '89802002', 'Varejo', -27.099989, -52.615348, 'ABREE'),
  (145383, 'Magazine Luiza - Filial 402', 'Rua Sinimbu', '1536', 'Centro', 'Caxias do Sul', 'RS', '95098020', 'Varejo', -29.169050, -51.176799, 'ABREE'),
  (143869, 'Loja Vivo', 'Avenida Julio de Castilhos', '1914', 'Centro', 'Caxias do Sul', 'RS', '95010002', 'Varejo', -29.168327, -51.180966, 'ABREE'),
  (144592, 'Loja Vivo', 'Calcadao Salvador Isaia', '1257', 'Centro', 'Santa Maria', 'RS', '97015004', 'Varejo', -29.686495, -53.807714, 'ABREE'),
  (143161, 'Carrefour Santa Maria', 'Avenida Rio Branco', '732', 'Centro', 'Santa Maria', 'RS', '97010422', 'Varejo', -29.683741, -53.806943, 'ABREE'),
  (161415, 'Agência Franqueada dos Correios Kalilandia', 'Rua Boticario Moncorvo', '483', 'Centro', 'Feira de Santana', 'BA', '44001974', 'Parceiro', -12.253435, -38.959547, 'ABREE'),
  (151978, 'Multi Tech Informatica', 'Rua Intendente Abdon', '807', 'Centro', 'Feira de Santana', 'BA', '44050024', 'Parceiro', -12.243202, -38.957374, 'ABREE'),
  (161384, 'Agência Franqueada dos Correios Poco Escuro', 'Avenida Centenario', '74', 'Centro', 'Vitória da Conquista', 'BA', '45000971', 'Parceiro', -14.849959, -40.843610, 'ABREE'),
  (149381, 'Casas Bahia - Vitória da Conquista - Centro 2', 'Av. Lauro de Freitas', '108', 'Centro', 'Vitória da Conquista', 'BA', '45000230', 'Parceiro', -14.853131, -40.840681, 'ABREE'),
  (154816, 'Agência dos Correios Barreiras', 'Rua 24 de Outubro', '234', 'Centro', 'Barreiras', 'BA', '47800970', 'Parceiro', -12.147778, -45.000139, 'ABREE'),
  (145311, 'Loja Vivo Shopping Tambia', 'Rua Professora Guiomar Porto', '423', 'Centro', 'Barreiras', 'BA', '47800124', 'Varejo', -12.147045, -44.995173, 'ABREE'),
  (148327, 'Loja TIM - Juazeiro do Norte', 'Rua Sao Pedro', '733', 'Centro', 'Juazeiro do Norte', 'CE', '63010010', 'Varejo', -7.205593, -39.317756, 'ABREE'),
  (149622, 'Casas Bahia - Juazeiro do Norte', 'R. São Pedro', '379', 'Centro', 'Juazeiro do Norte', 'CE', '63010010', 'Parceiro', -7.202602, -39.317260, 'ABREE'),
  (143107, 'Magazine Luiza - Filial 717', 'Rua Presidente Joao Pessoa', '112', 'Centro', 'Campina Grande', 'PB', '58400002', 'Varejo', -7.217285, -35.886920, 'ABREE'),
  (149565, 'Casas Bahia - Campina Grande - Centro 1', 'R. Presidente João Pessoa', '145', 'Centro', 'Campina Grande', 'PB', '58400002', 'Parceiro', -7.217487, -35.886866, 'ABREE'),
  (143852, 'Loja Vivo', 'Rua Capitao Joao Velho', '70', 'Nossa Senhora das Dores', 'Caruaru', 'PE', '55002400', 'Varejo', -8.284947, -35.968259, 'ABREE'),
  (157464, 'Agência dos Correios Caruaru', 'Rua Martins Junior', '12', 'Centro', 'Caruaru', 'PE', '55002970', 'Parceiro', -8.286093, -35.968352, 'ABREE'),
  (144958, 'Loja Vivo Galeria Eco Center', 'Avenida Souza Filho', '516', 'Centro', 'Petrolina', 'PE', '56304000', 'Varejo', -9.399460, -40.502356, 'ABREE'),
  (161961, 'Agência Franqueada dos Correios Rua Coronel Amorim', 'Rua Coronel Amorim', '49', 'Centro', 'Petrolina', 'PE', '56302972', 'Parceiro', -9.397347, -40.501834, 'ABREE'),
  (158387, 'Agência dos Correios Mossoro', 'Praca Rafael Fernandes', '8', 'Centro', 'Mossoró', 'RN', '59600970', 'Parceiro', -5.194848, -37.340903, 'ABREE'),
  (144322, 'Loja Vivo', 'Rua Tiradentes', '1', 'Centro', 'Mossoró', 'RN', '59600210', 'Varejo', -5.191911, -37.342389, 'ABREE'),
  (155967, 'Agência dos Correios Imperatriz', 'Avenida Dorgival Pinheiro de Sousa', '45', 'Centro', 'Imperatriz', 'MA', '65900970', 'Parceiro', -5.529194, -47.484170, 'ABREE'),
  (144083, 'Loja Vivo', 'Avenida Bernardo Sayao', '1406', 'Nova Imperatriz', 'Imperatriz', 'MA', '65907000', 'Varejo', -5.518658, -47.486466, 'ABREE'),
  (145486, 'Magazine Luiza - Filial 864', 'Praca da Graca', '298', 'Centro', 'Parnaíba', 'PI', '64200305', 'Varejo', -2.903034, -41.779523, 'ABREE'),
  (144409, 'Loja Vivo', 'Rua Pires Ferreira', '497', 'Centro', 'Parnaíba', 'PI', '64200300', 'Varejo', -2.903770, -41.778553, 'ABREE'),
  (154625, 'Agência dos Correios Arapiraca', 'Praca Luiz Pereira Lima', 'S/N', 'Centro', 'Arapiraca', 'AL', '57300970', 'Parceiro', -9.753722, -36.660472, 'ABREE'),
  (143650, 'Loja Vivo', 'Praca Deputado Marques da Silva', '41', 'Centro', 'Arapiraca', 'AL', '57300330', 'Varejo', -9.751597, -36.660093, 'ABREE'),
  (144602, 'Loja Vivo', 'Rua Lameira Bittencourt', '340', 'Centro', 'Santarém', 'PA', '68005015', 'Varejo', -2.416670, -54.713438, 'ABREE'),
  (157143, 'Agência dos Correios Santarem', 'Praca da Bandeira', '81', 'Centro', 'Santarém', 'PA', '68005970', 'Parceiro', -2.418361, -54.716132, 'ABREE'),
  (161792, 'Agência dos Correios Itacaiunas', 'Avenida Antonio Vilhena', '630', 'Centro', 'Marabá', 'PA', '68501973', 'Parceiro', -5.380031, -49.135322, 'ABREE'),
  (145479, 'Magazine Luiza - Filial 1312', 'Avenida Nagib Mutran', '142', 'Cidade Nova', 'Marabá', 'PA', '68501570', 'Varejo', -5.369313, -49.127572, 'ABREE'),
  (151300, 'Petshoppyng', 'Rua Cruzeiro do Sul', 'S/N', 'Centro', 'Anápolis', 'GO', '75104390', 'Parceiro', -16.356474, -48.925058, 'ABREE'),
  (145666, 'Magazine Luiza - Filial 1129', 'Avenida Amazonas', '1132', 'Centro', 'Rondonópolis', 'MT', '78700050', 'Varejo', -16.469331, -54.628474, 'ABREE'),
  (149927, 'Casas Bahia - Rondonópolis - Centro 1', 'Av. Marechal Rondon', '1124', 'Centro', 'Rondonópolis', 'MT', '78710129', 'Parceiro', -16.470837, -54.627790, 'ABREE'),
  (156960, 'Agência dos Correios Sinop', 'Avenida das Embaubas', '567', 'Centro', 'Sinop', 'MT', '78550970', 'Parceiro', -11.859595, -55.500944, 'ABREE'),
  (144717, 'Loja Vivo', 'Avenida Governador Julio Campos', '623', 'Centro', 'Sinop', 'MT', '78550228', 'Varejo', -11.856457, -55.502722, 'ABREE'),
  (143958, 'Loja Vivo', 'Rua Firmino Vieira de Matos', '610', 'Jardim America', 'Dourados', 'MS', '79804010', 'Varejo', -22.227226, -54.814277, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (143418, 'Magazine Luiza - Filial 141', 'Avenida Marcelino Pires', '1666', 'Centro', 'Dourados', 'MS', '79801002', 'Varejo', -22.227621, -54.812676, 'ABREE'),
  (157046, 'Agência dos Correios Ji Parana', 'Avenida Marechal Rondon', '721', 'Centro', 'Ji-Paraná', 'RO', '76900970', 'Parceiro', -10.880591, -61.947481, 'ABREE'),
  (144187, 'Loja Vivo', 'Avenida Brasil', '1175', 'Nova Brasilia', 'Ji-Paraná', 'RO', '76908449', 'Varejo', -10.887097, -61.919725, 'ABREE'),
  (161260, 'Agência Franqueada dos Correios Sao Joao', 'Rua Prefeito Joao de Souza Lima', '517', 'Centro', 'Araguaína', 'TO', '77807971', 'Parceiro', -7.188731, -48.213201, 'ABREE'),
  (160685, 'Agência dos Correios Araguaina', 'Rua Ademar Vicente Ferreira', '1314', 'Centro', 'Araguaína', 'TO', '77804970', 'Parceiro', -7.190224, -48.209798, 'ABREE'),
  (143926, 'Loja Vivo', 'Avenida Rodrigues Alves', '423', 'Centro', 'Cruzeiro do Sul', 'AC', '69980000', 'Varejo', -7.632631, -72.666206, 'ABREE'),
  (160474, 'Agência dos Correios Cruzeiro do Sul', 'Rua Rego Barros', '73', 'Centro', 'Cruzeiro do Sul', 'AC', '69980970', 'Parceiro', -7.635186, -72.666736, 'ABREE'),
  (149417, 'TV Lar - Parintins - Centro', 'Av. João Melo', '171', 'Centro', 'Parintins', 'AM', '69151020', 'Parceiro', -2.626023, -56.736117, 'ABREE'),
  (144408, 'Loja Vivo', 'Avenida Amazonas', '2211', 'Centro', 'Parintins', 'AM', '69151000', 'Varejo', -2.627142, -56.736666, 'ABREE'),
  (154754, 'Agência dos Correios Tefe', 'Estrada do Aeroporto', '697', 'Centro', 'Tefé', 'AM', '69550970', 'Parceiro', -3.348079, -64.710007, 'ABREE'),
  (160387, 'Agência dos Correios Oiapoque', 'Avenida Barao do Rio Branco', '261', 'Centro', 'Oiapoque', 'AP', '68980970', 'Parceiro', 3.844320, -51.834920, 'ABREE'),
  (143585, 'Magazine Luiza - Filial 776', 'Praca Silvio Romero', '40', 'Centro', 'Lagarto', 'SE', '49400000', 'Varejo', -10.916761, -37.669364, 'ABREE'),
  (144208, 'Loja Vivo', 'Praca Doutor Filomeno Hora', '71', 'Centro', 'Lagarto', 'SE', '49400000', 'Varejo', -10.916716, -37.671503, 'ABREE'),
  (144229, 'Loja Vivo', 'Avenida Comendador Rafael', '1251', 'Centro', 'Linhares', 'ES', '29900053', 'Varejo', -19.400182, -40.065675, 'ABREE'),
  (144227, 'Loja Vivo', 'Avenida Nogueira da Gama', '1058', 'Centro', 'Linhares', 'ES', '29900042', 'Varejo', -19.401093, -40.064792, 'ABREE'),
  (143613, 'Loja Vivo', 'Travessa Coronel Tancredo', '500', 'Centro', 'Altamira', 'PA', '68371203', 'Varejo', -3.204708, -52.211994, 'ABREE'),
  (154724, 'Agência dos Correios Sao Gabriel da Cachoeira', 'Avenida 31 de Marco', '635', 'Centro', 'São Gabriel da Cachoeira', 'AM', '69750970', 'Parceiro', -0.133678, -67.087465, 'ABREE'),
  (144117, 'Loja Vivo', 'Travessa Treze de Maio', '196', 'Bela Vista', 'Itaituba', 'PA', '68180635', 'Varejo', -4.273264, -55.982115, 'ABREE'),
  (154771, 'Agência dos Correios Tabatinga', 'Avenida da Amizade', '1086', 'Centro', 'Tabatinga', 'AM', '69640970', 'Parceiro', -4.231845, -69.936632, 'ABREE'),
  (160472, 'Agência dos Correios Feijo', 'Avenida Placido de Castro', '871', 'Centro', 'Feijó', 'AC', '69960970', 'Parceiro', -8.164728, -70.354523, 'ABREE'),
  (147367, 'Magazine Luiza - Filial 852', 'Rua Marechal Floriano Peixoto', '347', 'Centro', 'Bom Jesus da Lapa', 'BA', '47600000', 'Parceiro', -13.252123, -43.417230, 'ABREE'),
  (147490, 'Magazine Luiza - Filial 881', 'Praca Coronel Borges', '694', 'Centro', 'Floriano', 'PI', '64800044', 'Parceiro', -6.769245, -43.020704, 'ABREE'),
  (155299, 'Agência dos Correios Crateus', 'Praca Joao Melo Cavalcante', '478', 'Centro', 'Crateús', 'CE', '63700970', 'Parceiro', -5.175991, -40.668084, 'ABREE'),
  (147491, 'Magazine Luiza - Filial 1220', 'Praca Felix Pacheco', '632', 'Centro', 'Picos', 'PI', '64600082', 'Parceiro', -7.082015, -41.468558, 'ABREE'),
  (149523, 'Lojas Americanas - Patos - Centro', 'R. Leôncio Wanderley', 'S/N', 'Centro', 'Patos', 'PB', '58700120', 'Parceiro', -7.029826, -37.278494, 'ABREE'),
  (158355, 'Agência dos Correios Caico', 'Rua Coronel Gorgonio', '357', 'Centro', 'Caicó', 'RN', '59300970', 'Parceiro', -6.459494, -37.096284, 'ABREE'),
  (145455, 'Magazine Luiza - Filial 1213', 'Rua Magalhaes de Almeida', '99', 'Centro', 'Bacabal', 'MA', '65700000', 'Varejo', -4.231878, -44.779538, 'ABREE'),
  (143774, 'Loja Vivo', 'Rua Padre Cassemiro', '635', 'Centro', 'Cáceres', 'MT', '78200000', 'Varejo', -16.070469, -57.685846, 'ABREE'),
  (151555, 'Amarelinho Copias', 'Rua Costa e Silva', '254', 'Centro', 'Vilhena', 'RO', '76980146', 'Parceiro', -12.739978, -60.144521, 'ABREE'),
  (157044, 'Agência dos Correios Guajara Mirim', 'Avenida Presidente Dutra', '576', 'Centro', 'Guajará-Mirim', 'RO', '76850970', 'Parceiro', -10.797631, -65.340965, 'ABREE'),
  (147469, 'Magazine Luiza - Filial 1383', 'Avenida Mario Curica', '75', 'Centro', 'Breves', 'PA', '68800000', 'Parceiro', -1.686569, -50.485557, 'ABREE'),
  (160393, 'Agência dos Correios Laranjal do Jari', 'Avenida Tancredo Neves', '2795', 'Centro', 'Laranjal do Jari', 'AP', '68920970', 'Parceiro', -0.849370, -52.530750, 'ABREE'),
  (160854, 'Agência dos Correios Caracarai', 'Avenida Doutor Zanny', '1825', 'Centro', 'Caracaraí', 'RR', '69360970', 'Parceiro', 1.819405, -61.127501, 'ABREE'),
  (154747, 'Agência dos Correios Coari', 'Rua Cinco de Setembro', '323', 'Centro', 'Coari', 'AM', '69460970', 'Parceiro', -4.086107, -63.142236, 'ABREE'),
  (143912, 'Loja Vivo', 'Rua Frei Mariano', '214', 'Centro', 'Corumbá', 'MS', '79300002', 'Varejo', -18.999909, -57.653093, 'ABREE');
INSERT INTO tmp_ponto VALUES
  (NULL, 'Ecoponto Municipal de Chaves (fictício)', 'Rua Principal', '100', 'Centro', 'Chaves', 'PA', '68880000', 'Ecoponto público', -0.113100, -49.855600, 'FICTICIO'),
  (NULL, 'Escola Estadual de Chaves - Coletor CircuitoVerde (fictício)', 'Avenida da Escola', '250', 'Centro', 'Chaves', 'PA', '68880000', 'Escola parceira', -0.116400, -49.853200, 'FICTICIO'),
  (NULL, 'Unidade Básica de Saúde de Chaves - Coletor de Pilhas (fictício)', 'Rua da Saúde', '45', 'Centro', 'Chaves', 'PA', '68880000', 'Órgão público', -0.113500, -49.852300, 'FICTICIO'),
  (NULL, 'Ecoponto Municipal de Guaribas (fictício)', 'Rua Principal', '100', 'Centro', 'Guaribas', 'PI', '64798000', 'Ecoponto público', -9.393400, -43.688200, 'FICTICIO'),
  (NULL, 'Escola Estadual de Guaribas - Coletor CircuitoVerde (fictício)', 'Avenida da Escola', '250', 'Centro', 'Guaribas', 'PI', '64798000', 'Escola parceira', -9.396700, -43.685800, 'FICTICIO'),
  (NULL, 'Unidade Básica de Saúde de Guaribas - Coletor de Pilhas (fictício)', 'Rua da Saúde', '45', 'Centro', 'Guaribas', 'PI', '64798000', 'Órgão público', -9.393800, -43.684900, 'FICTICIO'),
  (NULL, 'Ecoponto Municipal de Uiramutã (fictício)', 'Rua Principal', '100', 'Centro', 'Uiramutã', 'RR', '69358000', 'Ecoponto público', 4.596600, -60.162900, 'FICTICIO'),
  (NULL, 'Escola Estadual de Uiramutã - Coletor CircuitoVerde (fictício)', 'Avenida da Escola', '250', 'Centro', 'Uiramutã', 'RR', '69358000', 'Escola parceira', 4.593300, -60.160500, 'FICTICIO'),
  (NULL, 'Unidade Básica de Saúde de Uiramutã - Coletor de Pilhas (fictício)', 'Rua da Saúde', '45', 'Centro', 'Uiramutã', 'RR', '69358000', 'Órgão público', 4.596200, -60.159600, 'FICTICIO');

-- Insere endereço e ponto um a um com um cursor (precisa do id do endereço gerado)
DROP PROCEDURE IF EXISTS sp_carregar_pontos;
DELIMITER $$
CREATE PROCEDURE sp_carregar_pontos()
BEGIN
  DECLARE fim BOOLEAN DEFAULT FALSE;
  DECLARE v_ext INT; DECLARE v_nome VARCHAR(120); DECLARE v_log VARCHAR(150); DECLARE v_num VARCHAR(10);
  DECLARE v_bai VARCHAR(80); DECLARE v_cid VARCHAR(80); DECLARE v_uf CHAR(2); DECLARE v_cep CHAR(8);
  DECLARE v_canal VARCHAR(40); DECLARE v_lat DECIMAL(9,6); DECLARE v_lng DECIMAL(9,6); DECLARE v_origem VARCHAR(10);
  DECLARE c CURSOR FOR SELECT * FROM tmp_ponto;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fim = TRUE;
  OPEN c;
  laco: LOOP
    FETCH c INTO v_ext, v_nome, v_log, v_num, v_bai, v_cid, v_uf, v_cep, v_canal, v_lat, v_lng, v_origem;
    IF fim THEN LEAVE laco; END IF;
    IF EXISTS (SELECT 1 FROM ponto_coleta WHERE origem = v_origem
                AND (id_externo = v_ext OR (v_ext IS NULL AND nome = v_nome))) THEN
      ITERATE laco;  -- já carregado (pode rodar o script de novo sem duplicar)
    END IF;
    INSERT INTO endereco (logradouro, numero, bairro, cidade, uf, cep, latitude, longitude)
    VALUES (v_log, v_num, v_bai, v_cid, v_uf, v_cep, v_lat, v_lng);
    INSERT INTO ponto_coleta (nome, id_endereco, canal, origem, id_externo)
    VALUES (v_nome, LAST_INSERT_ID(), v_canal, v_origem, v_ext);
    -- Todos foram encontrados buscando por celular: aceitam TELEFONIA.
    INSERT INTO ponto_coleta_categoria (id_ponto, categoria) VALUES (LAST_INSERT_ID(), 'TELEFONIA');
    IF v_origem = 'FICTICIO' THEN
      INSERT INTO ponto_coleta_categoria (id_ponto, categoria)
      SELECT p.id_ponto, x.cat FROM ponto_coleta p
      JOIN (SELECT 'INFORMATICA' cat UNION ALL SELECT 'PILHAS_BATERIAS') x
      WHERE p.id_ponto = (SELECT MAX(id_ponto) FROM ponto_coleta);
    END IF;
  END LOOP;
  CLOSE c;
END$$
DELIMITER ;

CALL sp_carregar_pontos();
DROP PROCEDURE sp_carregar_pontos;
DROP TEMPORARY TABLE tmp_ponto;

COMMIT;

-- Conferência
SELECT origem, COUNT(*) AS pontos, COUNT(DISTINCT e.uf) AS estados, COUNT(DISTINCT e.cidade) AS cidades
  FROM ponto_coleta p JOIN endereco e ON e.id_endereco = p.id_endereco GROUP BY origem;
