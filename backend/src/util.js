// Envolve rotas async para que erros cheguem ao middleware de erros
const rota = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Busca o id do gerador/reciclador/transportador ligado ao usuário logado
async function idDoAtor(conn, tabela, idUsuario) {
  const colunas = { gerador: 'id_gerador', reciclador: 'id_reciclador', transportador: 'id_transportador' };
  const col = colunas[tabela];
  const [[linha]] = await conn.query(`SELECT ${col} AS id FROM ${tabela} WHERE id_usuario = ?`, [idUsuario]);
  return linha ? linha.id : null;
}

module.exports = { rota, idDoAtor };
