// Middleware de autenticacion
module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.session.user) {
      return next();
    }

    req.session.error_msg = 'Por favor inicia sesion para acceder a esta pagina';
    return res.redirect('/login');
  },

  forwardAuthenticated: (req, res, next) => {
    if (!req.session.user) {
      return next();
    }

    return res.redirect('/dashboard');
  }
};
