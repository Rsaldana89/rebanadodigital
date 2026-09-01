const assert = require('assert');
const inventoryService = require('../services/inventoryService');

let balance = { unsliced: 10, sliced: 2 };
let nextMovementId = 1;
const movements = [];

const connection = {
  query: async (sql, params = []) => {
    if (sql.includes('FROM vale_productos') && sql.includes('WHERE vale_id')) {
      return [[
        { id: 10, sku: '1101001', producto: 'Jamón AROOS', cantidad: 2 },
        { id: 11, sku: '1101001', producto: 'Otra descripción del mismo SKU', cantidad: 3 }
      ]];
    }
    if (sql.includes('INSERT IGNORE INTO productos_rebanables')) return [{ affectedRows: 0 }];
    if (sql.includes('INSERT IGNORE INTO inventario_existencias')) return [{ affectedRows: 0 }];
    if (sql.includes('FROM inventario_existencias') && sql.includes('FOR UPDATE')) {
      return [[{
        sku: params[0],
        cantidad_sin_rebanar: balance.unsliced,
        cantidad_rebanado_queda: balance.sliced
      }]];
    }
    if (sql.startsWith('UPDATE inventario_existencias')) {
      balance = { unsliced: Number(params[0]), sliced: Number(params[1]) };
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO inventario_movimientos')) {
      const movement = {
        id: nextMovementId++,
        fecha_operacion: params[0],
        sku: params[1],
        tipo: params[2],
        cantidad: params[3],
        delta_sin_rebanar: params[4],
        delta_rebanado_queda: params[5],
        cantidad_rebanada_historial: params[6],
        cantidad_merma: params[7],
        saldo_sin_rebanar: params[8],
        saldo_rebanado_queda: params[9],
        vale_id: params[10],
        reversed_at: null
      };
      movements.push(movement);
      return [{ insertId: movement.id }];
    }
    if (sql.includes("tipo = 'SALIDA_VALE'") && sql.includes('reversed_at IS NULL')) {
      return [movements.filter(item => item.vale_id === Number(params[0]) && item.tipo === 'SALIDA_VALE' && !item.reversed_at)];
    }
    if (sql.startsWith('UPDATE inventario_movimientos')) {
      const original = movements.find(item => item.id === Number(params[2]));
      original.reversed_at = 'NOW';
      original.reversal_movement_id = params[1];
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

(async () => {
  await inventoryService.applyValeDelivery(connection, 50, 70, 7, '2026-09-01');
  assert.deepStrictEqual(balance, { unsliced: 7, sliced: 0 });
  assert.strictEqual(movements.length, 1, 'Los renglones del mismo SKU deben consolidarse.');
  assert.strictEqual(movements[0].cantidad, 5);
  assert.strictEqual(movements[0].cantidad_rebanada_historial, 3);
  assert.strictEqual(movements[0].delta_rebanado_queda, -2);
  assert.strictEqual(movements[0].delta_sin_rebanar, -3);

  await inventoryService.reverseValeDelivery(connection, 50, 71, 7, '2026-09-01');
  assert.deepStrictEqual(balance, { unsliced: 10, sliced: 2 });
  assert.strictEqual(movements.length, 2);
  assert.strictEqual(movements[0].reversal_movement_id, movements[1].id);
  console.log('Pruebas de salida y reversión transaccional de inventario: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

