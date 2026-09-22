const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {} };

const permissionService = require('../services/permissionService');

const normalRebanado = {
  'vales.state.pending': true,
  'vales.state.rebanando': true,
  'vales.state.listo': true,
  // Incluso si una configuración vieja lo dejara en true, el perfil no puede entregar.
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
  ['Pendiente', 'Listo', 'Cancelado']
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Listo'),
  ['Rebanando', 'Cancelado']
);
assert(!permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Listo').includes('Entregado'));
assert(!permissionService.getAllowedStateTargets(normalRebanado, 'rebanado', 'Pendiente').includes('Listo'));

const correctionMode = {
  ...normalRebanado,
  'vales.state.manage_all': true
};

// V19.0.16: una comanda ya entregada sólo puede pasar a Cancelado
// para CEDIS o Administrador. Almacén/Rebanado ya no pueden tocarla.
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(correctionMode, 'cedis', 'Entregado'),
  ['Cancelado']
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(correctionMode, 'administrador', 'Entregado'),
  ['Cancelado']
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(correctionMode, 'almacen', 'Entregado'),
  []
);
assert.deepStrictEqual(
  permissionService.getAllowedStateTargets(correctionMode, 'rebanado', 'Entregado'),
  []
);
assert(permissionService.getAllowedStateTargets(correctionMode, 'cedis', 'Pendiente').includes('Entregado'));

console.log('Pruebas de permisos y transiciones de estado: OK');
