// Envolve rotas async para que erros cheguem ao middleware de erros
const rota = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Busca o id do gerador/reciclador/transportador ligado ao usuário logado
async function idDoAtor(conn, tabela, idUsuario) {
  const colunas = { gerador: 'id_gerador', reciclador: 'id_reciclador', transportador: 'id_transportador' };
  const col = colunas[tabela];
  const [[linha]] = await conn.query(`SELECT ${col} AS id FROM ${tabela} WHERE id_usuario = ?`, [idUsuario]);
  return linha ? linha.id : null;
}

// Limite simples de tentativas em memória (por IP): protege login e cadastro contra força bruta.
// Ex.: limitar({ max: 5, janelaMin: 15 }) -> 5 tentativas a cada 15 minutos; só as falhas contam se usar req.falhou().
function limitar({ max, janelaMin, chave = (req) => req.ip }) {
  const tentativas = new Map();   // chave -> [horários]
  return (req, res, next) => {
    const agora = Date.now(), janela = janelaMin * 60 * 1000, k = chave(req);
    const lista = (tentativas.get(k) || []).filter((t) => agora - t < janela);
    if (lista.length >= max) {
      const espera = Math.ceil((janela - (agora - lista[0])) / 60000);
      return res.status(429).json({ erro: `Muitas tentativas. Tente de novo em ${espera} min.` });
    }
    tentativas.set(k, lista);
    req.falhou = () => { lista.push(agora); tentativas.set(k, lista); };
    req.limparTentativas = () => tentativas.delete(k);
    next();
  };
}

module.exports = { rota, idDoAtor, limitar };
