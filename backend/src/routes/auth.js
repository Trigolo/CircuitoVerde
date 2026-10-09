// UC01 - Autenticação
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { rota } = require('../util');
const { autenticar } = require('../middlewares/auth');

// POST /api/auth/login  { "email": "...", "senha": "..." }
router.post('/login', rota(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Informe email e senha.' });

  const [[u]] = await pool.query(
    'SELECT id_usuario, nome, email, senha_hash, perfil FROM usuario WHERE email = ? AND ativo = TRUE',
    [email]
  );
  if (!u || !(await bcrypt.compare(senha, u.senha_hash))) {
    return res.status(401).json({ erro: 'Email ou senha incorretos.' });
  }

  const token = jwt.sign(
    { id_usuario: u.id_usuario, nome: u.nome, perfil: u.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, usuario: { id: u.id_usuario, nome: u.nome, email: u.email, perfil: u.perfil } });
}));

// GET /api/auth/eu  -> dados do usuário logado
router.get('/eu', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
