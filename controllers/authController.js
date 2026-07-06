const db = require('../config/db');

// Muestra el formulario de login
exports.showLogin = (req, res) => {
  res.render('login', { title: 'Iniciar sesión' });
};

// Maneja el inicio de sesión
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password = ? AND active = 1',
      [username, password]
    );
    if (rows.length > 0) {
      const user = rows[0];
      req.session.user = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      };
      req.session.success_msg = `Bienvenido, ${user.name}`;
      return res.redirect('/dashboard');
    }
    req.session.error_msg = 'Credenciales incorrectas';
    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al iniciar sesión';
    return res.redirect('/login');
  }
};

// Maneja el cierre de sesión
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};