const assert = require('assert');
const inventoryService = require('../services/inventoryService');

const stock = [
  { sku: 'A', cantidad_rebanado_queda: 10 },
  { sku: 'B', cantidad_rebanado_queda: 3 }
];

const readyRows = [
  { vale_id: 1, sku: 'A', cantidad: 6, listo_desde: '2026-09-07T16:00:00.000Z' },
  { vale_id: 2, sku: 'A', cantidad: 6, listo_desde: '2026-09-07T17:00:00.000Z' }
];

const vales = [
  { id: 1, estado: 'Listo', productos: [{ sku: 'A', producto: 'Producto A', cantidad: 6 }] },
  { id: 2, estado: 'Listo', productos: [{ sku: 'A', producto: 'Producto A', cantidad: 6 }] },
  { id: 3, estado: 'Pendiente', productos: [{ sku: 'A', producto: 'Producto A', cantidad: 2 }] },
  {
    id: 4,
    estado: 'Rebanando',
    productos: [
      { sku: 'B', producto: 'Producto B', cantidad: 2 },
      { sku: 'A', producto: 'Producto A', cantidad: 1 }
    ]
  },
  { id: 5, estado: 'Entregado', productos: [{ sku: 'B', producto: 'Producto B', cantidad: 1 }] }
];

const result = inventoryService.calculateSlicedAvailability(vales, stock, readyRows);

assert.deepStrictEqual(result[0].rebanado_badge, {
  status: 'reserved',
  label: 'Rebanado apartado'
});

assert.strictEqual(result[1].rebanado_badge, null);
assert.deepStrictEqual(result[1].productos[0].rebanado_badge, {
  status: 'partial',
  label: '4/6 apartado'
});

assert.strictEqual(result[2].rebanado_badge, null, 'Lo apartado en Listo no debe ofrecerse a otros vales.');
assert.strictEqual(result[2].productos[0].rebanado_badge, undefined);

assert.strictEqual(result[3].rebanado_badge, null);
assert.deepStrictEqual(result[3].productos[0].rebanado_badge, {
  status: 'available',
  label: 'Disponible'
});
assert.deepStrictEqual(result[3].productos[1].rebanado_badge, {
  status: 'none',
  label: 'Por rebanar'
});

assert.strictEqual(result[4].rebanado_badge, null, 'Entregados y cancelados no muestran disponibilidad.');

const noStock = inventoryService.calculateSlicedAvailability(
  [{ id: 9, estado: 'Pendiente', productos: [{ sku: 'Z', cantidad: 4 }] }],
  [],
  []
);
assert.strictEqual(noStock[0].rebanado_badge, null);
assert.strictEqual(noStock[0].productos[0].rebanado_badge, undefined);

console.log('Pruebas de disponibilidad y apartado de rebanado: OK');
