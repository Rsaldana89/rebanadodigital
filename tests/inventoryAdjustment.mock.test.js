const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const servicePath = path.resolve(__dirname, '../services/inventoryService.js');
let balance = { unsliced: 4, sliced: 1.5 };
let movement = null;
let committed = 0;
let rolledBack = 0;

const connection = {
  beginTransaction: async () => {},
  commit: async () => { committed += 1; },
  rollback: async () => { rolledBack += 1; },
  release: () => {},
  query: async (sql, params = []) => {
    if (sql.includes('FROM productos_rebanables') && sql.includes('FOR UPDATE')) {
      return [[{ sku: '1101001', descripcion: 'Jamón AROOS' }]];
    }
    if (sql.includes('INSERT IGNORE INTO inventario_existencias')) return [{ affectedRows: 0 }];
    if (sql.includes('FROM inventario_existencias') && sql.includes('FOR UPDATE')) {
      return [[{ sku: params[0], cantidad_sin_rebanar: balance.unsliced, cantidad_rebanado_queda: balance.sliced }]];
    }
    if (sql.startsWith('UPDATE inventario_existencias')) {
      balance = { unsliced: Number(params[0]), sliced: Number(params[1]) };
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO inventario_movimientos')) {
      movement = {
        fecha: params[0], sku: params[1], tipo: params[2], cantidad: Number(params[3]),
        deltaUnsliced: Number(params[4]), deltaSliced: Number(params[5]),
        saldoUnsliced: Number(params[8]), saldoSliced: Number(params[9]),
        referencia: params[15], observaciones: params[16], userId: params[17]
      };
      return [{ insertId: 91 }];
    }
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getConnection: async () => connection }
};
delete require.cache[servicePath];
const inventoryService = require(servicePath);

(async () => {
  await inventoryService.adjustStock({
    sku: '1101001',
    targetUnsliced: '-2',
    targetSliced: '3',
    observations: 'Conteo físico de Administración',
    userId: 1,
    date: '2026-09-08'
  });

  assert.deepStrictEqual(balance, { unsliced: -2, sliced: 3 });
  assert.strictEqual(movement.tipo, 'AJUSTE_ADMIN');
  assert.strictEqual(movement.deltaUnsliced, -6);
  assert.strictEqual(movement.deltaSliced, 1.5);
  assert.strictEqual(movement.saldoUnsliced, -2);
  assert.strictEqual(movement.saldoSliced, 3);
  assert.match(movement.observaciones, /Anterior: 4\.00 sin rebanar y 1\.50 rebanado/);
  assert.strictEqual(committed, 1);
  assert.strictEqual(rolledBack, 0);

  await assert.rejects(
    inventoryService.adjustStock({
      sku: '1101001', targetUnsliced: '0', targetSliced: '-1', observations: 'Inválido', userId: 1, date: '2026-09-08'
    }),
    /no puede ser negativa/
  );

  console.log('Pruebas de corrección administrativa de inventario: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
