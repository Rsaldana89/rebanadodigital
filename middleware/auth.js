// Middleware de autenticación
module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.session.user) {
      return next();
    }
    req.flash('error_msg', 'Por favor inicia sesión para acceder a esta página');
    return res.redirect('/login');
  },
  forwardAuthenticated: (req, res, next) => {
    if (!req.session.user) {
      return next();
    }
    return res.redirect('/dashboard');
  }
};