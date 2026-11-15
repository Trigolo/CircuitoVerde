// Conexão com o MySQL usando um pool (reaproveita conexões)
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
  // Banco na nuvem (Aiven) exige conexão criptografada: DB_SSL=true e, se tiver, o certificado em DB_SSL_CA
  ssl: process.env.DB_SSL === 'true'
    ? (process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : { rejectUnauthorized: false })
    : undefined,
});

module.exports = pool;