# CircuitoVerde ♻️

**Economia Circular de Resíduos Eletrônicos**: sistema que rastreia o ciclo de vida do lixo eletrônico, do descarte pelo gerador até o destino final nos recicladores, passando pela logística reversa.

Projeto da **A3 de Banco de Dados** (tema 12 – Soluções em Banco de Dados para Sustentabilidade).

**Equipe:** Gustavo Trigolo dos Santos · Mauricio Walazak · Vinicius Viera Radke

---

## Problema

Grande parte dos eletrônicos descartados vai para o lixo comum. Não existe logística reversa estruturada entre quem gera o resíduo e quem recicla, e materiais valiosos (cobre, ouro, alumínio, lítio) se perdem. Sem dados, não há como rastrear, medir ou fiscalizar.

## Solução

Um banco de dados relacional (MySQL) que registra cada etapa do ciclo:

1. **Descarte**: o gerador (pessoa física ou empresa) registra o item, o estado e o peso.
2. **Coleta**: a logística reversa é agendada e cada mudança de status fica no histórico.
3. **Reciclagem**: o reciclador separa componentes e materiais.
4. **Destino final**: reciclagem, reuso ou descarte especial.
5. **Certificado**: o gerador recebe o comprovante de destinação.

## Estrutura do repositório

```
sql/
  01_schema.sql        criação do banco: tabelas, constraints, índices, triggers, procedure e views
  02_dados_teste.sql   dados fictícios para testes
  03_consultas.sql     consultas para relatórios e testes de integridade
  04_carga_massa.sql   carga em massa: 14 pontos de coleta, ~80 geradores, ~500 itens em 12 meses
  05_views_dashboard.sql views do dashboard gráfico (por mês, por tipo, status das coletas)
  06_estrutura_nova.sql  versão 2: pontos de coleta com geolocalização, panorama global, ranking e certificado público
  07_carga_pontos_coleta.sql 285 pontos de coleta reais (ABREE) nas 27 UFs + pontos fictícios onde não há ponto real
backend/
  API REST em Node.js + Express conectada ao MySQL (também entrega o site)
circuitoverde-frontend/
  site em HTML, CSS e JavaScript puro
```

## Banco de dados

- **SGBD:** MySQL 8
- **Normalização:** até a 3ª forma normal
- **19 tabelas** (14 da versão 1 + ponto_coleta, ponto_coleta_categoria, regiao, pais, indicador_ewaste)
- **Tabelas da versão 1:** usuario, endereco, gerador, reciclador, transportador, material, reciclador_material, tipo_equipamento, item_eletronico, componente, componente_material, logistica_reversa, status_logistica, destino_final, certificado
- **Integridade:** chaves primárias e estrangeiras, UNIQUE, CHECK (CPF/CNPJ, CEP, pesos positivos)
- **Triggers:**
  - histórico automático de status da logística reversa
  - bloqueio de destinação de componentes ainda não entregues ao reciclador
- **Stored procedure:** `sp_emitir_certificado`, que emite o certificado numa transação (COMMIT/ROLLBACK)
- **Views de indicadores:** kg recuperados por material, destinação por tipo, coleta por cidade, tempo médio da logística, rastreio de itens, descartes por mês e por tipo de equipamento, status das coletas
- **Versão 2:**
  - função `fn_distancia_km` (Haversine com `ST_Distance_Sphere`) e índice de latitude/longitude para achar os pontos mais próximos
  - `vw_panorama`: descarte inadequado no mundo, por região e no Brasil (dados do Global E-waste Monitor 2020 e 2024, ONU)
  - `vw_composicao_media_tipo`: calculadora de impacto aprendida com os registros dos recicladores
  - `vw_ranking_geradores`: ranking com selo verde (ouro, prata, bronze) e nome abreviado de pessoa física (LGPD)
  - `vw_certificado_publico`: validação do certificado pelo QR Code

## Como rodar

