// UC01 - Autenticação
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { rota, limitar } = require('../util');
const { autenticar } = require('../middlewares/auth');

// POST /api/auth/login  { "email": "...", "senha": "..." }
// Bloqueia o IP depois de 5 senhas erradas em 15 minutos
const limiteLogin = limitar({ max: 5, janelaMin: 15 });

function gerarToken(u) {
  return jwt.sign({ id_usuario: u.id_usuario, nome: u.nome, perfil: u.perfil }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// POST /api/auth/login  { "usuario": "Gustavo" ou "email@...", "senha": "...", "perfil": "ADMIN" }
// Entra pelo nome de usuário (coluna login) ou pelo e-mail. O mesmo nome pode ter vários perfis:
// nesse caso o perfil escolhido na tela decide qual conta abre.
const PERFIS = ['GERADOR', 'TRANSPORTADOR', 'RECICLADOR', 'ADMIN', 'AUDITOR'];
router.post('/login', limiteLogin, rota(async (req, res) => {
  const usuario = String(req.body.usuario || req.body.email || '').trim();
  const { senha } = req.body;
  const perfil = PERFIS.includes(req.body.perfil) ? req.body.perfil : null;
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });

  const filtroPerfil = perfil ? ' AND perfil = ?' : '';
  const params = perfil ? [perfil] : [];
  let contas;
  try {
    [contas] = await pool.query(
      `SELECT id_usuario, nome, email, senha_hash, perfil FROM usuario
        WHERE (email = ? OR LOWER(login) = LOWER(?)) AND ativo = TRUE${filtroPerfil}`, [usuario, usuario, ...params]);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;   // banco sem a coluna login (script 11 não rodado): só e-mail
    [contas] = await pool.query(
      `SELECT id_usuario, nome, email, senha_hash, perfil FROM usuario WHERE email = ? AND ativo = TRUE${filtroPerfil}`, [usuario, ...params]);
  }

  // confere a senha em cada conta encontrada (o mesmo nome pode ter vários perfis)
  const validas = [];
  for (const c of contas) if (await bcrypt.compare(String(senha), c.senha_hash)) validas.push(c);
  if (!validas.length) {
    req.falhou();
    return res.status(401).json({ erro: perfil ? 'Usuário, senha ou perfil incorretos.' : 'Usuário ou senha incorretos.' });
  }
  if (validas.length > 1) {
    return res.status(400).json({ erro: 'Escolha o perfil para entrar.', perfis: validas.map((c) => c.perfil) });
  }
  const u = validas[0];
  req.limparTentativas();
  res.json({ token: gerarToken(u), usuario: { id: u.id_usuario, nome: u.nome, email: u.email, perfil: u.perfil } });
}));

// POST /api/auth/cadastro -> cria a conta e já entra. Perfis que a pessoa pode escolher:
//   GERADOR       { tipo: 'PF'|'PJ', documento, telefone?, endereco }
//   TRANSPORTADOR { tipo: 'PF'|'PJ', documento, placa }                 (sem endereço)
//   RECICLADOR    { documento (CNPJ), licenca, capacidade, endereco }    (sempre empresa)
// Comum a todos: { perfil, nome, email, senha }. ADMIN e AUDITOR não se cadastram pelo site.
// Tudo é gravado numa TRANSAÇÃO: ou entra tudo, ou nada.
const limiteCadastro = limitar({ max: 10, janelaMin: 60 });
const soNumeros = (v) => String(v || '').replace(/\D/g, '');
const PERFIS_CADASTRO = ['GERADOR', 'TRANSPORTADOR', 'RECICLADOR'];

