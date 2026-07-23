const db = require('../config/db');

const PERMISSIONS = [
  { code: 'dashboard.view', category: 'General', name: 'Ver inicio', description: 'Acceder al resumen operativo.', sort: 10 },
  { code: 'vales.view', category: 'Vales', name: 'Consultar vales', description: 'Ver tablero, detalle e historial.', sort: 20 },
  { code: 'vales.create', category: 'Vales', name: 'Crear vales', description: 'Registrar nuevas solicitudes de rebanado con uno o varios productos.', sort: 30 },
  { code: 'vales.edit', category: 'Vales', name: 'Editar vales', description: 'Corregir datos generales y productos de una comanda.', sort: 35 },
  { code: 'vales.state.pending', category: 'Estados', name: 'Marcar Pendiente', description: 'Cambiar un vale al estado Pendiente.', sort: 40 },
  { code: 'vales.state.rebanando', category: 'Estados', name: 'Marcar Rebanando', description: 'Cambiar un vale al estado Rebanando.', sort: 50 },
  { code: 'vales.state.listo', category: 'Estados', name: 'Marcar Listo', description: 'Cambiar un vale al estado Listo.', sort: 60 },
  { code: 'vales.state.entregado', category: 'Estados', name: 'Marcar Entregado', description: 'Confirmar la entrega de un vale.', sort: 70 },
  { code: 'vales.state.cancelado', category: 'Estados', name: 'Cancelar vale', description: 'Cambiar un vale al estado Cancelado.', sort: 80 },
  { code: 'vales.state.manage_all', category: 'Estados', name: 'Corregir estados libremente', description: 'Permite avanzar o regresar entre estados para corregir errores.', sort: 90 },
  { code: 'inventario.manage', category: 'Módulos', name: 'Cierre de día', description: 'Registrar inventario, sobrantes y merma.', sort: 100 },
  { code: 'reportes.view', category: 'Módulos', name: 'Reportes', description: 'Consultar y exportar reportes de vales.', sort: 110 },
  { code: 'users.manage', category: 'Administración', name: 'Administrar usuarios', description: 'Crear, editar y activar usuarios.', sort: 120 },
  { code: 'permissions.manage', category: 'Administración', name: 'Administrar permisos', description: 'Modificar permisos por rol y excepciones por usuario.', sort: 130 }
];

const ROLES = ['administrador', 'cedis', 'almacen', 'rebanado'];

const DEFAULTS = {
  administrador: PERMISSIONS.reduce((acc, item) => ({ ...acc, [item.code]: true }), {}),
  cedis: {
    'dashboard.view': true,
    'vales.view': true,
    'vales.create': true,
    'vales.edit': true,
    'vales.state.pending': true,
    'vales.state.rebanando': true,
    'vales.state.listo': true,
    'vales.state.entregado': true,
    'vales.state.cancelado': true,
    'vales.state.manage_all': true,
    'inventario.manage': true,
    'reportes.view': true,
    'users.manage': false,
    'permissions.manage': false
  },
  almacen: {
    'dashboard.view': true,
    'vales.view': true,
    'vales.create': true,
    'vales.edit': true,
    'vales.state.pending': true,
    'vales.state.rebanando': true,
    'vales.state.listo': true,
    'vales.state.entregado': true,
    'vales.state.cancelado': true,
    'vales.state.manage_all': true,
    'inventario.manage': true,
    'reportes.view': true,
    'users.manage': false,
    'permissions.manage': false
  },
  rebanado: {
    'dashboard.view': true,
    'vales.view': true,
    'vales.create': false,
    'vales.edit': false,
    'vales.state.pending': false,
    'vales.state.rebanando': true,
    'vales.state.listo': true,
    'vales.state.entregado': false,
    'vales.state.cancelado': true,
    'vales.state.manage_all': false,
    'inventario.manage': true,
    'reportes.view': false,
    'users.manage': false,
    'permissions.manage': false
  }
};

const STATE_PERMISSION = {
  Pendiente: 'vales.state.pending',
  Rebanando: 'vales.state.rebanando',
  Listo: 'vales.state.listo',
  Entregado: 'vales.state.entregado',
  Cancelado: 'vales.state.cancelado'
};

