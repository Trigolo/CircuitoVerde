// Traduz os erros do MySQL (constraints, triggers, procedures) em respostas HTTP claras
function tratarErros(err, req, res, next) {
  // SIGNAL SQLSTATE '45000' dos triggers e da procedure
  if (err.sqlState === '45000') {
    return res.status(400).json({ erro: err.sqlMessage });
  }
  switch (err.code) {
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return res.status(400).json({ erro: 'Dado inválido: ' + err.sqlMessage });
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ erro: 'Registro duplicado: ' + err.sqlMessage });
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({ erro: 'Referência inexistente (verifique os IDs enviados).' });
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_BAD_NULL_ERROR':
      return res.status(400).json({ erro: 'Dado inválido: ' + err.sqlMessage });
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
      console.error(err);
      return res.status(500).json({ erro: 'Não foi possível conectar ao banco. Confira o arquivo .env.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
}

module.exports = tratarErros;
