const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');

let boardSql = '';
let boardParams = [];
let queryCount = 0;

const db = {
  query: async (sql, params = []) => {
    queryCount += 1;
    if (sql.includes('FROM vales v') && sql.includes('sh.listo_at')) {
      boardSql = sql;
      boardParams = params;
      return [[{
        id: 120,
        folio: 'VM-2609-0120',
        origen: 'Manual',
        numero_pedido: 'PRB-ANTERIOR',
        cliente: 'SUCURSAL DEMO',
        lugar_entrega: 'Querétaro',
        prioridad: 'Normal',
        estado: 'Entregado',
        updated_at: '2026-09-09T18:18:00.000Z',
        listo_at: '2026-09-09T16:42:00.000Z',
        entregado_at: '2026-09-09T17:18:00.000Z',
        cancelado_at: null,
        fecha_entrega_fmt: '2026-09-07',
        entrega_fecha_inicio_fmt: null,
        entrega_fecha_fin_fmt: null,
        entrega_dias_texto: null,
        creado_por: 'Operador'
      }]];
    }
    if (sql.includes('FROM vale_productos')) return [[]];
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: db
};
delete require.cache[controllerPath];
const controller = require(controllerPath);

const req = {
  query: { fecha: '2026-09-09' },
  permissions: {},
  session: { user: { id: 7, role: 'rebanado' } }
};
const res = {
  rendered: null,
  render(view, data) {
    this.rendered = { view, data };
    return this.rendered;
  },
  redirect(url) {
    throw new Error(`Redirección inesperada: ${url}`);
  }
};

(async () => {
  await controller.tablero(req, res);

  assert.strictEqual(queryCount, 2);
  assert.match(boardSql, /MAX\(CASE WHEN estado_nuevo = 'Listo' THEN created_at END\)/);
  assert.match(boardSql, /v\.estado = 'Entregado'/);
  assert.match(boardSql, /DATE\(CONVERT_TZ\(COALESCE\(sh\.entregado_at, v\.updated_at\), '\+00:00', '-06:00'\)\) = \?/);
  assert.deepStrictEqual(boardParams, Array(4).fill('2026-09-09'));
  assert.strictEqual(res.rendered.view, 'vales/tablero');
  assert.strictEqual(res.rendered.data.estados.Entregado.length, 1);
  assert.strictEqual(res.rendered.data.estados.Entregado[0].fecha_entrega_fmt, '2026-09-07');
  assert.strictEqual(res.rendered.data.estados.Entregado[0].listo_time, '10:42');
  assert.strictEqual(res.rendered.data.estados.Entregado[0].entregado_time, '11:18');

  console.log('Pruebas de entregados visibles en tablero operativo y horarios: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
