const assert = require('assert');
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../config/db' && parent && /reportController\.js$/.test(parent.filename)) {
    return { query: async () => [[]] };
  }
  return originalLoad.apply(this, arguments);
};

const reportController = require('../controllers/reportController');
Module._load = originalLoad;

const { normalizeFilters, displayDate, addDays, deliveryText } = reportController._test;
const filters = normalizeFilters({ tipo: 'productos', fecha_inicio: '2026-09-09', fecha_fin: '2026-09-01', estado: 'Listo' });
assert.strictEqual(filters.tipo, 'productos');
assert.strictEqual(filters.fecha_inicio, '2026-09-01');
assert.strictEqual(filters.fecha_fin, '2026-09-09');
assert.strictEqual(filters.estado, 'Listo');
assert.strictEqual(displayDate('2026-09-09'), '09/09/2026');
assert.strictEqual(addDays('2026-09-09', -6), '2026-09-03');
assert.strictEqual(deliveryText({ entrega_fecha_inicio_fmt: '2026-09-09', entrega_fecha_fin_fmt: '2026-09-11' }), '09/09/2026 al 11/09/2026');
console.log('reportFilters.test.js OK');
