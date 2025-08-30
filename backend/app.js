// backend/app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 5001,
  SPREADSHEET_ID,
  SHEET_NAME = 'Guests',
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} = process.env;

// Converte \n literais em quebras reais para a private key
const privateKey = (GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Escopo mínimo necessário para ler/escrever valores
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  return new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    privateKey,
    SCOPES
  );
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// util: converte índice (0=A) → coluna A1
function colToA1(idx0) {
  let n = idx0 + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Lê a planilha inteira (A:Z). Retorna { headers, rows }.
 * headers: array (lowercase) da 1ª linha
 * rows: matriz com as linhas a partir da 2ª
 */
async function readAll() {
  const sheets = getSheets();
  const range = `${SHEET_NAME}!A:Z`;
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    majorDimension: 'ROWS',
  });
  const values = data.values || [];
  const headers = (values[0] || []).map(h => String(h || '').trim().toLowerCase());
  const rows = values.slice(1);
  return { headers, rows };
}

/**
 * Procura pelo id (string exatamente igual) e retorna:
 * { rowNumber, record, headerMap } ou null
 */
async function findById(id) {
  const { headers, rows } = await readAll();
  if (!headers.length) return null;

  const idx = {
    id: headers.indexOf('id'),
    email: headers.indexOf('email'),
    username: headers.indexOf('username'),
    teamname: headers.indexOf('teamname'),
    tshirt: headers.indexOf('tshirt'),
    checked: headers.indexOf('checked'),
    checked_at: headers.indexOf('checked_at'),
  };
  if (idx.id < 0) throw new Error('Coluna "id" não encontrada no cabeçalho.');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const currentId = (row[idx.id] || '').toString().trim();
    if (currentId === id) {
      const rowNumber = 2 + i; // 1=header, começa em 2
      const record = {
        id: currentId,
        email: idx.email >= 0 ? (row[idx.email] || '') : '',
        username: idx.username >= 0 ? (row[idx.username] || '') : '',
        teamName: idx.teamname >= 0 ? (row[idx.teamname] || '') : '',
        tShirt: idx.tshirt >= 0 ? (row[idx.tshirt] || '') : '',
        checked: idx.checked >= 0 ? (row[idx.checked] || '') : '',
        checked_at: idx.checked_at >= 0 ? (row[idx.checked_at] || '') : '',
      };
      return { rowNumber, record, headerMap: idx, headers, rows };
    }
  }
  return null;
}

/**
 * Marca checked=TRUE e checked_at=ISO na linha.
 */
async function markChecked(rowNumber, headerMap) {
  const sheets = getSheets();

  if (headerMap.checked < 0) {
    throw new Error('Coluna "checked" não encontrada.');
  }
  const checkedColA1 = colToA1(headerMap.checked);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!${checkedColA1}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[true]] },
  });

  if (headerMap.checked_at >= 0) {
    const checkedAtColA1 = colToA1(headerMap.checked_at);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${checkedAtColA1}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[new Date().toISOString()]] },
    });
  }
}

/**
 * GET /api/v1/getData
 * Retorna os dados em CSV (similar ao arquivo original).
 */
app.get('/api/v1/getData', async (_req, res) => {
  try {
    const { headers, rows } = await readAll();
    // monta CSV simples
    const headerLine = headers.join(',');
    const lines = rows.map(r => {
      return headers.map((_, i) => {
        const v = (r[i] ?? '').toString().replace(/"/g, '""');
        return /[",\n]/.test(v) ? `"${v}"` : v;
      }).join(',');
    });
    const csv = [headerLine, ...lines].join('\n');
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao ler planilha.' });
  }
});

/**
 * POST /api/v1/postData
 * Body: { id }
 * 404 -> inválido | 300 -> já entrou | 200 -> sucesso
 */
app.post('/api/v1/postData', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ message: 'please provide an ID' });
    }

    const found = await findById(id);
    if (!found) {
      return res.status(404).json({ message: 'Person not found!' }); // "invalid token"
    }

    const { rowNumber, record, headerMap } = found;
    const checkedStr = String(record.checked || '').toLowerCase();
    const alreadyChecked =
      checkedStr === 'true' || checkedStr === 'yes' || checkedStr === '1' || checkedStr === 'checked';

    if (alreadyChecked) {
      return res.status(300).json({ message: 'Person allready checked' });
    }

    await markChecked(rowNumber, headerMap);

    // resposta compatível com o projeto original
    return res.status(200).json({
      email: record.email,
      username: record.username,
      teamName: record.teamName,
      tShirt: record.tShirt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar verificação.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ app is listening on port ${PORT}`);
});
