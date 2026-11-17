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
  08_assistente.sql      registro das conversas do assistente virtual e views de uso
  09_seguranca.sql       usuários e papéis (roles) do MySQL com o mínimo de permissão
  10_indices.sql         índices compostos para as consultas mais usadas (com EXPLAIN)
  11_usuario_gustavo.sql login por nome de usuário e o usuário Gustavo em todos os perfis (senha Gustavo)
  12_demo_reciclador.sql  itens de demonstração do Gustavo em cada etapa da reciclagem (a caminho, sem componentes, sem destino, pronto para certificar)
  13_gestao_pontos.sql    cadastro e aprovação de pontos de coleta: status (pendente/aprovado/rejeitado), histórico por trigger e view de gestão
  14_perfil_auditoria.sql índice da trilha de auditoria e permissões POR COLUNA para a API editar o perfil
  backup-aiven.bat        backup do banco da nuvem (Aiven) com mysqldump; pede a senha na hora
  backup.bat             backup com mysqldump (dados, views, triggers e procedures)
  restaurar.bat          restaura um backup
backend/
  API REST em Node.js + Express conectada ao MySQL (também entrega o site)
circuitoverde-frontend/
  site em HTML, CSS e JavaScript puro
```

## Banco de dados

- **SGBD:** MySQL 8
- **Normalização:** até a 3ª forma normal
- **20 tabelas** (15 da versão 1 + ponto_coleta, ponto_coleta_categoria, regiao, pais, indicador_ewaste)
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
- **Segurança (Checkpoint 3)** — `09_seguranca.sql`, menor privilégio com ROLES do MySQL 8:
  - `cv_app` (a API): lê tudo, grava só nas tabelas do fluxo, executa só `sp_emitir_certificado` e `fn_distancia_km`; não pode `DELETE` nem DDL
  - `cv_relatorio` (BI): só as views, sem acesso a e-mail, CPF ou senha
  - `cv_auditor`: leitura de tudo, sem escrita
  - `cv_backup`: o mínimo para o `mysqldump`
  - bloqueio da conta por 1 dia após 5 senhas erradas (`FAILED_LOGIN_ATTEMPTS`)
- **Índices (Checkpoint 3)** — `10_indices.sql`: índices compostos para as telas de coletas, rastreio, meus descartes e certificados, com `EXPLAIN` para mostrar o uso
- **Backup e restauração** — `backup.bat` gera `backups/circuitoverde_AAAA-MM-DD_HHMM.sql` com o usuário `cv_backup`; `restaurar.bat <arquivo>` recria o banco a partir dele

## Como rodar

### Banco
1. Abra o MySQL Workbench e conecte ao seu servidor MySQL 8.
2. Execute, nesta ordem: `sql/01_schema.sql`, `sql/02_dados_teste.sql`, `sql/04_carga_massa.sql` (opcional, dados em massa), `sql/05_views_dashboard.sql`, `sql/06_estrutura_nova.sql`, `sql/07_carga_pontos_coleta.sql`, `sql/08_assistente.sql`, `sql/09_seguranca.sql`, `sql/10_indices.sql`, `sql/11_usuario_gustavo.sql`, `sql/12_demo_reciclador.sql`, `sql/13_gestao_pontos.sql`, `sql/14_perfil_auditoria.sql` e `sql/03_consultas.sql`.
   Para entrar no site: usuário **Gustavo**, senha **Gustavo** e o perfil desejado.
3. Troque as senhas dos usuários no fim do `09_seguranca.sql` e use o `cv_app` no `.env` da API (`DB_USER=cv_app`). Em desenvolvimento dá para continuar com o `root`.

### API
```bash
cd backend
npm install
# copie .env.example para .env e preencha a senha do MySQL
npm run senhas   # define a senha Gustavo6 para os usuários de teste
npm run dev      # API e site em http://localhost:3000
```

Abra `http://localhost:3000` no navegador para usar o sistema.

Teste em `http://localhost:3000/api/saude`. O arquivo `backend/requests.http` tem o fluxo completo para testar com a extensão REST Client do VS Code.

## Principais rotas da API

| Rota | Perfil | Caso de uso |
|---|---|---|
| `POST /api/auth/login` | todos | Autenticação (JWT) por usuário ou e-mail + perfil, bloqueio após 5 senhas erradas em 15 min |
| `POST /api/auth/cadastro` | público | Criar conta de gerador (PF ou PJ) numa transação |
| `POST /api/itens` | gerador | Registrar descarte |
| `GET /api/pontos-coleta?material=&cidade=` | público | Buscar pontos de coleta |
| `POST /api/logisticas` | gerador | Solicitar coleta |
| `PATCH /api/logisticas/:id/status` | transportador, reciclador | Atualizar status |
| `POST /api/componentes` | reciclador | Registrar componentes e materiais |
| `POST /api/destinos` | reciclador | Registrar destino final |
| `POST /api/itens/:id/certificado` | reciclador | Emitir certificado |
| `GET /api/itens/:id` | dono do item, reciclador/transportador da coleta, admin | Rastreio completo |
| `GET /api/indicadores` | público | Painel de impacto |
| `GET /api/pontos/proximos?lat=&lng=&raio=&categoria=` | público | Pontos de coleta mais próximos (geolocalização) |
| `GET /api/pontos/cidades` | público | Cidades com pontos (busca sem GPS) |
| `GET /api/panorama` | público | Dados do globo: descarte inadequado no mundo |
| `GET /api/calculadora?id_tipo=&quantidade=` | público | Calculadora de impacto |
| `GET /api/ranking` | público | Ranking com selo verde |
| `GET /api/certificados/:codigo` | público | Validação do certificado (QR Code) |
| `GET /api/certificado-exemplo` | público | Código do certificado mais recente (botão de teste) |
| `POST /api/assistente` | público (login opcional) | Assistente virtual |
| `GET /api/assistente/status` | público | Motor ativo do assistente (Gemini ou regras) |

