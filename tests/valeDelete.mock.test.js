const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const inventoryPath = path.resolve(__dirname, '../services/inventoryService.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');
let committed = 0;
let rolledBack = 0;
let deleted = false;
let auditUpdated = false;
const reversals = [];

const connection = {
  beginTransaction: async () => {},
  commit: async () => { committed += 1; },
  rollback: async () => { rolledBack += 1; },
  release: () => {},
  query: async (sql, params = []) => {
    if (sql.includes('SELECT id, folio, estado, external_key')) {
      return [[{ id: 25, folio: 'VM-2609-0025', estado: 'Entregado', external_key: null }]];
    }
    if (sql.includes('INSERT INTO vale_history')) return [{ insertId: 501 }];
    if (sql.startsWith('UPDATE inventario_movimientos')) {
      auditUpdated = params[0] === 'Vale eliminado VM-2609-0025' && params[2] === 25;
      return [{ affectedRows: 2 }];
    }
    if (sql.startsWith('DELETE FROM vales')) {
      deleted = params[0] === 25;
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Consulta no simulada: ${sql}`);
  }
};

require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getConnection: async () => connection }
};
require.cache[inventoryPath] = {
  id: inventoryPath, filename: inventoryPath, loaded: true,
  exports: {
    reverseValeDelivery: async (...args) => reversals.push(args)
  }
};
delete require.cache[controllerPath];
const controller = require(controllerPath);

const req = {
  params: { id: '25' },
  body: { return_url: '/vales/tablero?fecha=2026-09-08' },
  session: { user: { id: 1, name: 'Administrador', role: 'administrador' } }
};
const res = { redirectUrl: null, redirect(url) { this.redirectUrl = url; } };

(async () => {
  await controller.eliminarVale(req, res);
  assert.strictEqual(reversals.length, 1, 'Un vale entregado debe restaurar su inventario antes de borrarse.');
  assert.strictEqual(reversals[0][1], 25);
  assert.strictEqual(reversals[0][2], 501);
  assert.strictEqual(auditUpdated, true);
  assert.strictEqual(deleted, true);
  assert.strictEqual(committed, 1);
  assert.strictEqual(rolledBack, 0);
  assert.strictEqual(res.redirectUrl, '/vales/tablero?fecha=2026-09-08');
  assert.match(req.session.success_msg, /eliminado correctamente/);
  console.log('Pruebas de eliminación segura de vales: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
