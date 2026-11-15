// Ponto de entrada da API CircuitoVerde
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const tratarErros = require('./middlewares/erros');

// Confere o .env antes de subir: sem estas variáveis a API não funciona direito
const faltando = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].filter((v) => !process.env[v]);
if (faltando.length) {
  console.error(`Faltam variáveis no arquivo .env: ${faltando.join(', ')}. Copie o .env.example e preencha.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) console.warn('Aviso: JWT_SECRET muito curto. Use uma frase longa e aleatória no .env.');

const app = express();
app.disable('x-powered-by');                 // não anuncia que é Express
if (process.env.TRUST_PROXY) app.set('trust proxy', 1); // na nuvem (Render): pega o IP real do visitante para o limite de tentativas
app.use((req, res, next) => {                // cabeçalhos básicos de segurança
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(cors());                             // libera o acesso do frontend
app.use(express.json({ limit: '100kb' }));   // lê o corpo em JSON (com limite de tamanho)

// Entrega o frontend (site) em http://localhost:3000
app.use(express.static(path.join(__dirname, '..', '..', 'circuitoverde-frontend')));

// Verificação rápida: a API está no ar e conversa com o banco?
app.get('/api/saude', async (req, res, next) => {
  try {
    const [[r]] = await pool.query('SELECT DATABASE() AS banco, NOW() AS agora');
    res.json({ api: 'ok', ...r });
  } catch (err) { next(err); }
});

app.use('/api/auth',        require('./routes/auth'));
app.use('/api',             require('./routes/catalogos'));
app.use('/api/itens',       require('./routes/itens'));
app.use('/api/logisticas',  require('./routes/logisticas'));
app.use('/api',             require('./routes/reciclagem'));
app.use('/api/indicadores', require('./routes/indicadores'));
app.use('/api/pontos',      require('./routes/pontos'));     // versão 2: geolocalização
app.use('/api',             require('./routes/impacto'));    // versão 2: panorama, calculadora, ranking, certificado
app.use('/api/assistente',  require('./routes/assistente')); // assistente virtual (Gemini + regras)

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(tratarErros);

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API CircuitoVerde rodando em http://localhost:${porta}`));
