// Testes automáticos da API CircuitoVerde (node:test, já vem com o Node 20; não precisa instalar nada)
// Rode com:  npm test
// Usam o banco do .env e as contas "Gustavo" (sql/11_usuario_gustavo.sql e 12_demo_reciclador.sql).
// Quase tudo é só leitura ou tentativa bloqueada. O que grava é desfeito no fim
// (nome do perfil volta, senha volta e o ponto de teste é desativado).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

// Segurança: não roda contra o banco da nuvem sem querer
if (/aivencloud|rds\.amazonaws|azure/i.test(process.env.DB_HOST || '') && process.env.TESTE_NA_NUVEM !== '1') {
  console.error('O .env aponta para um banco na nuvem. Os testes gravam alguns dados de teste.');
  console.error('Rode no banco local, ou use TESTE_NA_NUVEM=1 se tiver certeza.');
  process.exit(1);
}

const app = require('../src/server');
const pool = require('../src/db');
let servidor, base;
const tokens = {};

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}
const get = (c, o) => chamar('GET', c, o);

before(async () => {
  servidor = app.listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
  for (const perfil of ['GERADOR', 'TRANSPORTADOR', 'RECICLADOR', 'ADMIN', 'AUDITOR']) {
    const r = await chamar('POST', '/auth/login', { corpo: { usuario: 'Gustavo', senha: 'Gustavo', perfil } });
    assert.equal(r.status, 200, `login do Gustavo como ${perfil} falhou: ${r.dados.erro}`);
    tokens[perfil] = r.dados.token;
  }
});
after(async () => { servidor?.close(); await pool.end(); });

describe('1. API e banco', () => {
  test('a API responde e conversa com o banco', async () => {
    const r = await get('/saude');
    assert.equal(r.status, 200);
    assert.equal(r.dados.api, 'ok');
  });
  test('rota inexistente devolve 404 em JSON', async () => {
    assert.equal((await get('/nao-existe')).status, 404);
  });
  test('telas públicas funcionam sem login', async () => {
    for (const rota of ['/panorama', '/pontos/cidades', '/pontos/mapa', '/ranking', '/certificado-exemplo']) {
      assert.equal((await get(rota)).status, 200, rota);
    }
  });
});

describe('2. Login e cadastro', () => {
  test('senha errada é recusada (401)', async () => {
    const r = await chamar('POST', '/auth/login', { corpo: { usuario: 'Gustavo', senha: 'errada123', perfil: 'GERADOR' } });
    assert.equal(r.status, 401);
  });
  test('sem token não entra em rota protegida (401)', async () => {
    assert.equal((await get('/itens')).status, 401);
  });
  test('token falso é recusado (401)', async () => {
    assert.equal((await get('/itens', { token: 'abc.def.ghi' })).status, 401);
  });
  test('cadastro valida os campos (400) e não aceita perfil ADMIN', async () => {
    const r = await chamar('POST', '/auth/cadastro', { corpo: { perfil: 'ADMIN', nome: 'X', email: 'invalido', senha: '123' } });
    assert.equal(r.status, 400);
    assert.match(r.dados.erro, /nome|e-mail|senha/);
  });
  test('cadastro de transportador exige placa válida', async () => {
    const r = await chamar('POST', '/auth/cadastro', { corpo: { perfil: 'TRANSPORTADOR', nome: 'Teste', email: 't@t.com', senha: '12345678', tipo: 'PF', documento: '12345678901', placa: 'X' } });
    assert.equal(r.status, 400);
    assert.match(r.dados.erro, /placa/);
  });
});

