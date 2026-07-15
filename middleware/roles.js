// Middleware para verificar roles de usuario
module.exports = function rolesAllowed(...permittedRoles) {
  return (req, res, next) => {
    const user = req.session.user;

    if (user && permittedRoles.includes(user.role)) {
      return next();
    }

    req.session.error_msg = 'No tienes permisos para acceder a esta seccion';
    return res.redirect('/dashboard');
  };
};
