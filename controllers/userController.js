const db = require('../config/db');

// Lista todos los usuarios
exports.listar = async (req, res) => {
  try {
    const [usuarios] = await db.query('SELECT * FROM users');
    res.render('usuarios/lista', { title: 'Usuarios', usuarios });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar usuarios';
    res.redirect('/dashboard');
  }
};

// Mostrar formulario de creación
exports.showCrear = (req, res) => {
  res.render('usuarios/crear', { title: 'Crear usuario' });
};

// Crear un usuario
exports.crear = async (req, res) => {
  const { name, username, password, role, active } = req.body;
  try {
    await db.query(
      `INSERT INTO users (name, username, password, role, active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, username, password, role, active ? 1 : 0]
    );
    // obtener id del usuario recién creado
    const [userRows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    const userId = userRows[0].id;
    // registrar historial
    await db.query(
      `INSERT INTO user_history (user_id, changed_by, action, descripcion)
       VALUES (?, ?, 'crear', 'Usuario creado')`,
      [userId, req.session.user.id]
    );
    req.session.success_msg = 'Usuario creado';
    res.redirect('/usuarios');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al crear el usuario';
    res.redirect('/usuarios');
  }
};

// Mostrar formulario de edición
exports.showEditar = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      req.session.error_msg = 'Usuario no encontrado';
      return res.redirect('/usuarios');
    }
    const usuario = rows[0];
    res.render('usuarios/editar', { title: 'Editar usuario', usuario });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar usuario';
    res.redirect('/usuarios');
  }
};

// Actualizar un usuario
exports.editar = async (req, res) => {
  const { id } = req.params;
  const { name, username, password, role, active } = req.body;
  try {
    await db.query(
      `UPDATE users SET name = ?, username = ?, password = ?, role = ?, active = ?, updated_at = NOW() WHERE id = ?`,
      [name, username, password, role, active ? 1 : 0, id]
    );
    await db.query(
      `INSERT INTO user_history (user_id, changed_by, action, descripcion)
       VALUES (?, ?, 'editar', 'Usuario modificado')`,
      [id, req.session.user.id]
    );
    req.session.success_msg = 'Usuario actualizado';
    res.redirect('/usuarios');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al actualizar el usuario';
    res.redirect('/usuarios');
  }
};