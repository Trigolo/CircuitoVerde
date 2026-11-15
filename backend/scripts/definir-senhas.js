// Define a senha "123456" para todos os usuários de teste (gera o hash bcrypt de verdade).
// Uso: npm run senhas
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  try {
    const hash = await bcrypt.hash('123456', 10);
    // Não mexe nas contas com nome de usuário (ex.: Gustavo, senha Gustavo, criado no sql/11)
    let r;
    try { [r] = await pool.query('UPDATE usuario SET senha_hash = ? WHERE id_usuario > 0 AND login IS NULL', [hash]); }
    catch (e) { if (e.code !== 'ER_BAD_FIELD_ERROR') throw e; [r] = await pool.query('UPDATE usuario SET senha_hash = ? WHERE id_usuario > 0', [hash]); }
    console.log(`Senha "123456" definida para ${r.affectedRows} usuário(s).`);
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
})();
