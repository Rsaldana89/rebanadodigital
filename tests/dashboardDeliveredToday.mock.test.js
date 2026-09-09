const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const controllerPath = path.resolve(__dirname, '../controllers/dashboardController.js');
let summarySql = '';
let summaryParams = [];
let calls = 0;

const db = {
  query: async (sql, params = []) => {
    calls += 1;
    if (calls === 1) {
      summarySql = sql;
      summaryParams = params;
      return [[{ estado: 'Entregado', total: 4 }, { estado: 'Listo', total: 2 }]];
    }
    if (calls === 2) return [[{ total: 1 }]];
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
delete require.cache[controllerPath];
const controller = require(controllerPath);

const req = { query: { fecha: '2026-09-09' }, session: { user: { role: 'rebanado' } } };
const res = {
  rendered: null,
  render(view, data) { this.rendered = { view, data }; return this.rendered; },
  redirect(url) { throw new Error(`Redirección inesperada: ${url}`); }
};

(async () => {
  await controller.index(req, res);
  assert.match(summarySql, /v\.estado = 'Entregado'/);
  assert.match(summarySql, /sh\.entregado_at/);
  assert.deepStrictEqual(summaryParams, Array(4).fill('2026-09-09'));
  assert.strictEqual(res.rendered.data.summary.Entregado, 4);
  assert.strictEqual(res.rendered.data.summary.Listo, 2);
  console.log('Pruebas de entregados del día en dashboard: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