async function initializePermissions() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS permission_catalog (
      code VARCHAR(80) PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255),
      sort_order INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role VARCHAR(30) NOT NULL,
      permission_code VARCHAR(80) NOT NULL,
      allowed TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (role, permission_code),
      CONSTRAINT fk_role_permission_catalog
        FOREIGN KEY (permission_code) REFERENCES permission_catalog(code)
        ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INT NOT NULL,
      permission_code VARCHAR(80) NOT NULL,
      allowed TINYINT(1) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, permission_code),
      CONSTRAINT fk_user_permission_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_user_permission_catalog
        FOREIGN KEY (permission_code) REFERENCES permission_catalog(code)
        ON DELETE CASCADE
    )
  `);

  for (const permission of PERMISSIONS) {
    await db.query(
      `INSERT INTO permission_catalog (code, category, name, description, sort_order, active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         category = VALUES(category),
         name = VALUES(name),
         description = VALUES(description),
         sort_order = VALUES(sort_order),
         active = 1`,
      [permission.code, permission.category, permission.name, permission.description, permission.sort]
    );
  }

  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      const allowed = DEFAULTS[role]?.[permission.code] ? 1 : 0;
      await db.query(
        `INSERT IGNORE INTO role_permissions (role, permission_code, allowed)
         VALUES (?, ?, ?)`,
        [role, permission.code, allowed]
      );
    }
  }

  // El administrador siempre conserva control total.
  await db.query(`UPDATE role_permissions SET allowed = 1 WHERE role = 'administrador'`);
}

async function getRolePermissionMatrix() {
  const [rows] = await db.query(
    `SELECT pc.code, pc.category, pc.name, pc.description, pc.sort_order,
            rp.role, rp.allowed
     FROM permission_catalog pc
     LEFT JOIN role_permissions rp ON rp.permission_code = pc.code
     WHERE pc.active = 1
     ORDER BY pc.sort_order, pc.code`
  );

  const permissions = PERMISSIONS.map(permission => ({ ...permission, roles: {} }));
  const map = new Map(permissions.map(item => [item.code, item]));

  rows.forEach(row => {
    const item = map.get(row.code);
    if (item && row.role) item.roles[row.role] = Boolean(row.allowed);
  });

  return permissions;
}

async function getEffectivePermissions(user) {
  if (!user) return {};
  if (user.role === 'administrador') {
    return PERMISSIONS.reduce((acc, item) => ({ ...acc, [item.code]: true }), {});
  }

  const [rows] = await db.query(
    `SELECT pc.code,
            COALESCE(up.allowed, rp.allowed, 0) AS allowed
     FROM permission_catalog pc
     LEFT JOIN role_permissions rp
       ON rp.permission_code = pc.code AND rp.role = ?
     LEFT JOIN user_permissions up
       ON up.permission_code = pc.code AND up.user_id = ?
     WHERE pc.active = 1`,
    [user.role, user.id]
  );

  return rows.reduce((acc, row) => {
    acc[row.code] = Boolean(row.allowed);
    return acc;
  }, {});
}

async function getUserPermissionOverrides(userId) {
  const [rows] = await db.query(
    `SELECT permission_code, allowed
     FROM user_permissions
     WHERE user_id = ?`,
    [userId]
  );
  return rows.reduce((acc, row) => {
    acc[row.permission_code] = Boolean(row.allowed);
    return acc;
  }, {});
}

function hasPermission(permissionMap, code) {
  return Boolean(permissionMap && permissionMap[code]);
}

function getAllowedStateTargets(permissionMap, role, currentState) {
  const allStates = Object.keys(STATE_PERMISSION);
  const canManageAll = hasPermission(permissionMap, 'vales.state.manage_all');

  let transitionTargets;
  if (canManageAll) {
    transitionTargets = allStates;
  } else {
    const standardTransitions = {
      Pendiente: ['Rebanando', 'Cancelado'],
      Rebanando: ['Listo', 'Cancelado'],
      Listo: ['Rebanando', 'Cancelado'],
      Entregado: [],
      Cancelado: []
    };
    transitionTargets = standardTransitions[currentState] || [];
  }

  return transitionTargets.filter(state => hasPermission(permissionMap, STATE_PERMISSION[state]));
}

function permissionForState(state) {
  return STATE_PERMISSION[state] || null;
}

module.exports = {
  PERMISSIONS,
  ROLES,
  DEFAULTS,
  initializePermissions,
  getRolePermissionMatrix,
  getEffectivePermissions,
  getUserPermissionOverrides,
  hasPermission,
  getAllowedStateTargets,
  permissionForState
};
