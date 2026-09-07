const assert = require('assert');
const valeController = require('../controllers/valeController');

const { formatMexicoDateTime, buildStateChangeMap } = valeController._test;

const formatted = formatMexicoDateTime('2026-09-07T17:13:00.000Z');
assert.deepStrictEqual(formatted, {
  date: '07/09/2026',
  time: '11:13',
  display: '07/09/2026 · 11:13'
});

const changes = buildStateChangeMap([
  { estado_nuevo: 'Listo', created_at: '2026-09-07T18:45:00.000Z' },
  { estado_nuevo: 'Rebanando', created_at: '2026-09-07T18:20:00.000Z' },
  { estado_nuevo: 'Listo', created_at: '2026-09-07T18:00:00.000Z' },
  { estado_nuevo: 'Pendiente', created_at: '2026-09-07T17:13:00.000Z' },
  { estado_nuevo: null, created_at: '2026-09-07T17:00:00.000Z' }
]);

assert.strictEqual(changes.Pendiente.display, '07/09/2026 · 11:13');
assert.strictEqual(changes.Rebanando.display, '07/09/2026 · 12:20');
assert.strictEqual(changes.Listo.display, '07/09/2026 · 12:45');
assert.strictEqual(changes.Entregado, undefined);
assert.strictEqual(changes.Cancelado, undefined);

console.log('Pruebas de horarios por cambio de estado: OK');
