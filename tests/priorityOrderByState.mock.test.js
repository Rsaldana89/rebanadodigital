const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');

const rows = [
  { id: 1, folio: 'VM-1', cliente: 'BAJA VIEJO', prioridad: 'Baja', estado: 'Pendiente', fecha_entrega_fmt: '2026-09-01' },
  { id: 2, folio: 'VM-2', cliente: 'ALTA HOY', prioridad: 'Alta', estado: 'Pendiente', fecha_entrega_fmt: '2026-09-22' },
  { id: 3, folio: 'VM-3', cliente: 'NORMAL VIEJO', prioridad: 'Normal', estado: 'Pendiente', fecha_entrega_fmt: '2026-09-02' },
  { id: 4, folio: 'VM-4', cliente: 'ALTA VIEJO', prioridad: 'Alta', estado: 'Pendiente', fecha_entrega_fmt: '2026-09-03' }
];

const db = {
  query: async (sql) => {
    if (sql.includes('FROM vales v')) return [rows];
    if (sql.includes('FROM vale_productos')) return [[]];
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
delete require.cache[controllerPath];
const controller = require(controllerPath);

const req = { query: { fecha: '2026-09-22' }, permissions: {}, session: { user: { id: 3, role: 'rebanado' } } };
const res = { render(view, data) { this.view = view; this.data = data; return data; } };

(async () => {
  await controller.tablero(req, res);
  assert.deepStrictEqual(res.data.estados.Pendiente.map(v => v.folio), ['VM-4', 'VM-2', 'VM-3', 'VM-1']);
  console.log('Pruebas de orden por prioridad dentro de cada estado: OK');
})().catch(error => { console.error(error); process.exit(1); });
