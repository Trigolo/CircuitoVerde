// Bot por regras: entende a pergunta por palavras-chave, chama as mesmas ferramentas
// da IA e monta a resposta em texto. Funciona sem internet e sem chave de API.
const pool = require('../db');
const { executar, semAcento, SINONIMOS } = require('./ferramentas');
const { FAQ, APRESENTACAO, SUGESTOES } = require('./conhecimento');

const fmt = (v, casas = 1) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const NOMES_STATUS = { SOLICITADA: 'solicitada', AGENDADA: 'agendada', EM_TRANSITO: 'em trânsito', ENTREGUE: 'entregue', CANCELADA: 'cancelada' };

// Cache das cidades que têm pontos (para reconhecer "Curitiba", "são paulo"...)
let cacheCidades = null, cacheEm = 0;
async function cidades() {
  if (!cacheCidades || Date.now() - cacheEm > 10 * 60 * 1000) {
    const [l] = await pool.query('SELECT DISTINCT cidade, uf FROM vw_pontos_coleta');
    cacheCidades = l.map((c) => ({ ...c, chave: semAcento(c.cidade) })).sort((a, b) => b.chave.length - a.chave.length);
    cacheEm = Date.now();
  }
  return cacheCidades;
}
const contemPalavra = (texto, palavra) => new RegExp(`(^|[^a-z])${palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(texto);

async function acharCidade(t) {
  for (const c of await cidades()) if (contemPalavra(t, c.chave)) return c;
  return null;
}
function acharEquipamento(t) {
  const chave = Object.keys(SINONIMOS).sort((a, b) => b.length - a.length).find((k) => contemPalavra(t, k));
  return chave || null;
}

// ---------- formatação das respostas ----------
function textoPontos(r, onde) {
  if (r.erro) return r.erro;
  if (!r.pontos?.length) return `Não encontrei pontos de coleta em ${onde}. Tente uma cidade próxima ou toque em 📍 para usar a sua localização.`;
  const titulo = r.busca === 'por localização'
    ? '**Pontos de coleta mais próximos de você:**'
    : `**${r.total_na_cidade} ponto(s) em ${r.cidade}/${r.uf}${r.categoria ? ' que recebem pilhas e baterias' : ''}.** ${r.total_na_cidade > r.pontos.length ? 'Alguns deles:' : ''}`;
  const itens = r.pontos.map((p) => `- **${p.nome}**${p.distancia_km != null ? ` · ${fmt(p.distancia_km, p.distancia_km < 10 ? 1 : 0)} km` : ''}\n  ${p.endereco} · [rota](${p.rota})${p.origem.startsWith('fict') ? ' · _fictício_' : ''}`);
  return `${titulo}\n${itens.join('\n')}\n\nVeja todos no mapa em **Pontos de coleta**. Confirme o horário com o local antes de ir.`;
}

function textoRastreio(r) {
  if (r.erro) return r.erro;
  const etapas = r.historico.map((h) => NOMES_STATUS[h.status] || h.status).join(' → ');
  let t = `**Item nº ${r.id_item} · ${r.equipamento}** (${fmt(r.peso_kg, 3)} kg)\n- Coleta: **${NOMES_STATUS[r.status_coleta] || r.status_coleta}**`;
  if (etapas) t += `\n- Histórico: ${etapas}`;
  t += `\n- Componentes com destino: ${r.componentes_com_destino} de ${r.componentes}`;
  t += `\n- Certificado: ${r.certificado_emitido ? '**emitido** ✔' : 'ainda não emitido'}`;
  if (r.reciclador) t += `\n- Reciclador: ${r.reciclador}`;
  if (r.observacao) t += `\n\n_${r.observacao}_`;
  return t;
}

function textoCertificado(r) {
  if (r.erro) return r.erro;
  if (!r.valido) return '❌ **Certificado não encontrado.** Confira se o código foi copiado inteiro.';
  return `✅ **Certificado válido.**\n- Equipamento: ${r.equipamento} (item nº ${r.id_item})\n- Emitido em: ${r.data_emissao}\n- Gerador: ${r.gerador}\n- Reciclador: ${r.reciclador || '-'}\n- Peso destinado: ${fmt(r.peso_total_kg, 3)} kg, sendo ${fmt(r.kg_reaproveitado, 3)} kg reciclados ou reutilizados`;
}

function textoImpacto(r) {
  if (r.erro) return `${r.erro}${r.equipamentos_disponiveis ? ` Conheço: ${r.equipamentos_disponiveis.join(', ')}.` : ''}`;
  const lista = r.materiais.map((m) => `- ${m.material}: **${fmt(m.kg, m.kg < 1 ? 3 : 2)} kg**`).join('\n');
  return `**${r.quantidade} × ${r.equipamento}** (${fmt(r.peso_total_kg, 2)} kg no total) rendem aproximadamente:\n${lista}\n\nValor estimado dos materiais: **R$ ${fmt(r.valor_total_estimado_reais, 2)}**.\n_Base: ${r.base}._`;
}

function textoIndicadores(r) {
  return `**Números do CircuitoVerde** (dados de teste):\n- ${r.itens_descartados} itens descartados (${fmt(r.kg_descartados)} kg)\n- ${r.certificados_emitidos} certificados emitidos\n- **${fmt(r.percentual_com_destino_comprovado)}%** do peso com destino comprovado\n- ${r.pontos_de_coleta} pontos de coleta\n- Material mais recuperado: ${r.materiais_mais_recuperados[0]?.material} (${fmt(r.materiais_mais_recuperados[0]?.kg)} kg)`;
}

function textoPanorama(r) {
  const pior = r.regioes[0];
  const br = r.paises.find((p) => p.local === 'Brasil');
  let t = `**Lixo eletrônico no mundo em ${r.ano}${r.estimativa ? ' (estimativa)' : ''}:**\n- Gerado: **${fmt(r.mundo.gerado_mt)} milhões de toneladas**\n- Reciclagem documentada: ${fmt(r.mundo.taxa_reciclagem_documentada)}%\n- Sem destino documentado: **${fmt(r.mundo.sem_destino_documentado_mt)} Mt**`;
  if (pior) t += `\n- Região com mais lixo sem destino: **${pior.local}** (${fmt(pior.sem_destino_documentado_mt)} Mt)`;
  if (br) t += `\n- Brasil: ${fmt(br.gerado_mt * 1000, 0)} mil toneladas geradas e só ${fmt(br.taxa_reciclagem_documentada)}% coletado formalmente`;
  return `${t}\n\n_Fonte: ${r.fonte}. Veja o globo em **Panorama global**._`;
}

function textoRanking(r) {
  const itens = r.ranking.map((g) => `${g.posicao}. **${g.nome_publico}** (${g.cidade}/${g.uf}) · ${fmt(g.kg_certificado)} kg · selo ${g.selo.toLowerCase()}`).join('\n');
  return `**Ranking do selo verde** (${r.criterio}):\n${itens}\n\nSelos: ${r.selos}.`;
}

// ---------- interpretação ----------
async function responder(mensagem, ctx = {}) {
  const t = semAcento(mensagem);
  const usadas = [];
  const chamar = async (nome, args) => { usadas.push(nome); return executar(nome, args, ctx); };
  const resp = (texto, sugestoes) => ({ resposta: texto, ferramentas: usadas, sugestoes });

  // 1. Código de certificado colado
  const uuid = mensagem.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return resp(textoCertificado(await chamar('validar_certificado', { codigo: uuid[0] })));

  // 2. Saudação ou pedido de ajuda
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hello|hey)\b/.test(t) && t.length < 25) return resp(APRESENTACAO, SUGESTOES);

  const numero = (t.match(/\b(\d{1,6})\b/) || [])[1];

  // 3. Rastreio de item
  if (/(rastre|status|andamento|situacao|onde esta|acompanhar)/.test(t) || (/\bitem\b/.test(t) && numero)) {
    if (!numero) return resp('Qual o **número do item**? Ele aparece em **Meus descartes**. Ex.: "rastrear o item 31".');
    return resp(textoRastreio(await chamar('rastrear_item', { id_item: Number(numero) })));
  }

  // 4. Calculadora de impacto
  const equip = acharEquipamento(t);
  if (/(quanto|calcul|rende|recupera|material|cobre|ouro|alumini|valor|vale)/.test(t) && equip) {
    const qtd = (t.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${equip}`)) || t.match(/\b(\d{1,4})\b/) || [])[1];
    return resp(textoImpacto(await chamar('calcular_impacto', { equipamento: equip, quantidade: qtd || 1 })));
  }

  // 5. Panorama global (antes dos pontos, para "brasil" não virar busca de cidade)
  if (/(mundo|global|planeta|regia|onu|paises|internacional|brasil gera|no brasil)/.test(t)) {
    const ano = (t.match(/\b(2019|2022|2026)\b/) || [])[1];
    return resp(textoPanorama(await chamar('panorama_global', { ano })));
  }

  // 6. Pontos de coleta
  const cidade = await acharCidade(t);
  const querPonto = /(onde|ponto|pontos|descart|levar|entregar|coleta|perto|proxim|deixar|jogar fora)/.test(t);
  const pedeLocal = /(onde|ponto|pontos|perto|proxim|levar|entregar)/.test(t);
  if ((querPonto && cidade) || (pedeLocal && ctx.localizacao)) {
    const args = cidade ? { cidade: cidade.cidade, uf: cidade.uf } : { latitude: ctx.localizacao.lat, longitude: ctx.localizacao.lng };
    if (/(pilha|bateria)/.test(t)) args.categoria = 'PILHAS_BATERIAS';
    return resp(textoPontos(await chamar('buscar_pontos_coleta', args), cidade ? cidade.cidade : 'sua região'));
  }

  // 7. Ranking e indicadores
  if (/(ranking|selo|melhores|quem mais|top)/.test(t)) return resp(textoRanking(await chamar('ranking_geradores', { limite: 5 })));
  if (/(quantos|quantas|total|indicador|dashboard|numeros|estatistic|plataforma|impacto do sistema)/.test(t)) {
    return resp(textoIndicadores(await chamar('indicadores_plataforma')));
  }

  // 8. Perguntas frequentes
  const faq = FAQ.find((f) => f.chaves.some((k) => t.includes(k)));
  if (faq) return resp(faq.resposta || APRESENTACAO, faq.resposta ? undefined : SUGESTOES);

  // 9. Quer ponto mas não disse onde
  if (querPonto) return resp('Em qual **cidade** você está? Também posso usar a sua localização: toque em **📍** aqui embaixo.');

  return resp('Não entendi bem 🤔. Experimente perguntar de outro jeito ou toque em uma sugestão:', SUGESTOES);
}

module.exports = { responder };
