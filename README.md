# 📦 QR Code Backend – CSV Validator

Este backend foi desenvolvido com **Node.js** e **Express.js** para validar IDs presentes em um arquivo CSV, marcando-os como "checked" após o uso. 

---

## 🚀 Funcionalidades

- ✅ Leitura de um arquivo `DB.csv` com dados de participantes
- 🧾 Validação de ID enviado via QR code
- 🔄 Atualização do CSV marcando o ID como `checked = true`
- 📤 Retorno das informações associadas ao ID (nome, email, camiseta, etc)
- 📥 Endpoint para leitura completa do CSV (modo raw)

---

## 🛠️ Tecnologias

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [csvtojson](https://www.npmjs.com/package/csvtojson)
- [json-2-csv](https://www.npmjs.com/package/json-2-csv)
- [cors](https://www.npmjs.com/package/cors)

---

## 📁 Estrutura do Projeto

```bash
.
├── app.js         # Código principal do servidor
├── DB.csv         # Arquivo com base de dados dos participantes
├── package.json   # Dependências e scripts do Node.js
```

📦 Instalação
Clone o repositório:
```
git clone https://github.com/Cophhy/qrCodeProject.git
cd qrCodeProject/backend
```

Instale as dependências:

```npm install```

Crie o arquivo DB.csv (se não existir):

Exemplo:

```csv
id,email,username,teamName,tShirt,checked
1,john@example.com,john_doe,Team Alpha,M,false
2,jane@example.com,jane_doe,Team Beta,S,false
```

Inicie o servidor:
```node app.js```
Servidor rodando em: http://localhost:5001

📡 Endpoints da API
```GET /api/v1/getData```
Retorna o conteúdo completo do CSV em texto puro.

Exemplo de resposta:
```
id,email,username,teamName,tShirt,checked
1,john@example.com,john_doe,Team Alpha,M,false
```
```
POST /api/v1/postData
```
Valida o id enviado no corpo da requisição e marca como checked.

Requisição:

```POST /api/v1/postData
Content-Type: application/json

{
  "id": "2"
}
```
Respostas:
```
200 OK: Participante validado com sucesso

300 Multiple Choices: Participante já foi validado antes

400 Bad Request: ID não fornecido

404 Not Found: ID não encontrado no banco
```

🧪 Testando
Você pode testar com o Postman ou via curl:

```
curl -X POST http://localhost:5001/api/v1/postData \
  -H "Content-Type: application/json" \
  -d '{"id": "2"}'
```
