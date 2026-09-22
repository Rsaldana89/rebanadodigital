const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {} };
const permissionService = require('../services/permissionService');

const permissions = {
  'vales.state.pending': true,
  'vales.state.rebanando': true,
  'vales.state.listo': true,
  'vales.state.entregado': true,
  'vales.state.cancelado': true,
  'vales.state.manage_all': true
};

assert.deepStrictEqual(permissionService.getAllowedStateTargets(permissions, 'cedis', 'Entregado'), ['Cancelado']);
assert.deepStrictEqual(permissionService.getAllowedStateTargets(permissions, 'administrador', 'Entregado'), ['Cancelado']);
assert.deepStrictEqual(permissionService.getAllowedStateTargets(permissions, 'almacen', 'Entregado'), []);
assert.deepStrictEqual(permissionService.getAllowedStateTargets(permissions, 'rebanado', 'Entregado'), []);

const board = fs.readFileSync(path.resolve(__dirname, '../views/vales/tablero.ejs'), 'utf8');
assert(board.includes("const canCancel = vale.estado !== 'Cancelado' && allowedStates.includes('Cancelado');"));

console.log('Pruebas de cancelacion de entregados por perfil: OK');
