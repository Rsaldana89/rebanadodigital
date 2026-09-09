const assert = require('assert');
const { createWorkbook, _test } = require('../services/xlsxService');

const buffer = createWorkbook({
  sheets: [{
    name: 'Reporte',
    title: 'CHC · Prueba de Excel',
    meta: ['Periodo: 01/09/2026 al 09/09/2026'],
    columns: [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Cantidad', key: 'cantidad', type: 'number', width: 14 },
      { header: 'Participación', key: 'participacion', type: 'percent', width: 16 }
    ],
    rows: [{ sku: '1703008', cantidad: 12.5, participacion: 0.25 }]
  }]
});

assert.ok(Buffer.isBuffer(buffer));
assert.ok(buffer.length > 1000);
assert.strictEqual(buffer.readUInt32LE(0), 0x04034b50, 'El archivo debe iniciar como ZIP/XLSX');
assert.strictEqual(_test.colLetter(1), 'A');
assert.strictEqual(_test.colLetter(27), 'AA');
console.log('reportXlsx.test.js OK');