describe('3. Permissões por perfil', () => {
  test('gerador não vê a lista de coletas (403)', async () => {
    assert.equal((await get('/logisticas', { token: tokens.GERADOR })).status, 403);
  });
  test('auditor lê itens mas não vê coletas para operar', async () => {
    assert.equal((await get('/itens', { token: tokens.AUDITOR })).status, 200);
    assert.equal((await get('/logisticas', { token: tokens.AUDITOR })).status, 403);
  });
  test('gerador só vê os próprios itens', async () => {
    const meus = (await get('/itens', { token: tokens.GERADOR })).dados;
    const todos = (await get('/itens', { token: tokens.ADMIN })).dados;
    assert.ok(meus.length < todos.length);
    assert.ok(meus.every((i) => i.gerador === 'Gustavo'));
  });
  test('transportador vê só as coletas dele e as livres', async () => {
    const lista = (await get('/logisticas', { token: tokens.TRANSPORTADOR })).dados;
    const todas = (await get('/logisticas', { token: tokens.ADMIN })).dados;
    assert.ok(lista.length < todas.length);
    assert.ok(lista.every((l) => l.id_transportador !== null || l.status === 'SOLICITADA'));
  });
  test('reciclador só vê coletas destinadas a ele', async () => {
    const lista = (await get('/logisticas', { token: tokens.RECICLADOR })).dados;
    assert.ok(lista.length > 0, 'rode o sql/12_demo_reciclador.sql');
    assert.ok(lista.every((l) => l.reciclador === 'Gustavo'));
  });
  test('relatórios e auditoria: admin e auditor sim, gerador não', async () => {
    for (const rota of ['/relatorios', '/auditoria']) {
      assert.equal((await get(rota, { token: tokens.ADMIN })).status, 200, rota);
      assert.equal((await get(rota, { token: tokens.AUDITOR })).status, 200, rota);
      assert.equal((await get(rota, { token: tokens.GERADOR })).status, 403, rota);
    }
  });
});

describe('4. Regras do fluxo de reciclagem', () => {
  test('reciclador não agenda coleta (só confirma recebimento)', async () => {
    const todas = (await get('/logisticas', { token: tokens.ADMIN })).dados;
    const solicitada = todas.find((l) => l.status === 'SOLICITADA');
    const r = await chamar('PATCH', `/logisticas/${solicitada.id_logistica}/status`, { token: tokens.RECICLADOR, corpo: { status: 'AGENDADA' } });
    assert.equal(r.status, 403);
  });
  test('transição de status inválida é recusada (400)', async () => {
    const todas = (await get('/logisticas', { token: tokens.ADMIN })).dados;
    const entregue = todas.find((l) => l.status === 'ENTREGUE');
    const r = await chamar('PATCH', `/logisticas/${entregue.id_logistica}/status`, { token: tokens.ADMIN, corpo: { status: 'SOLICITADA' } });
    assert.equal(r.status, 400);
  });
  test('reciclador não certifica item que não é dele (403)', async () => {
    const meus = new Set((await get('/logisticas', { token: tokens.RECICLADOR })).dados.map((l) => l.id_item));
    const alheio = (await get('/logisticas?status=ENTREGUE', { token: tokens.ADMIN })).dados.find((l) => !meus.has(l.id_item));
    const r = await chamar('POST', `/itens/${alheio.id_item}/certificado`, { token: tokens.RECICLADOR });
    assert.equal(r.status, 403);
  });
  test('item de outro gerador não abre no rastreio (404)', async () => {
    const meus = new Set((await get('/itens', { token: tokens.GERADOR })).dados.map((i) => i.id_item));
    const alheio = (await get('/itens', { token: tokens.ADMIN })).dados.find((i) => !meus.has(i.id_item));
    assert.equal((await get(`/itens/${alheio.id_item}`, { token: tokens.GERADOR })).status, 404);
  });
});

