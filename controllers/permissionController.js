const db = require('../config/db');
const permissionService = require('../services/permissionService');
const settingsService = require('../services/settingsService');
const syncService = require('../services/rebanadoSyncService');

const editableRoles = ['cedis', 'almacen', 'rebanado'];

exports.index = async (req, res) => {
  try {
    const permissions = await permissionService.getRolePermissionMatrix();
    const [usuarios] = await db.query(
      `SELECT id, name, username, role, active
       FROM users
       ORDER BY role, name`
    );

    const isAdministrator = req.session.user.role === 'administrador';
    const syncSettings = isAdministrator ? await settingsService.getSyncAlertSettings() : null;
    const syncStatus = isAdministrator ? await syncService.getStatusForUi() : null;

    res.render('permisos/index', {
      title: 'Permisos y configuración',
      permissions,
      roles: ['administrador', ...editableRoles],
      usuarios,
      isAdministrator,
      syncSettings,
      syncStatus
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'No fue posible cargar permisos y configuración';
    res.redirect('/dashboard');
  }
};

exports.updateRoles = async (req, res) => {
  try {
    const permissions = permissionService.PERMISSIONS;

    for (const role of editableRoles) {
      for (const permission of permissions) {
        const fieldName = `p__${role}__${permission.code}`;
        const allowed = req.body[fieldName] ? 1 : 0;
        await db.query(
          `INSERT INTO role_permissions (role, permission_code, allowed)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
          [role, permission.code, allowed]
        );
      }
    }

    await db.query(`UPDATE role_permissions SET allowed = 1 WHERE role = 'administrador'`);
    req.session.success_msg = 'Permisos por rol actualizados';
    res.redirect('/permisos');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'No fue posible guardar los permisos por rol';
    res.redirect('/permisos');
  }
};

exports.userForm = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, username, role, active
       FROM users
       WHERE id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      req.session.error_msg = 'Usuario no encontrado';
      return res.redirect('/permisos');
    }

    const usuario = rows[0];
    const permissions = await permissionService.getRolePermissionMatrix();
    const overrides = await permissionService.getUserPermissionOverrides(usuario.id);

    permissions.forEach(permission => {
      permission.roleAllowed = Boolean(permission.roles[usuario.role]);
      if (Object.prototype.hasOwnProperty.call(overrides, permission.code)) {
        permission.override = overrides[permission.code] ? 'allow' : 'deny';
      } else {
        permission.override = 'inherit';
      }
    });

    res.render('permisos/usuario', {
      title: 'Permisos por usuario',
      usuario,
      permissions
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'No fue posible cargar los permisos del usuario';
    res.redirect('/permisos');
  }
};

exports.updateUser = async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      req.session.error_msg = 'Usuario no encontrado';
      return res.redirect('/permisos');
    }

    if (rows[0].role === 'administrador') {
      req.session.error_msg = 'El administrador conserva todos los permisos';
      return res.redirect(`/permisos/usuario/${userId}`);
    }

    await db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

    for (const permission of permissionService.PERMISSIONS) {
      const value = req.body[`u__${permission.code}`];
      if (value === 'allow' || value === 'deny') {
        await db.query(
          `INSERT INTO user_permissions (user_id, permission_code, allowed)
           VALUES (?, ?, ?)`,
          [userId, permission.code, value === 'allow' ? 1 : 0]
        );
      }
    }

    req.session.success_msg = 'Excepciones del usuario actualizadas';
    res.redirect(`/permisos/usuario/${userId}`);
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'No fue posible guardar los permisos del usuario';
    res.redirect(`/permisos/usuario/${userId}`);
  }
};

exports.updateSyncConfiguration = async (req, res) => {
  try {
    if (req.session.user.role !== 'administrador') {
      req.session.error_msg = 'Sólo el perfil de administrador puede modificar la configuración de sincronización';
      return res.redirect('/permisos');
    }

    const alertHours = Number(req.body.alert_hours);
    const alertGraceMinutes = Number(req.body.alert_grace_minutes);
    if (!Number.isFinite(alertHours) || alertHours < 1 || alertHours > 168) {
      req.session.error_msg = 'La tolerancia debe estar entre 1 y 168 horas';
      return res.redirect('/permisos#configuracion-sincronizacion');
    }
    if (!Number.isFinite(alertGraceMinutes) || alertGraceMinutes < 0 || alertGraceMinutes > 180) {
      req.session.error_msg = 'El margen adicional debe estar entre 0 y 180 minutos';
      return res.redirect('/permisos#configuracion-sincronizacion');
    }

    await settingsService.saveSyncAlertSettings({
      alertHours,
      alertGraceMinutes,
      updatedBy: req.session.user.id
    });

    req.session.success_msg = 'Configuración de alertas de sincronización actualizada';
    return res.redirect('/permisos#configuracion-sincronizacion');
  } catch (err) {
    console.error(err);
    req.session.error_msg = err.code === 'ER_NO_SUCH_TABLE'
      ? 'Falta aplicar la migración de configuración en la base de datos'
      : 'No fue posible guardar la configuración de sincronización';
    return res.redirect('/permisos#configuracion-sincronizacion');
  }
};
