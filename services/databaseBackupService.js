const mysql = require('mysql2');
const pool = require('../config/db');

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function sqlLiteral(value) {
  return mysql.escape(value);
}

async function safeQuery(connection, sql) {
  try {
    const [rows] = await connection.query(sql);
    return rows;
  } catch (error) {
    return { __backupError: error };
  }
}

async function appendTableData(connection, tableName, chunks) {
  const quoted = quoteIdentifier(tableName);
  const batchSize = 500;
  let offset = 0;

  while (true) {
    const [rows, fields] = await connection.query(`SELECT * FROM ${quoted} LIMIT ${batchSize} OFFSET ${offset}`);
    if (!rows.length) break;

    const columns = fields.map(field => quoteIdentifier(field.name)).join(', ');
    const values = rows.map(row => {
      const rowValues = fields.map(field => sqlLiteral(row[field.name]));
      return `(${rowValues.join(', ')})`;
    });

    chunks.push(`INSERT INTO ${quoted} (${columns}) VALUES\n${values.join(',\n')};\n`);
    offset += rows.length;
    if (rows.length < batchSize) break;
  }
}

async function buildSqlBackup({ requestedBy = 'administrador' } = {}) {
  const connection = await pool.getConnection();
  const chunks = [];
  const databaseName = process.env.DB_NAME || 'rebanado';
  const generatedAt = new Date();

  try {
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');

    chunks.push('-- CHC Rebanado Digital - respaldo completo de base de datos\n');
    chunks.push(`-- Base de datos: ${databaseName}\n`);
    chunks.push(`-- Generado: ${generatedAt.toISOString()}\n`);
    chunks.push(`-- Solicitado por: ${requestedBy}\n\n`);
    chunks.push('SET NAMES utf8mb4;\n');
    chunks.push('SET FOREIGN_KEY_CHECKS=0;\n');
    chunks.push('SET UNIQUE_CHECKS=0;\n\n');

    const [objects] = await connection.query('SHOW FULL TABLES');
    const objectNameKey = objects.length ? Object.keys(objects[0]).find(key => /^Tables_in_/i.test(key)) : null;
    const objectTypeKey = objects.length ? Object.keys(objects[0]).find(key => /Table_type/i.test(key)) : null;

    const tables = [];
    const views = [];

    for (const object of objects) {
      const name = objectNameKey ? object[objectNameKey] : Object.values(object)[0];
      const type = objectTypeKey ? String(object[objectTypeKey]).toUpperCase() : 'BASE TABLE';
      if (type === 'VIEW') views.push(name);
      else tables.push(name);
    }

    for (const tableName of tables) {
      const quoted = quoteIdentifier(tableName);
      const [createRows] = await connection.query(`SHOW CREATE TABLE ${quoted}`);
      const createSql = createRows[0]?.['Create Table'];
      if (!createSql) continue;

      chunks.push(`\n-- --------------------------------------------------------\n-- Tabla: ${tableName}\n-- --------------------------------------------------------\n`);
      chunks.push(`DROP TABLE IF EXISTS ${quoted};\n`);
      chunks.push(`${createSql};\n\n`);
      await appendTableData(connection, tableName, chunks);
    }

    for (const viewName of views) {
      const quoted = quoteIdentifier(viewName);
      const [createRows] = await connection.query(`SHOW CREATE VIEW ${quoted}`);
      const createSql = createRows[0]?.['Create View'];
      if (!createSql) continue;

      chunks.push(`\n-- --------------------------------------------------------\n-- Vista: ${viewName}\n-- --------------------------------------------------------\n`);
      chunks.push(`DROP VIEW IF EXISTS ${quoted};\n`);
      chunks.push(`${createSql};\n`);
    }

    const triggerRows = await safeQuery(connection, 'SHOW TRIGGERS');
    if (!triggerRows.__backupError && Array.isArray(triggerRows)) {
      for (const trigger of triggerRows) {
        const triggerName = trigger.Trigger;
        if (!triggerName) continue;
        const [createRows] = await connection.query(`SHOW CREATE TRIGGER ${quoteIdentifier(triggerName)}`);
        const createSql = createRows[0]?.['SQL Original Statement'] || createRows[0]?.['Create Trigger'];
        if (!createSql) continue;

        chunks.push(`\n-- Trigger: ${triggerName}\n`);
        chunks.push('DELIMITER ;;\n');
        chunks.push(`DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)};;\n`);
        chunks.push(`${createSql};;\n`);
        chunks.push('DELIMITER ;\n');
      }
    }

    chunks.push('\nSET UNIQUE_CHECKS=1;\n');
    chunks.push('SET FOREIGN_KEY_CHECKS=1;\n');
    chunks.push('-- Fin del respaldo CHC Rebanado Digital\n');

    await connection.commit();
    return chunks.join('');
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

function buildBackupFilename(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `respaldo_rebanado_${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}.sql`;
}

module.exports = {
  buildSqlBackup,
  buildBackupFilename,
  quoteIdentifier,
  sqlLiteral
};
