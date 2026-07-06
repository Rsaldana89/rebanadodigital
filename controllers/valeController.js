const db = require('../config/db');

// Muestra el tablero de vales para rebanado en formato tipo kanban
exports.tablero = async (req, res) => {
  try {
    // Obtener todos los vales y ordenarlos por prioridad y fecha_entrega
    const [vales] = await db.query(
      `SELECT v.*, u.name AS creado_por
       FROM vales v
       LEFT JOIN users u ON v.created_by = u.id
       ORDER BY
         CASE v.prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         v.fecha_entrega ASC`);
    // Agrupar por estado
    const estados = {
      Pendiente: [],
      Rebanando: [],
      Listo: [],
      Entregado: [],
      Cancelado: []
    };
    vales.forEach(v => {
      estados[v.estado].push(v);
    });
    res.render('vales/tablero', { title: 'Tablero de Vales', estados });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el tablero';
    res.redirect('/dashboard');
  }
};

// Muestra formulario para crear un vale
exports.showCrearForm = (req, res) => {
  res.render('vales/crear', { title: 'Crear Vale' });
};

// Crea un vale nuevo
exports.crearVale = async (req, res) => {
  try {
    const {
      origen,
      cliente,
      fecha_entrega,
      prioridad,
      sku,
      producto,
      cantidad,
      presentacion,
      tipo_rebanado,
      observaciones
    } = req.body;
    // Generar folio simple: V-<timestamp>
    const folio = `V-${Date.now()}`;
    await db.query(
      `INSERT INTO vales
      (folio, origen, cliente, fecha_entrega, prioridad, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, estado, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
      [folio, origen, cliente, fecha_entrega, prioridad, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, req.session.user.id]
    );
    req.session.success_msg = 'Vale creado correctamente';
    res.redirect('/vales/tablero');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al crear el vale';
    res.redirect('/vales/crear');
  }
};

// Cambia el estado de un vale
exports.cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado } = req.body;
  try {
    // obtener el estado actual
    const [rows] = await db.query('SELECT estado FROM vales WHERE id = ?', [id]);
    if (rows.length === 0) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect('/vales/tablero');
    }
    const estadoAnterior = rows[0].estado;
    // actualizar estado
    await db.query('UPDATE vales SET estado = ?, updated_by = ? WHERE id = ?', [nuevo_estado, req.session.user.id, id]);
    // registrar historial
    await db.query(
      `INSERT INTO vale_history (vale_id, user_id, action, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'cambiar_estado', ?, ?, '')`,
      [id, req.session.user.id, estadoAnterior, nuevo_estado]
    );
    req.session.success_msg = 'Estado actualizado';
    res.redirect('/vales/tablero');
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cambiar el estado';
    res.redirect('/vales/tablero');
  }
};

// Detalle de vale
exports.detalle = async (req, res) => {
  const { id } = req.params;
  try {
    const [vales] = await db.query('SELECT v.*, u.name AS creador FROM vales v LEFT JOIN users u ON v.created_by = u.id WHERE v.id = ?', [id]);
    if (!vales.length) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect('/vales/tablero');
    }
    const vale = vales[0];
    const [historial] = await db.query(
      `SELECT vh.*, u.name AS usuario
       FROM vale_history vh
       LEFT JOIN users u ON vh.user_id = u.id
       WHERE vh.vale_id = ?
       ORDER BY vh.created_at DESC`,
      [id]
    );
    res.render('vales/detalle', { title: `Vale ${vale.folio}`, vale, historial });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el detalle';
    res.redirect('/vales/tablero');
  }
};

// Pantalla informativa para almacén/CEDIS
exports.pantallaController = async (req, res) => {
  try {
    const [vales] = await db.query(
      `SELECT folio, cliente, producto, prioridad, estado, fecha_entrega
       FROM vales
       ORDER BY
         CASE prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         fecha_entrega ASC`);
    res.render('pantalla', {
      title: 'Pantalla de Almacén',
      vales,
      fecha: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar la pantalla informativa');
  }
};