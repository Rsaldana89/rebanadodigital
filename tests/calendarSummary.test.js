const assert = require('assert');
const valeController = require('../controllers/valeController');

const { calendarMonthBounds, summarizeCalendarRows } = valeController._test;

assert.deepStrictEqual(calendarMonthBounds(2026, 9), {
  start: '2026-09-01',
  end: '2026-09-30'
});

const summary = summarizeCalendarRows([
  { estado: 'Pendiente', fecha_inicio: '2026-09-03', fecha_fin: '2026-09-05' },
  { estado: 'Listo', fecha_inicio: '2026-09-05', fecha_fin: '2026-09-05' },
  { estado: 'Entregado', fecha_inicio: '2026-08-30', fecha_fin: '2026-09-01' }
], '2026-09-01', '2026-09-30');

assert.strictEqual(summary['2026-09-01'].total, 1);
assert.strictEqual(summary['2026-09-03'].total, 1);
assert.strictEqual(summary['2026-09-04'].total, 1);
assert.strictEqual(summary['2026-09-05'].total, 2);
assert.strictEqual(summary['2026-09-05'].estados.Pendiente, 1);
assert.strictEqual(summary['2026-09-05'].estados.Listo, 1);
assert.strictEqual(summary['2026-09-06'], undefined);

console.log('Pruebas de calendario y rangos de entrega: OK');

