const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const inventoryPath = path.resolve(__dirname, '../services/inventoryService.js');
const controllerPath = path.resolve(__dirname, '../controllers/valeController.js');
let currentState = 'Listo';
let historyId = 90;
let committed = 0;
let rolledBack = 0;
const inventoryCalls = [];

const connection = {
  beginTransaction: async () => {},
  commit: async () => { committed += 1; },
  rollback: async () => { rolledBack += 1; },
  release: () => {},
  query: async (sql, params) => {
    if (sql.includes('SELECT estado FROM vales')) return [[{ estado: currentState }]];
    if (sql.startsWith('UPDATE vales SET estado')) {
      currentState = params[0];
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO vale_history')) return [{ insertId: historyId++ }];
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
    applyValeDelivery: async (...args) => inventoryCalls.push({ type: 'apply', args }),
    reverseValeDelivery: async (...args) => inventoryCalls.push({ type: 'reverse', args })
  }
};
delete require.cache[controllerPath];
const controller = require(controllerPath);

function response() {
  return { redirectUrl: null, redirect(url) { this.redirectUrl = url; } };
}

function request(nextState) {
  return {
    params: { id: '25' },
    body: { nuevo_estado: nextState, return_url: '/vales/25' },
    permissions: {
      'vales.state.manage_all': true,
      'vales.state.entregado': true,
      'vales.state.rebanando': true
    },
    session: { user: { id: 7, role: 'cedis' } }
  };
}

(async () => {
  const deliveredResponse = response();
  await controller.cambiarEstado(request('Entregado'), deliveredResponse);
  assert.strictEqual(deliveredResponse.redirectUrl, '/vales/25');
  assert.strictEqual(inventoryCalls[0].type, 'apply');
  assert.strictEqual(currentState, 'Entregado');

  const reopenedResponse = response();
  await controller.cambiarEstado(request('Rebanando'), reopenedResponse);
  assert.strictEqual(reopenedResponse.redirectUrl, '/vales/25');
  assert.strictEqual(inventoryCalls[1].type, 'reverse');
  assert.strictEqual(currentState, 'Rebanando');
  assert.strictEqual(committed, 2);
  assert.strictEqual(rolledBack, 0);
  console.log('Pruebas de estados de vale ligados al inventario: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