## Assistente virtual (chatbot)

Botão **Assistente** no canto da tela, disponível em todas as páginas.

- **Motor principal:** Google Gemini (camada gratuita) com *function calling*. A IA não escreve SQL: ela escolhe uma das 7 ferramentas (pontos de coleta, rastreio, certificado, indicadores, panorama, calculadora e ranking), que consultam as views e funções do banco.
- **Reserva:** bot por regras, que entende a pergunta por palavras-chave e usa as mesmas consultas. Funciona sem internet e sem chave.
- **Configuração:** crie uma chave grátis em https://aistudio.google.com e coloque `GEMINI_API_KEY=...` no `.env`. Sem chave, o chat usa só o bot por regras.
- **Segurança:** consultas só de leitura, limite de 15 perguntas por minuto por IP, nomes de pessoas só para o dono do item (LGPD).
- **Banco:** cada pergunta fica em `assistente_conversa`; as views `vw_assistente_uso` e `vw_assistente_ferramentas` mostram o uso.

## Telas (frontend)

- **Visual vibrante (versão 3)**: tela inicial de apresentação com ilustração animada e números ao vivo, menu no topo (barra inferior no celular), animações de entrada e contadores

- **Tema claro e escuro**: botão no topo; lembra a escolha e segue o tema do sistema na primeira visita
- **Dashboard** de impacto
- **Panorama global**: globo 3D que gira, com bolhas vermelhas nas regiões com mais lixo eletrônico sem destino (2019, 2022 e estimativa de 2026)
- **Pontos de coleta**: mapa com a sua localização (GPS do navegador), raio e filtro por equipamento; rota no Google Maps
- **Calculadora de impacto**: quanto material um equipamento rende na reciclagem
- **Ranking e selo verde** dos geradores
- **Rastreio estilo encomenda**: etapas do descarte ao certificado
- **Certificado em PDF com QR Code** e tela pública de validação, com botão para testar um certificado real
- **Criar conta**: cadastro de pessoa ou empresa, com endereço preenchido pelo CEP (ViaCEP)
- **Busca nas tabelas** de coletas, itens e ranking

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
- [x] Cadastro de usuários
- [x] Segurança do banco (usuários e papéis com menor privilégio)
- [x] Índices de desempenho e roteiro de backup e restauração
- [x] Panorama global, calculadora, ranking e certificado com QR Code
- [x] Assistente virtual com IA (Gemini) e bot por regras
- [ ] Deploy na Oracle Cloud (OCI)

## Gestão de pontos de coleta (versão 4)

- **Reciclador:** em *Reciclagem → Gerenciar pontos*, cadastra os locais onde recebe eletrônicos (endereço pelo CEP, local marcado no mapa, materiais aceitos, horário e telefone). O ponto fica **Aguardando aprovação**.
- **Admin:** em *Administração → Gerenciar pontos*, aprova ou rejeita (com motivo), cadastra pontos já publicados, edita e desativa.
- Só pontos **aprovados e ativos** aparecem no mapa público (`vw_pontos_coleta`). Cada mudança de status é gravada em `ponto_coleta_historico` pelo trigger `trg_ponto_au`.
- Rotas: `GET /api/pontos/gestao`, `POST /api/pontos`, `PUT /api/pontos/:id`, `PATCH /api/pontos/:id/status`, `PATCH /api/pontos/:id/ativo`, `GET /api/pontos/:id/historico` e `GET /api/pontos/mapa` (coordenadas para o globo).

## Globo (tela Mundo)

Atmosfera, iluminação e a **noite em tempo real** (calculada pela posição do Sol), países pintados pela % sem destino documentado (o Brasil pelo dado do próprio país), os pontos de coleta aprovados como luzes, botão **Pontos no Brasil** e **linha do tempo** com play que anima 2019 → 2022 → 2026 (estimativa).

## Versão 5: qualidade e operação

- **Testes automáticos:** `cd backend` e `npm test`. São 28 testes (node:test, sem instalar nada) cobrindo login, cadastro, permissões de cada perfil, regras da reciclagem, aprovação de pontos (com o trigger de histórico), perfil e troca de senha. Rodam no banco local do `.env`; por segurança se recusam a rodar no banco da nuvem.
- **Relatórios** (Admin e Auditor): indicadores, gráfico de descartes por mês, materiais recuperados, situação das coletas, recicladores mais rápidos e cidades, com exportação em **CSV** (abre no Excel).
- **Auditoria** (Admin e Auditor): trilha gravada pelos triggers (coletas e pontos de coleta), com busca e CSV.
- **Notificações:** sininho no topo com os avisos de cada perfil (coleta agendada, item entregue, ponto aprovado, certificado emitido...), montados a partir do histórico do banco.
- **Meu perfil:** clique no seu nome no topo. Edita nome, e-mail e os dados do papel; troca de senha conferindo a atual. A API só pode alterar essas colunas (`GRANT UPDATE (nome, email, senha_hash)`).
- **Certificado:** a validação mostra selo, QR Code e código.
- **Site sempre acordado:** `.github/workflows/manter-acordado.yml` acessa o site a cada 10 min (7h às 23h).
- **Backup da nuvem:** `sql\backup-aiven.bat`.
