-- =====================================================================
-- CircuitoVerde | Script 08: assistente virtual (chatbot)
-- Registra as perguntas feitas ao assistente para medir o uso.
-- Rode DEPOIS do 07. Pode ser rodado de novo sem erro.
-- =====================================================================
SET NAMES utf8mb4;
USE circuitoverde;

CREATE TABLE IF NOT EXISTS assistente_conversa (
  id_conversa  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT NULL,                              -- NULL = visitante
  pergunta     VARCHAR(500) NOT NULL,
  motor        ENUM('gemini','regras') NOT NULL,     -- quem respondeu: IA ou bot por regras
  ferramentas  VARCHAR(200) NULL,                     -- consultas usadas, separadas por vírgula
  tempo_ms     INT NOT NULL,
  sucesso      BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_conversa_tempo CHECK (tempo_ms >= 0),
  CONSTRAINT fk_conversa_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE SET NULL,
  INDEX idx_conversa_data (criado_em)
);

-- Uso do assistente por dia e por motor
CREATE OR REPLACE VIEW vw_assistente_uso AS
SELECT DATE(criado_em)          AS dia,
       motor,
       COUNT(*)                 AS perguntas,
       COUNT(DISTINCT id_usuario) AS usuarios_logados,
       ROUND(AVG(tempo_ms))     AS tempo_medio_ms
  FROM assistente_conversa
 GROUP BY DATE(criado_em), motor;

-- Consultas ao banco mais pedidas pelo assistente
CREATE OR REPLACE VIEW vw_assistente_ferramentas AS
SELECT f.ferramenta, COUNT(*) AS vezes
  FROM assistente_conversa c
  JOIN JSON_TABLE(CONCAT('["', REPLACE(c.ferramentas, ',', '","'), '"]'),
                  '$[*]' COLUMNS (ferramenta VARCHAR(60) PATH '$')) f
 WHERE c.ferramentas IS NOT NULL
 GROUP BY f.ferramenta;

SELECT 'assistente_conversa criada' AS status;
