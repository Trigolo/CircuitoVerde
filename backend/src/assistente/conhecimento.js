// Base de conhecimento do assistente: guia de descarte e perguntas frequentes.
// O Gemini recebe o GUIA como instrução; o bot por regras usa a lista FAQ.

const GUIA = `
GUIA DE DESCARTE DE LIXO ELETRÔNICO (use como referência, não invente leis ou números):
- Lixo eletrônico (REEE) é todo equipamento que funciona com tomada, bateria ou pilha: celulares, computadores, TVs, cabos, carregadores, pilhas, baterias, eletrodomésticos.
- Nunca jogar no lixo comum: contém metais pesados (chumbo, mercúrio, cádmio) e baterias de lítio, que podem pegar fogo em caminhões e aterros.
- No Brasil, a Política Nacional de Resíduos Sólidos (Lei 12.305/2010) obriga fabricantes, importadores e comerciantes a manter a logística reversa, e o Decreto 10.240/2020 regulamenta isso para eletroeletrônicos de uso doméstico. Por isso muitas lojas recebem aparelhos de graça.
- Antes de descartar celular ou computador: fazer backup, sair das contas (Google/Apple), restaurar para o padrão de fábrica e retirar chip e cartão de memória.
- Pilhas e baterias: guardar em um pote fechado, longe do calor, e entregar em coletores específicos (supermercados e lojas costumam ter). Bateria estufada: não perfurar, não carregar, entregar o quanto antes.
- Aparelho que ainda funciona: considerar doação ou conserto (reuso é melhor que reciclagem).
- Aparelhos grandes (geladeira, máquina de lavar): perguntar ao fabricante ou à loja sobre coleta em casa.
- No CircuitoVerde: o gerador registra o descarte, solicita a coleta, a transportadora leva ao reciclador, o reciclador separa componentes e materiais, define o destino (reciclagem, reuso ou descarte especial) e emite o certificado com QR Code.
- Perfis do sistema: gerador (pessoa ou empresa que descarta), transportador, reciclador, administrador e auditor.
- Telas: Dashboard, Panorama global, Pontos de coleta (com geolocalização), Calculadora de impacto, Ranking e selo verde, Validar certificado; depois do login: Novo descarte, Meus descartes, Coletas, Reciclagem.
- Pontos de coleta reais vêm da base pública da ABREE (consulta de 19/10/2026); os marcados como fictícios são dados de teste. Recomende confirmar horário com o local.
`.trim();

// Perguntas frequentes para o bot por regras: palavras-chave (sem acento) -> resposta
const FAQ = [
  {
    chaves: ['pilha', 'pilhas', 'bateria', 'baterias'],
    resposta: '**Pilhas e baterias nunca vão no lixo comum.** Elas têm metais pesados e as de lítio podem pegar fogo.\n- Guarde em um pote fechado, longe do calor.\n- Entregue em coletores de pilhas (supermercados, farmácias e lojas de eletrônicos costumam ter).\n- Bateria estufada: não perfure e não carregue; entregue o quanto antes.\n\nQuer que eu procure um ponto de coleta? Diga a sua cidade ou toque em 📍.',
  },
  {
    chaves: ['apagar', 'dados', 'formatar', 'backup', 'privacidade', 'conta google', 'icloud'],
    resposta: '**Antes de descartar celular ou computador:**\n- Faça backup das fotos e arquivos.\n- Saia das contas (Google, Apple, WhatsApp).\n- Restaure para o padrão de fábrica.\n- Tire o chip e o cartão de memória.',
  },
  {
    chaves: ['logistica reversa', 'o que e logistica', 'como funciona a coleta'],
    resposta: '**Logística reversa** é o caminho de volta do produto: depois de usado, ele retorna para quem pode reciclar. A Lei 12.305/2010 (Política Nacional de Resíduos Sólidos) obriga fabricantes e lojas a participar.\n\nNo CircuitoVerde: você registra o descarte → solicita a coleta → a transportadora leva ao reciclador → o reciclador separa os materiais → você recebe o certificado.',
  },
  {
    chaves: ['o que e lixo eletronico', 'o que e reee', 'o que conta como', 'que tipo de lixo'],
    resposta: '**Lixo eletrônico** é qualquer equipamento que funciona com tomada, pilha ou bateria: celulares, computadores, TVs, cabos, carregadores, fones, pilhas e eletrodomésticos.',
  },
  {
    chaves: ['por que reciclar', 'porque reciclar', 'importancia', 'faz mal', 'perigo'],
    resposta: 'Reciclar evita que **metais pesados** contaminem solo e água e recupera materiais valiosos como **cobre, ouro, alumínio e lítio**. Em 2022, só 22,3% do lixo eletrônico do mundo teve reciclagem documentada (Global E-waste Monitor 2024). Veja a tela **Panorama global**.',
  },
  {
    chaves: ['certificado', 'comprovante', 'qr code', 'qrcode'],
    resposta: 'O **certificado de destinação** é emitido pelo reciclador quando todos os componentes do item recebem destino final. Ele tem um **QR Code** que abre a tela **Validar certificado**.\n\nSe tiver o código (36 caracteres), cole aqui que eu confiro.',
  },
  {
    chaves: ['funciona ainda', 'doar', 'doacao', 'consertar', 'conserto', 'reuso'],
    resposta: 'Se o aparelho **ainda funciona**, doar ou consertar é a melhor opção: o reuso evita que um novo aparelho seja fabricado. Quando não tiver mais jeito, aí sim a reciclagem.',
  },
  {
    chaves: ['geladeira', 'maquina de lavar', 'fogao', 'ar condicionado', 'grande porte'],
    resposta: 'Para **aparelhos grandes** (geladeira, máquina de lavar, ar-condicionado), procure o fabricante ou a loja onde comprou: muitos fazem a coleta em casa pela logística reversa. Também posso procurar pontos de coleta na sua cidade.',
  },
  {
    chaves: ['como usar', 'como registrar', 'novo descarte', 'como descartar no sistema', 'cadastrar descarte', 'como faco'],
    resposta: '**Para descartar pelo CircuitoVerde:**\n1. Entre como **gerador**.\n2. Vá em **Novo descarte** e informe o equipamento, o estado e o peso.\n3. Em **Meus descartes**, clique em **Solicitar coleta**.\n4. Acompanhe pelo botão **Rastrear** até o certificado.',
  },
  {
    chaves: ['ajuda', 'o que voce faz', 'o que vc faz', 'quem e voce', 'menu', 'opcoes'],
    resposta: null, // usa a mensagem de apresentação
  },
];

const APRESENTACAO = 'Oi! Sou o **assistente do CircuitoVerde** ♻️. Posso:\n- encontrar **pontos de coleta** perto de você;\n- **rastrear um item** pelo número;\n- **validar um certificado**;\n- calcular quanto material sai da **reciclagem** de um aparelho;\n- mostrar **números da plataforma** e do **mundo**;\n- tirar **dúvidas sobre descarte**.';

const SUGESTOES = ['Pontos de coleta em Curitiba', 'Rastrear o item 1', 'Quanto cobre sai de 10 celulares?', 'Posso jogar pilha no lixo?', 'Como está o lixo eletrônico no mundo?'];

module.exports = { GUIA, FAQ, APRESENTACAO, SUGESTOES };
