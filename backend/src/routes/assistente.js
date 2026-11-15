// Assistente virtual (chatbot): Gemini quando houver chave no .env, bot por regras como reserva
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { rota } = require('../util');
const gemini = require('../assistente/gemini');
const regras = require('../assistente/regras');
const { APRESENTACAO, SUGESTOES } = require('../assistente/conhecimento');

// Login é opcional: se vier token válido, o assistente sabe quem é (ex.: rastrear os próprios itens)
function usuarioOpcional(req) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

// Limite simples por IP: protege a cota gratuita do Gemini
const acessos = new Map();
function limiteExcedido(ip) {
  const agora = Date.now();
  const lista = (acessos.get(ip) || []).filter((t) => agora - t < 60000);
  lista.push(agora);
  acessos.set(ip, lista);
  return lista.length > 15;
}

async function registrar(dados) {
  try {
    await pool.query(
      'INSERT INTO assistente_conversa (id_usuario, pergunta, motor, ferramentas, tempo_ms, sucesso) VALUES (?, ?, ?, ?, ?, ?)',
      [dados.id_usuario, dados.pergunta.slice(0, 500), dados.motor, dados.ferramentas.join(',').slice(0, 200) || null, dados.tempo_ms, dados.sucesso]);
  } catch { /* a tabela é opcional (script 08); sem ela o chat funciona igual */ }
}

// GET /api/assistente/status -> qual motor está ativo
router.get('/status', (req, res) => {
  res.json({ motor: gemini.ativo() ? 'gemini' : 'regras', modelo: gemini.ativo() ? gemini.modelo() : null, apresentacao: APRESENTACAO, sugestoes: SUGESTOES });
});

// POST /api/assistente  { mensagem, historico: [{papel, texto}], localizacao: {lat, lng} }
router.post('/', rota(async (req, res) => {
  const inicio = Date.now();
  const mensagem = String(req.body.mensagem || '').trim().slice(0, 500);
  if (!mensagem) return res.status(400).json({ erro: 'Escreva uma pergunta.' });
  if (limiteExcedido(req.ip)) return res.status(429).json({ erro: 'Muitas perguntas em pouco tempo. Aguarde um minuto.' });

  const historico = (Array.isArray(req.body.historico) ? req.body.historico : [])
    .filter((h) => h && typeof h.texto === 'string' && ['usuario', 'assistente'].includes(h.papel))
    .slice(-10).map((h) => ({ papel: h.papel, texto: h.texto.slice(0, 1500) }));
  const loc = req.body.localizacao;
  const ctx = {
    usuario: usuarioOpcional(req),
    localizacao: loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng)) ? { lat: Number(loc.lat), lng: Number(loc.lng) } : null,
  };

  let saida, motor = 'regras', aviso = null;
  if (gemini.ativo()) {
    try {
      saida = await gemini.responder(mensagem, historico, ctx);
      motor = 'gemini';
    } catch (err) {
      console.warn('[assistente] Gemini indisponível, usando regras:', err.message);
      aviso = err.status === 429 ? 'Limite gratuito da IA atingido; respondendo no modo automático.'
        : err.status === 400 || err.status === 403 ? 'Chave da IA inválida; respondendo no modo automático.'
        : 'IA indisponível no momento; respondendo no modo automático.';
    }
  }
  if (!saida) saida = await regras.responder(mensagem, ctx);

  const tempo = Date.now() - inicio;
  registrar({ id_usuario: ctx.usuario?.id_usuario || null, pergunta: mensagem, motor, ferramentas: saida.ferramentas || [], tempo_ms: tempo, sucesso: true });
  res.json({ resposta: saida.resposta, motor, modelo: saida.modelo || null, ferramentas: saida.ferramentas || [], sugestoes: saida.sugestoes || null, aviso, tempo_ms: tempo });
}));

module.exports = router;
