// Autenticação (JWT) e autorização por perfil
const jwt = require('jsonwebtoken');

// Exige um token válido no cabeçalho: Authorization: Bearer <token>
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para acessar este recurso.' });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Permite o acesso só aos perfis informados. Ex.: permitir('RECICLADOR', 'ADMIN')
function permitir(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: `Acesso permitido apenas para: ${perfis.join(', ')}.` });
    }
    next();
  };
}

module.exports = { autenticar, permitir };
