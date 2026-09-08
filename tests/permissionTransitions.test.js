const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {} };

const permissionService = require('../services/permissionService');

const normalRebanado = {
  'vales.state.rebanando': true,
  'vales.state.listo': true,
  'vales.state.entregado': true,
  'vales.state.cancelado': true,
  'vales.state.manage_all': false
};

assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Pendiente'),
  ['Rebanando', 'Cancelado']
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Rebanando'),
  ['Listo', 'Cancelado']
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Listo'),
  ['Entregado', 'Cancelado'],
  'Marcar Entregado debe habilitar Listo → Entregado sin exigir control libre.'
);
assert(!permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Rebanando').includes('Entregado'));

const withoutDelivered = { ...normalRebanado, 'vales.state.entregado': false };
assert(!permissionService.getAllowedStateTargets(withoutDelivered, 'rebanado', 'Listo').includes('Entregado'));

const correctionMode = {
  ...normalRebanado,
  'vales.state.pending': true,
  'vales.state.manage_all': true
};
assert(permissionService.getAllowedStateTargets(correctionMode, 'cedis', 'Entregado').includes('Pendiente'));
assert(permissionService.getAllowedStateTargets(correctionMode, 'cedis', 'Pendiente').includes('Entregado'));

console.log('Pruebas de permisos y transiciones de estado: OK');
