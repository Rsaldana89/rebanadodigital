const assert = require('assert');
const inventoryService = require('../services/inventoryService');

const { calculateValeAllocation, normalizeSku, normalizeDescription } = inventoryService;

assert.deepStrictEqual(
  calculateValeAllocation(5, 2),
  { quantity: 5, fromSliced: 2, fromUnsliced: 3 },
  'Debe usar primero el rebanado que queda.'
);

assert.deepStrictEqual(
  calculateValeAllocation(2, 5),
  { quantity: 2, fromSliced: 2, fromUnsliced: 0 },
  'Si alcanza el rebanado que queda no debe tocar el producto sin rebanar.'
);

assert.deepStrictEqual(
  calculateValeAllocation(4.25, 0),
  { quantity: 4.25, fromSliced: 0, fromUnsliced: 4.25 }
);

assert.strictEqual(normalizeSku(' 001101001 '), '001101001', 'El SKU debe conservar ceros iniciales.');
assert.strictEqual(normalizeDescription(' Jamón   de\nPavo '), 'Jamón de Pavo');
assert.throws(() => calculateValeAllocation(0, 10), /mayor a cero/);

console.log('Pruebas de reglas de inventario por SKU: OK');

