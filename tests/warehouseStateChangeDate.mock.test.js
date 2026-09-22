const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');

let pantallaSql = '';
let pantallaParams = [];
let queryCount = 0;

const db = {
  query: async (sql, params = []) => {
    queryCount += 1;
    if (sql.includes('FROM vales v')) {
      pantallaSql = sql;
      pantallaParams = params;
      return [[{
        id: 91,
        folio: 'VM-2609-0091',
        origen: 'Siclik',
        numero_pedido: 'PRB-ANTERIOR',
        sap_docnum: 237224,
        external_key: 'sap-order-91',
        cliente: 'CLIENTE ENTREGADO HOY',
        lugar_entrega: 'Centro, Querétaro',
        prioridad: 'Normal',
        estado: 'Entregado',
        updated_at: '2026-09-08T16:05:00.000Z',
        entregado_at: '2026-09-08T16:05:00.000Z',
        cancelado_at: null,
        entrega_dias_texto: null,
        fecha_entrega_fmt: '2026-09-01',
        entrega_fecha_inicio_fmt: null,
        entrega_fecha_fin_fmt: null
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

const req = { query: { fecha: '2026-09-08' } };
const res = {
  rendered: null,
  statusCode: 200,
  render(view, data) {
    this.rendered = { view, data };
    return this.rendered;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  send(message) {
    throw new Error(message);
  }
};

(async () => {
  await controller.pantallaController(req, res);

  assert.strictEqual(queryCount, 2);
  assert.match(pantallaSql, /MAX\(CASE WHEN estado_nuevo = 'Entregado' THEN created_at END\)/);
  assert.match(pantallaSql, /DATE\(CONVERT_TZ\(COALESCE\(sh\.entregado_at, v\.updated_at\), '\+00:00', '-06:00'\)\) = \?/);
  assert.match(pantallaSql, /v\.estado = 'Cancelado'/);
  assert.deepStrictEqual(pantallaParams, Array(4).fill('2026-09-08'));
  assert.strictEqual(res.rendered.view, 'pantalla');
  assert.strictEqual(res.rendered.data.estados.Entregado.length, 1);
  assert.strictEqual(res.rendered.data.estados.Entregado[0].folio, 'VM-2609-0091');
  assert.strictEqual(res.rendered.data.estados.Entregado[0].fecha_entrega_fmt, '2026-09-01');

  console.log('Pruebas de entregados por fecha real del cambio de estado: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
