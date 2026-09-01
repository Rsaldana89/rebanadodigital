const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const servicePath = path.resolve(__dirname, '../services/inventoryService.js');
let balance = { unsliced: 10, sliced: 1 };
let closeMovement = null;
let closeDetail = null;

const connection = {
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  query: async (sql, params = []) => {
    if (sql.includes('INSERT INTO cierres_rebanado')) return [{ affectedRows: 1 }];
    if (sql.includes('SELECT id FROM cierres_rebanado')) return [[{ id: 1 }]];
    if (sql.includes('INSERT IGNORE INTO productos_rebanables')) return [{ affectedRows: 0 }];
    if (sql.includes('INSERT IGNORE INTO inventario_existencias')) return [{ affectedRows: 0 }];
    if (sql.includes('FROM inventario_existencias') && sql.includes('FOR UPDATE')) {
      return [[{ sku: params[0], cantidad_sin_rebanar: balance.unsliced, cantidad_rebanado_queda: balance.sliced }]];
    }
    if (sql.includes('FROM inventario_movimientos WHERE event_key')) return [[closeMovement]];
    if (sql.startsWith('UPDATE inventario_existencias')) {
      balance = { unsliced: Number(params[0]), sliced: Number(params[1]) };
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO cierre_rebanado_detalles')) {
      closeDetail = { sliced: Number(params[2]), waste: Number(params[3]) };
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO inventario_movimientos')) {
      closeMovement = {
        event_key: params[12],
        delta_sin_rebanar: Number(params[3]),
        delta_rebanado_queda: Number(params[4]),
        cantidad_rebanada_historial: Number(params[5]),
        cantidad_merma: Number(params[6])
      };
      return [{ insertId: 1 }];
    }
    if (sql.startsWith('UPDATE inventario_movimientos')) {
      closeMovement = {
        event_key: params[12],
        delta_sin_rebanar: Number(params[3]),
        delta_rebanado_queda: Number(params[4]),
        cantidad_rebanada_historial: Number(params[5]),
        cantidad_merma: Number(params[6])
      };
      return [{ affectedRows: 1 }];
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
  await inventoryService.saveClose({
    date: '2026-09-01', observations: '', userId: 7,
    details: [{ sku: '1101001', producto: 'Jamón AROOS', rebanadoQueda: 4, merma: 1 }]
  });
  assert.deepStrictEqual(balance, { unsliced: 6, sliced: 4 });
  assert.deepStrictEqual(closeDetail, { sliced: 4, waste: 1 });
  assert.strictEqual(closeMovement.cantidad_rebanada_historial, 3);
  assert.strictEqual(closeMovement.cantidad_merma, 1);

  await inventoryService.saveClose({
    date: '2026-09-01', observations: 'Corrección', userId: 7,
    details: [{ sku: '1101001', producto: 'Jamón AROOS', rebanadoQueda: 2, merma: 0 }]
  });
  assert.deepStrictEqual(balance, { unsliced: 9, sliced: 2 }, 'Corregir el cierre debe reemplazar su efecto anterior.');
  assert.strictEqual(closeMovement.cantidad_rebanada_historial, 1);
  assert.strictEqual(closeMovement.cantidad_merma, 0);
  console.log('Pruebas de cierre corregible sin duplicar inventario: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