describe('5. Pontos de coleta com aprovação', () => {
  let idPonto;
  const ponto = {
    nome: '[teste automático] Ponto CircuitoVerde', canal: 'Reciclador', categorias: ['TELEFONIA'],
    endereco: { cep: '80020310', logradouro: 'Rua XV de Novembro', numero: '1', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', latitude: -25.4296, longitude: -49.2719 },
  };
  test('gerador não cadastra ponto (403)', async () => {
    assert.equal((await chamar('POST', '/pontos', { token: tokens.GERADOR, corpo: ponto })).status, 403);
  });
  test('ponto sem localização no mapa é recusado (400)', async () => {
    const r = await chamar('POST', '/pontos', { token: tokens.RECICLADOR, corpo: { ...ponto, endereco: { ...ponto.endereco, latitude: null } } });
    assert.equal(r.status, 400);
  });
  test('reciclador cadastra e o ponto fica pendente, fora do mapa', async () => {
    const r = await chamar('POST', '/pontos', { token: tokens.RECICLADOR, corpo: ponto });
    assert.equal(r.status, 201);
    assert.equal(r.dados.status, 'PENDENTE');
    idPonto = r.dados.id_ponto;
    const mapa = (await get('/pontos/mapa')).dados;
    assert.ok(!mapa.some((p) => p.id_ponto === idPonto));
  });
  test('só o admin aprova; depois de aprovado aparece no mapa', async () => {
    assert.equal((await chamar('PATCH', `/pontos/${idPonto}/status`, { token: tokens.RECICLADOR, corpo: { status: 'APROVADO' } })).status, 403);
    assert.equal((await chamar('PATCH', `/pontos/${idPonto}/status`, { token: tokens.ADMIN, corpo: { status: 'APROVADO' } })).status, 200);
    assert.ok((await get('/pontos/mapa')).dados.some((p) => p.id_ponto === idPonto));
  });
  test('o trigger grava o histórico (pendente -> aprovado)', async () => {
    const h = (await get(`/pontos/${idPonto}/historico`, { token: tokens.ADMIN })).dados;
    assert.deepEqual(h.map((x) => x.status), ['PENDENTE', 'APROVADO']);
  });
  test('desativar tira o ponto do mapa (limpeza do teste)', async () => {
    assert.equal((await chamar('PATCH', `/pontos/${idPonto}/ativo`, { token: tokens.ADMIN, corpo: { ativo: false } })).status, 200);
    assert.ok(!(await get('/pontos/mapa')).dados.some((p) => p.id_ponto === idPonto));
  });
});

describe('6. Perfil e senha', () => {
  test('atualiza o nome e devolve token novo (e volta ao original)', async () => {
    const p = (await get('/auth/perfil', { token: tokens.AUDITOR })).dados;
    const r = await chamar('PUT', '/auth/perfil', { token: tokens.AUDITOR, corpo: { nome: 'Gustavo Teste', email: p.email } });
    assert.equal(r.status, 200);
    assert.ok(r.dados.token);
    await chamar('PUT', '/auth/perfil', { token: tokens.AUDITOR, corpo: { nome: p.nome, email: p.email } });
  });
  test('não deixa usar o e-mail de outra conta (409)', async () => {
    const outro = (await get('/auth/perfil', { token: tokens.ADMIN })).dados.email;
    const r = await chamar('PUT', '/auth/perfil', { token: tokens.AUDITOR, corpo: { nome: 'Gustavo', email: outro } });
    assert.equal(r.status, 409);
  });
  test('troca de senha confere a senha atual e a nova passa a valer', async () => {
    assert.equal((await chamar('PUT', '/auth/senha', { token: tokens.AUDITOR, corpo: { atual: 'errada', nova: 'NovaSenha123' } })).status, 400);
    assert.equal((await chamar('PUT', '/auth/senha', { token: tokens.AUDITOR, corpo: { atual: 'Gustavo', nova: '1234' } })).status, 400, 'senha curta');
    assert.equal((await chamar('PUT', '/auth/senha', { token: tokens.AUDITOR, corpo: { atual: 'Gustavo', nova: 'NovaSenha123' } })).status, 200);
    const login = await chamar('POST', '/auth/login', { corpo: { usuario: 'Gustavo', senha: 'NovaSenha123', perfil: 'AUDITOR' } });
    // Volta a senha "Gustavo" direto no banco (pelo site a regra de 8 caracteres não deixaria)
    await pool.query("UPDATE usuario SET senha_hash = '$2a$10$IIEJEyomVdVGIRQ1tfSOXeImY9.QnAUv9JuD86w7STj/POb/RfPfG' WHERE login = 'gustavo' AND perfil = 'AUDITOR'");
    assert.equal(login.status, 200);
  });
  test('cada perfil recebe as próprias notificações', async () => {
    for (const perfil of Object.keys(tokens)) {
      const r = await get('/notificacoes', { token: tokens[perfil] });
      assert.equal(r.status, 200, perfil);
      assert.ok(Array.isArray(r.dados));
    }
  });
});
