const assert = require('assert');
const { enrichValeDelivery } = require('../services/valeDeliveryService');

const ranged = enrichValeDelivery({
  estado: 'Pendiente',
  fecha_entrega_fmt: '2026-07-28',
  entrega_fecha_inicio_fmt: '2026-07-28',
  entrega_fecha_fin_fmt: '2026-08-07',
  entrega_dias_texto: '28/07/2026 - 07/08/2026'
}, '2026-07-29');
assert.strictEqual(ranged.entrega_display, '28/07/2026 - 07/08/2026');
assert.strictEqual(ranged.entrega_es_rango, true);
assert.strictEqual(ranged.is_overdue, false);

const overdue = enrichValeDelivery({
  estado: 'Pendiente',
  fecha_entrega_fmt: '2026-07-28',
  entrega_fecha_inicio_fmt: '2026-07-28',
  entrega_fecha_fin_fmt: '2026-08-07',
  entrega_dias_texto: '28/07/2026 - 07/08/2026'
}, '2026-08-09');
assert.strictEqual(overdue.is_overdue, true);
assert.strictEqual(overdue.days_late, 2);

const manual = enrichValeDelivery({
  estado: 'Pendiente',
  fecha_entrega_fmt: '2026-07-29'
}, '2026-07-29');
assert.strictEqual(manual.entrega_display, '29/07/2026');
assert.strictEqual(manual.entrega_es_rango, false);
assert.strictEqual(manual.is_overdue, false);

console.log('Pruebas de fecha/rango operativo: OK');
