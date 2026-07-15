const db = require('../config/db');
const permissionService = require('../services/permissionService');

const editableRoles = ['cedis', 'almacen', 'rebanado'];

exports.index = async (req, res) => {
  try {
    const permissions = await permissionService.getRolePermissionMatrix();
    const [usuarios] = await db.query(
      `SELECT id, name, username, role, active
       FROM users
       ORDER BY role, name`
    );

    res.render('permisos/index', {
      title: 'Permisos',
      permissions,
      roles: ['administrador', ...editableRoles],
      usuarios
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'No fue posible cargar la administración de permisos';
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
