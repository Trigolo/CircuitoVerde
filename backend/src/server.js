// Ponto de entrada da API CircuitoVerde
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const tratarErros = require('./middlewares/erros');

const app = express();
app.use(cors());           // libera o acesso do frontend
app.use(express.json());   // lê o corpo das requisições em JSON

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

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(tratarErros);

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API CircuitoVerde rodando em http://localhost:${porta}`));
