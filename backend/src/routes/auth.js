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

// GET /api/auth/eu  -> dados do usuário logado
router.get('/eu', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
