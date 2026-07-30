const assert = require('assert');
const { parseEntregaDias } = require('../services/deliveryDateService');
const { lineaAplicaARebanado } = require('../services/rebanadoRules');

assert.deepStrictEqual(parseEntregaDias('29/07/2026'), {
  texto: '29/07/2026',
  fechaInicio: '2026-07-29',
  fechaFin: '2026-07-29'
});

assert.deepStrictEqual(parseEntregaDias('28/07/2026 - 07/08/2026'), {
  texto: '28/07/2026 - 07/08/2026',
  fechaInicio: '2026-07-28',
  fechaFin: '2026-08-07'
});

assert.deepStrictEqual(parseEntregaDias('28/07/2026-'), {
  texto: '28/07/2026-',
  fechaInicio: '2026-07-28',
  fechaFin: '2026-07-28'
});

assert.strictEqual(lineaAplicaARebanado({ presentacion: 'Rebanada Estándar', tipoRebanado: 'Estándar' }), true);
assert.strictEqual(lineaAplicaARebanado({ presentacion: 'Barra', tipoRebanado: '' }), false);
assert.strictEqual(lineaAplicaARebanado({ presentacion: '', tipoRebanado: '' }), false);
assert.strictEqual(lineaAplicaARebanado({ presentacion: 'Corte fino', tipoRebanado: 'Corte' }), true);

assert.throws(() => parseEntregaDias('31/02/2026'), /inválida|inexistente/);
assert.throws(() => parseEntregaDias('07/08/2026 - 28/07/2026'), /anterior/);

console.log('Pruebas de parser ENTREGA_DIAS y filtro de productos: OK');
