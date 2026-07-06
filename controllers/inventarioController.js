const db = require('../config/db');

// Muestra el formulario de registro de inventario/cierre de día
exports.showRegistro = (req, res) => {
  res.render('inventario/registro', { title: 'Registro de inventario' });
};

// Guarda un registro de inventario
exports.guardarRegistro = async (req, res) => {
  const {
    fecha,
    sku,
    producto,
    cantidad_disponible,
    producto_extra,
    sobrante,
    merma,
    observaciones
  } = req.body;
  try {
    await db.query(
      `INSERT INTO inventario_rebanado (fecha, sku, producto, cantidad_disponible, producto_extra, sobrante, merma, observaciones, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, sku, producto, cantidad_disponible || 0, producto_extra || 0, sobrante || 0, merma || 0, observaciones, req.session.user.id]
    );
    req.session.success_msg = 'Registro guardado correctamente';
    res.redirect('/inventario/registro');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al guardar el registro';
    res.redirect('/inventario/registro');
  }
};