### Banco
1. Abra o MySQL Workbench e conecte ao seu servidor MySQL 8.
2. Execute, nesta ordem: `sql/01_schema.sql`, `sql/02_dados_teste.sql`, `sql/04_carga_massa.sql` (opcional, dados em massa), `sql/05_views_dashboard.sql`, `sql/06_estrutura_nova.sql`, `sql/07_carga_pontos_coleta.sql` e `sql/03_consultas.sql`.

### API
```bash
cd backend
npm install
# copie .env.example para .env e preencha a senha do MySQL
npm run senhas   # define a senha 123456 para os usuários de teste
npm run dev      # API e site em http://localhost:3000
```

Abra `http://localhost:3000` no navegador para usar o sistema.

Teste em `http://localhost:3000/api/saude`. O arquivo `backend/requests.http` tem o fluxo completo para testar com a extensão REST Client do VS Code.

## Principais rotas da API

| Rota | Perfil | Caso de uso |
|---|---|---|
| `POST /api/auth/login` | todos | Autenticação (JWT) |
| `POST /api/itens` | gerador | Registrar descarte |
| `GET /api/pontos-coleta?material=&cidade=` | público | Buscar pontos de coleta |
| `POST /api/logisticas` | gerador | Solicitar coleta |
| `PATCH /api/logisticas/:id/status` | transportador, reciclador | Atualizar status |
| `POST /api/componentes` | reciclador | Registrar componentes e materiais |
| `POST /api/destinos` | reciclador | Registrar destino final |
| `POST /api/itens/:id/certificado` | reciclador | Emitir certificado |
| `GET /api/itens/:id` | logado | Rastreio completo |
| `GET /api/indicadores` | público | Painel de impacto |
| `GET /api/pontos/proximos?lat=&lng=&raio=&categoria=` | público | Pontos de coleta mais próximos (geolocalização) |
| `GET /api/pontos/cidades` | público | Cidades com pontos (busca sem GPS) |
| `GET /api/panorama` | público | Dados do globo: descarte inadequado no mundo |
| `GET /api/calculadora?id_tipo=&quantidade=` | público | Calculadora de impacto |
| `GET /api/ranking` | público | Ranking com selo verde |
| `GET /api/certificados/:codigo` | público | Validação do certificado (QR Code) |

## Telas (frontend)

- **Tema claro e escuro**: botão no topo; lembra a escolha e segue o tema do sistema na primeira visita
- **Dashboard** de impacto
- **Panorama global**: globo 3D que gira, com bolhas vermelhas nas regiões com mais lixo eletrônico sem destino (2019, 2022 e estimativa de 2026)
- **Pontos de coleta**: mapa com a sua localização (GPS do navegador), raio e filtro por equipamento; rota no Google Maps
- **Calculadora de impacto**: quanto material um equipamento rende na reciclagem
- **Ranking e selo verde** dos geradores
- **Rastreio estilo encomenda**: etapas do descarte ao certificado
- **Certificado em PDF com QR Code** e tela pública de validação

Bibliotecas do frontend ficam na pasta `vendor` (D3, TopoJSON, Leaflet, qrcode-generator) e funcionam sem `npm install`. O mapa usa os blocos do OpenStreetMap, que precisam de internet.

## Fontes de dados reais

- Pontos de coleta: base pública de pontos de recebimento da ABREE (Associação Brasileira de Reciclagem de Eletroeletrônicos e Eletrodomésticos), consultada em 19/10/2026. Pontos marcados como `FICTICIO` são dados de teste.
- Panorama global: Global E-waste Monitor 2020 e 2024 (ITU/UNITAR) e Global E-waste Statistics Partnership.

## Próximos passos

- [x] Frontend web
- [x] Carga de dados em massa
- [x] Dashboard gráfico com indicadores de impacto
- [x] Tema claro e escuro
- [x] Geolocalização e pontos de coleta reais
- [x] Panorama global, calculadora, ranking e certificado com QR Code
- [ ] Script de segurança (papéis e permissões no MySQL)
- [ ] Deploy na Oracle Cloud (OCI)
