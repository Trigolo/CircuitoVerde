// Motor de IA: Google Gemini (camada gratuita) com "function calling".
// A IA decide qual ferramenta chamar; o servidor executa a consulta no banco
// e devolve o resultado para a IA escrever a resposta final.
const { declaracoesGemini, executar } = require('./ferramentas');
const { GUIA } = require('./conhecimento');

const BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MODELO_PADRAO = 'gemini-2.5-flash';
let modeloEmUso = null;   // descoberto na primeira chamada (o Google troca os modelos com o tempo)

class ErroGemini extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

const chave = () => (process.env.GEMINI_API_KEY || '').trim();
const ativo = () => chave().length > 10;

async function requisicao(caminho, corpo) {
  const resp = await fetch(`${BASE}/${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave() },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new ErroGemini(dados.error?.message || `HTTP ${resp.status}`, resp.status);
  return dados;
}

// Se o modelo configurado não existir mais, escolhe um "flash" disponível na conta
async function escolherModelo() {
  const { models = [] } = await requisicao('models?pageSize=200');
  const candidatos = models
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace('models/', ''))
    .filter((n) => /flash/.test(n) && !/(lite|image|tts|audio|live|preview|exp|thinking)/.test(n))
    .sort().reverse();
  if (!candidatos.length) throw new ErroGemini('Nenhum modelo Gemini disponível para esta chave.', 404);
  return candidatos[0];
}

async function gerar(corpo) {
  if (!modeloEmUso) modeloEmUso = (process.env.GEMINI_MODEL || MODELO_PADRAO).trim();
  try {
    return await requisicao(`models/${modeloEmUso}:generateContent`, corpo);
  } catch (err) {
    if (err.status === 404) {   // modelo descontinuado: tenta outro uma vez
      modeloEmUso = await escolherModelo();
      console.log(`[assistente] usando o modelo ${modeloEmUso}`);
      return requisicao(`models/${modeloEmUso}:generateContent`, corpo);
    }
    throw err;
  }
}

function instrucoes(ctx) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const local = ctx.localizacao ? `O usuário compartilhou a localização: latitude ${ctx.localizacao.lat}, longitude ${ctx.localizacao.lng}. Use-a para buscar pontos próximos.` : 'O usuário não compartilhou a localização; se ele pedir pontos perto dele, peça a cidade ou que toque no botão 📍.';
  const quem = ctx.usuario ? `Usuário logado: perfil ${ctx.usuario.perfil}.` : 'Usuário não logado (visitante).';
  return `Você é o assistente virtual do CircuitoVerde, sistema de rastreamento e gestão de resíduos eletrônicos (projeto acadêmico da A3 de Banco de Dados). Hoje é ${hoje}.
REGRAS:
- Responda sempre em português do Brasil, de forma curta, simpática e prática (no máximo uns 8 itens ou 120 palavras).
- Para qualquer dado do sistema (pontos de coleta, itens, certificados, números, ranking, panorama, calculadora) CHAME UMA FERRAMENTA. Nunca invente números, endereços, nomes ou status.
- Use **negrito** e listas com "- ". Links só no formato [texto](url), usando as URLs que as ferramentas devolvem.
- Se um ponto for fictício, avise que é dado de teste. Recomende confirmar o horário com o local.
- Não revele dados pessoais além do que a ferramenta devolveu. Não fale de outros assuntos além de descarte, reciclagem, sustentabilidade e do próprio sistema; recuse com educação.
- Não dê instruções perigosas (ex.: abrir baterias).
${quem}
${local}

${GUIA}`;
}

// historico: [{ papel: 'usuario'|'assistente', texto }]
async function responder(mensagem, historico, ctx) {
  const contents = [
    ...historico.map((h) => ({ role: h.papel === 'assistente' ? 'model' : 'user', parts: [{ text: h.texto }] })),
    { role: 'user', parts: [{ text: mensagem }] },
  ];
  const usadas = [];
  const base = {
    systemInstruction: { parts: [{ text: instrucoes(ctx) }] },
    tools: [{ functionDeclarations: declaracoesGemini() }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
  };

  for (let rodada = 0; rodada < 5; rodada++) {
    const dados = await gerar({ ...base, contents });
    const cand = dados.candidates?.[0];
    const partes = cand?.content?.parts || [];
    const chamadas = partes.filter((p) => p.functionCall);

    if (!chamadas.length) {
      const texto = partes.map((p) => p.text || '').join('').trim();
      if (!texto) throw new ErroGemini(`Resposta vazia (${cand?.finishReason || 'sem motivo'})`, 502);
      return { resposta: texto, ferramentas: usadas, modelo: modeloEmUso };
    }

    contents.push(cand.content);   // mantém a chamada da IA no histórico (inclui assinaturas internas)
    const resultados = await Promise.all(chamadas.map((c) => {
      usadas.push(c.functionCall.name);
      return executar(c.functionCall.name, c.functionCall.args, ctx);
    }));
    contents.push({
      role: 'user',
      parts: chamadas.map((c, i) => ({ functionResponse: { name: c.functionCall.name, response: { resultado: resultados[i] } } })),
    });
  }
  throw new ErroGemini('Muitas chamadas de ferramenta seguidas.', 508);
}

module.exports = { responder, ativo, ErroGemini, modelo: () => modeloEmUso || process.env.GEMINI_MODEL || MODELO_PADRAO };