router.post('/cadastro', limiteCadastro, rota(async (req, res) => {
  req.falhou();   // toda tentativa de cadastro conta no limite (no máximo 10 por hora por IP)
  const b = req.body || {};
  const e = b.endereco || {};
  const perfil = PERFIS_CADASTRO.includes(b.perfil) ? b.perfil : 'GERADOR';
  const nome = String(b.nome || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const tipo = perfil === 'RECICLADOR' ? 'PJ' : (b.tipo === 'PJ' ? 'PJ' : 'PF');
  const documento = soNumeros(b.documento);
  const cep = soNumeros(e.cep);
  const uf = String(e.uf || '').trim().toUpperCase();
  const placa = String(b.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const licenca = String(b.licenca || '').trim();
  const capacidade = Number(b.capacidade);
  const temEndereco = perfil !== 'TRANSPORTADOR';

  const faltando = [];
  if (nome.length < 3) faltando.push('nome');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) faltando.push('e-mail válido');
  if (String(b.senha || '').length < 8) faltando.push('senha com 8 caracteres ou mais');
  if (documento.length !== (tipo === 'PF' ? 11 : 14)) faltando.push(tipo === 'PF' ? 'CPF com 11 números' : 'CNPJ com 14 números');
  if (temEndereco) {
    if (cep.length !== 8) faltando.push('CEP com 8 números');
    if (!String(e.logradouro || '').trim() || !String(e.numero || '').trim() || !String(e.bairro || '').trim() || !String(e.cidade || '').trim()) faltando.push('endereço completo');
    if (!/^[A-Z]{2}$/.test(uf)) faltando.push('UF');
  }
  if (perfil === 'TRANSPORTADOR' && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) faltando.push('placa do veículo (ex.: ABC1D23)');
  if (perfil === 'RECICLADOR') {
    if (licenca.length < 3) faltando.push('licença ambiental');
    if (!(capacidade > 0)) faltando.push('capacidade em kg por mês');
  }
  if (faltando.length) { return res.status(400).json({ erro: 'Confira: ' + faltando.join(', ') + '.' }); }

  const [[jaEmail]] = await pool.query('SELECT 1 FROM usuario WHERE email = ?', [email]);
  if (jaEmail) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail. Use "Entrar".' });
  const tabelaDoc = { GERADOR: ['gerador', 'documento'], TRANSPORTADOR: ['transportador', 'documento'], RECICLADOR: ['reciclador', 'cnpj'] }[perfil];
  const [[jaDoc]] = await pool.query(`SELECT 1 FROM ${tabelaDoc[0]} WHERE ${tabelaDoc[1]} = ?`, [documento]);
  if (jaDoc) return res.status(409).json({ erro: `Este ${tipo === 'PF' ? 'CPF' : 'CNPJ'} já está cadastrado.` });

  const hash = await bcrypt.hash(String(b.senha), 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query('INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', [nome, email, hash, perfil]);
    let idEndereco = null;
    if (temEndereco) {
      const [end] = await conn.query(
        'INSERT INTO endereco (logradouro, numero, complemento, bairro, cidade, uf, cep) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [String(e.logradouro).trim(), String(e.numero).trim().slice(0, 10), e.complemento ? String(e.complemento).trim().slice(0, 60) : null,
          String(e.bairro).trim(), String(e.cidade).trim(), uf, cep]);
      idEndereco = end.insertId;
    }
    if (perfil === 'GERADOR') {
      await conn.query('INSERT INTO gerador (id_usuario, id_endereco, tipo, documento, telefone) VALUES (?, ?, ?, ?, ?)',
        [u.insertId, idEndereco, tipo, documento, soNumeros(b.telefone).slice(0, 15) || null]);
    } else if (perfil === 'TRANSPORTADOR') {
      await conn.query('INSERT INTO transportador (id_usuario, documento, placa_veiculo) VALUES (?, ?, ?)', [u.insertId, documento, placa]);
    } else {
      const [r] = await conn.query(
        'INSERT INTO reciclador (id_usuario, id_endereco, cnpj, licenca_ambiental, capacidade_kg_mes) VALUES (?, ?, ?, ?, ?)',
        [u.insertId, idEndereco, documento, licenca.slice(0, 40), Math.min(capacidade, 99999999)]);
      // Começa aceitando todos os materiais (pode ser ajustado depois no banco)
      await conn.query('INSERT INTO reciclador_material (id_reciclador, id_material) SELECT ?, id_material FROM material', [r.insertId]);
    }
    await conn.commit();
    const novo = { id_usuario: u.insertId, nome, perfil };
    res.status(201).json({ token: gerarToken(novo), usuario: { id: u.insertId, nome, email, perfil } });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// ---------- Perfil do usuário logado ----------
// GET /api/auth/perfil -> dados da conta e do papel (gerador, transportador ou reciclador)
router.get('/perfil', autenticar, rota(async (req, res) => {
  const { id_usuario, perfil } = req.usuario;
  const [[u]] = await pool.query('SELECT id_usuario, nome, email, login, perfil, criado_em FROM usuario WHERE id_usuario = ?', [id_usuario]);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  let papel = null;
  if (perfil === 'GERADOR') {
    [[papel]] = await pool.query(`SELECT g.tipo, g.documento, g.telefone, e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep
      FROM gerador g JOIN endereco e ON e.id_endereco = g.id_endereco WHERE g.id_usuario = ?`, [id_usuario]);
  } else if (perfil === 'TRANSPORTADOR') {
    [[papel]] = await pool.query('SELECT documento, placa_veiculo FROM transportador WHERE id_usuario = ?', [id_usuario]);
  } else if (perfil === 'RECICLADOR') {
    [[papel]] = await pool.query(`SELECT r.cnpj AS documento, r.licenca_ambiental, r.capacidade_kg_mes, e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep
      FROM reciclador r JOIN endereco e ON e.id_endereco = r.id_endereco WHERE r.id_usuario = ?`, [id_usuario]);
  }
  res.json({ ...u, papel: papel || null });
}));

// PUT /api/auth/perfil { nome, email, telefone?, placa?, licenca?, capacidade? } -> atualiza e devolve um token novo (o nome vai no token)
router.put('/perfil', autenticar, rota(async (req, res) => {
  const { id_usuario, perfil } = req.usuario;
  const b = req.body || {};
  const nome = String(b.nome || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const faltando = [];
  if (nome.length < 3) faltando.push('nome');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) faltando.push('e-mail válido');
  const placa = String(b.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (perfil === 'TRANSPORTADOR' && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) faltando.push('placa (ex.: ABC1D23)');
  const capacidade = Number(b.capacidade);
  if (perfil === 'RECICLADOR' && !(capacidade > 0)) faltando.push('capacidade em kg por mês');
  if (perfil === 'RECICLADOR' && String(b.licenca || '').trim().length < 3) faltando.push('licença ambiental');
  if (faltando.length) return res.status(400).json({ erro: 'Confira: ' + faltando.join(', ') + '.' });
  const [[outro]] = await pool.query('SELECT 1 FROM usuario WHERE email = ? AND id_usuario <> ?', [email, id_usuario]);
  if (outro) return res.status(409).json({ erro: 'Este e-mail já é usado por outra conta.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE usuario SET nome = ?, email = ? WHERE id_usuario = ?', [nome.slice(0, 120), email, id_usuario]);
    if (perfil === 'GERADOR') await conn.query('UPDATE gerador SET telefone = ? WHERE id_usuario = ?', [soNumeros(b.telefone).slice(0, 15) || null, id_usuario]);
    if (perfil === 'TRANSPORTADOR') await conn.query('UPDATE transportador SET placa_veiculo = ? WHERE id_usuario = ?', [placa, id_usuario]);
    if (perfil === 'RECICLADOR') {
      await conn.query('UPDATE reciclador SET licenca_ambiental = ?, capacidade_kg_mes = ? WHERE id_usuario = ?',
        [String(b.licenca).trim().slice(0, 40), Math.min(capacidade, 99999999), id_usuario]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  const atualizado = { id_usuario, nome, perfil };
  res.json({ token: gerarToken(atualizado), usuario: { id: id_usuario, nome, email, perfil }, mensagem: 'Dados atualizados.' });
}));

// PUT /api/auth/senha { atual, nova } -> troca a senha (confere a atual; 5 erros em 15 min bloqueiam)
const limiteSenha = limitar({ max: 5, janelaMin: 15, chave: (req) => 'senha:' + (req.usuario?.id_usuario || req.ip) });
router.put('/senha', autenticar, limiteSenha, rota(async (req, res) => {
  const { atual, nova } = req.body || {};
  if (String(nova || '').length < 8) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' });
  if (atual === nova) return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual.' });
  const [[u]] = await pool.query('SELECT senha_hash FROM usuario WHERE id_usuario = ?', [req.usuario.id_usuario]);
  if (!u || !(await bcrypt.compare(String(atual || ''), u.senha_hash))) {
    req.falhou();
    return res.status(400).json({ erro: 'A senha atual não confere.' });
  }
  await pool.query('UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?', [await bcrypt.hash(String(nova), 10), req.usuario.id_usuario]);
  req.limparTentativas();
  res.json({ mensagem: 'Senha alterada.' });
}));

// GET /api/auth/eu  -> dados do usuário logado
router.get('/eu', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
