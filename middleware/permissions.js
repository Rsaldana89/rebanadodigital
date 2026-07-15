const permissionService = require('../services/permissionService');

async function loadPermissions(req, res, next) {
  if (!req.session.user) {
    req.permissions = {};
    res.locals.permissions = {};
    res.locals.can = () => false;
    return next();
  }

  try {
    const permissions = await permissionService.getEffectivePermissions(req.session.user);
    req.permissions = permissions;
    res.locals.permissions = permissions;
    res.locals.can = code => Boolean(permissions[code]);
    return next();
  } catch (err) {
    console.error('No fue posible cargar permisos:', err);
    req.permissions = {};
    res.locals.permissions = {};
    res.locals.can = () => false;
    req.session.error_msg = 'No fue posible cargar los permisos del usuario';
    return next();
  }
}

function requirePermission(code) {
  return (req, res, next) => {
    if (req.permissions && req.permissions[code]) return next();

    req.session.error_msg = 'No tienes permiso para realizar esta acción';

    if (req.permissions?.['dashboard.view'] && code !== 'dashboard.view') {
      return res.redirect('/dashboard');
    }
    if (req.permissions?.['vales.view']) {
      return res.redirect('/vales/tablero');
    }
    if (req.permissions?.['inventario.manage']) {
      return res.redirect('/inventario/registro');
    }
    return res.redirect('/logout');
  };
}

module.exports = { loadPermissions, requirePermission };
