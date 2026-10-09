# CircuitoVerde ♻️

**Economia Circular de Resíduos Eletrônicos**: sistema que rastreia o ciclo de vida do lixo eletrônico, do descarte pelo gerador até o destino final nos recicladores, passando pela logística reversa.

Projeto da **A3 de Banco de Dados** (tema 12 – Soluções em Banco de Dados para Sustentabilidade).

**Equipe:** Gustavo Trigolo dos Santos · Mauricio Walazak

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
backend/
  API REST em Node.js + Express conectada ao MySQL
```

## Banco de dados

- **SGBD:** MySQL 8
- **Normalização:** até a 3ª forma normal
- **14 tabelas:** usuario, endereco, gerador, reciclador, transportador, material, reciclador_material, tipo_equipamento, item_eletronico, componente, componente_material, logistica_reversa, status_logistica, destino_final, certificado
- **Integridade:** chaves primárias e estrangeiras, UNIQUE, CHECK (CPF/CNPJ, CEP, pesos positivos)
- **Triggers:**
  - histórico automático de status da logística reversa
  - bloqueio de destinação de componentes ainda não entregues ao reciclador
- **Stored procedure:** `sp_emitir_certificado`, que emite o certificado numa transação (COMMIT/ROLLBACK)
- **Views de indicadores:** kg recuperados por material, destinação por tipo, coleta por cidade, tempo médio da logística, rastreio de itens

## Como rodar

### Banco
1. Abra o MySQL Workbench e conecte ao seu servidor MySQL 8.
2. Execute, nesta ordem: `sql/01_schema.sql`, `sql/02_dados_teste.sql`, `sql/03_consultas.sql`.

### API
```bash
cd backend
npm install
# copie .env.example para .env e preencha a senha do MySQL
npm run senhas   # define a senha 123456 para os usuários de teste
npm run dev      # API em http://localhost:3000
```

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

## Próximos passos

- [ ] Frontend web
- [ ] Script de segurança (papéis e permissões no MySQL)
- [ ] Deploy na Oracle Cloud (OCI)
