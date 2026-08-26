const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');

const connectionQueries = [];
let nextId = 300;
const fakeConnection = {
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  query: async (sql, params) => {
    connectionQueries.push({ sql, params });
    if (sql.includes('INSERT INTO vales')) return [{ insertId: nextId++ }];
    if (sql.startsWith('UPDATE vales SET folio')) return [{ affectedRows: 1 }];
    if (sql.includes('INSERT INTO vale_productos')) return [{ affectedRows: 1 }];
    if (sql.includes('INSERT INTO vale_history')) return [{ affectedRows: 1 }];
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

const fakeDb = {
  getConnection: async () => fakeConnection,
  query: async () => { throw new Error('La creación debe usar la conexión transaccional.'); }
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: fakeDb
};
delete require.cache[controllerPath];
const valeController = require(controllerPath);

function requestBody(lugarEntrega) {
  const body = {
    origen: 'Manual',
    numero_pedido: 'PED-1',
    cliente: 'Cliente de prueba',
    fecha_entrega: '2026-08-29',
    prioridad: 'Normal',
    observaciones: '',
    sku: '1101001',
    producto: 'Jamón de prueba',
    cantidad: '2',
    presentacion: 'Rebanada',
    tipo_rebanado: 'Estándar'
  };
  if (lugarEntrega !== undefined) body.lugar_entrega = lugarEntrega;
  return body;
}

async function createVale(lugarEntrega) {
  const req = {
    body: requestBody(lugarEntrega),
    session: { user: { id: 7 } }
  };
  const res = {
    redirectUrl: null,
    redirect(url) { this.redirectUrl = url; }
  };
  await valeController.crearVale(req, res);
  assert.match(res.redirectUrl, /^\/vales\/tablero/);
}

(async () => {
  await createVale('  Andén 2\nCEDIS Querétaro  ');
  await createVale(undefined);

  const inserts = connectionQueries.filter(item => item.sql.includes('INSERT INTO vales'));
  assert.strictEqual(inserts.length, 2);
  assert.strictEqual((inserts[0].sql.match(/\?/g) || []).length, inserts[0].params.length);
  assert.strictEqual(inserts[0].params[4], 'Andén 2 CEDIS Querétaro');
  assert.strictEqual(inserts[1].params[4], null);
  console.log('Pruebas de lugar de entrega en vales manuales: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
