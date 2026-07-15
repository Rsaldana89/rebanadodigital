const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Carga el archivo .env de la raiz del proyecto y sobrescribe valores anteriores.
// Esto evita que Node tome datos viejos como DB_USER=tu_usuario.
dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  override: true
});

console.log('Conectando a MySQL con:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
