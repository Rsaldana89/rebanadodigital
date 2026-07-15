const db = require('../config/db');
const permissionService = require('../services/permissionService');

function getMexicoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    displayDate: `${parts.day}/${parts.month}/${parts.year}`,
    displayTime: `${parts.hour}:${parts.minute}`
  };
}

function displayDateFromISO(isoDate) {
  if (!isoDate) return '';
  return isoDate.split('-').reverse().join('/');
}

function dayDiff(olderIsoDate, newerIsoDate) {
  if (!olderIsoDate || !newerIsoDate) return 0;
  const older = new Date(`${olderIsoDate}T00:00:00Z`);
  const newer = new Date(`${newerIsoDate}T00:00:00Z`);
  const diff = newer.getTime() - older.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function enrichVale(vale, filtroFecha) {
  const fechaEntrega = vale.fecha_entrega_fmt || (vale.fecha_entrega ? new Date(vale.fecha_entrega).toISOString().substring(0, 10) : '');
  const isOverdue = Boolean(fechaEntrega && fechaEntrega < filtroFecha && ['Pendiente', 'Rebanando', 'Listo'].includes(vale.estado));
  return {
    ...vale,
    fecha_entrega_fmt: fechaEntrega,
    is_overdue: isOverdue,
    days_late: isOverdue ? dayDiff(fechaEntrega, filtroFecha) : 0
  };
}

// Muestra el tablero operativo de vales.
// Por default filtra la fecha de entrega de HOY e incluye atrasados activos.
exports.tablero = async (req, res) => {
  try {
    const now = getMexicoDateParts();
    const filtroFecha = req.query.fecha || now.isoDate;

    const [rows] = await db.query(
      `SELECT v.*, DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt, u.name AS creado_por
       FROM vales v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE DATE(v.fecha_entrega) = ?
          OR (DATE(v.fecha_entrega) < ? AND v.estado IN ('Pendiente', 'Rebanando', 'Listo'))
       ORDER BY
         CASE WHEN DATE(v.fecha_entrega) < ? AND v.estado IN ('Pendiente', 'Rebanando', 'Listo') THEN 0 ELSE 1 END,
         CASE v.prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         CASE v.estado WHEN 'Pendiente' THEN 1 WHEN 'Rebanando' THEN 2 WHEN 'Listo' THEN 3 WHEN 'Entregado' THEN 4 WHEN 'Cancelado' THEN 5 ELSE 6 END,
         v.fecha_entrega ASC,
         v.producto ASC,
         v.created_at ASC`,
      [filtroFecha, filtroFecha, filtroFecha]
    );

    const vales = rows.map(v => {
      const enriched = enrichVale(v, filtroFecha);
      return {
        ...enriched,
        allowed_states: permissionService.getAllowedStateTargets(req.permissions, req.session.user.role, enriched.estado)
      };
    });

    const estados = {
      Pendiente: [],
      Rebanando: [],
      Listo: [],
      Entregado: [],
      Cancelado: []
    };

    vales.forEach(v => {
      if (!estados[v.estado]) estados[v.estado] = [];
      estados[v.estado].push(v);
    });

    const overdueCount = vales.filter(v => v.is_overdue).length;

    res.render('vales/tablero', {
      title: 'Tablero de Vales',
      estados,
      overdueCount,
      filtroFecha,
      filtroFechaDisplay: displayDateFromISO(filtroFecha),
      horaActual: now.displayTime
    });
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

    const folio = `V-${Date.now()}`;

    await db.query(
      `INSERT INTO vales
      (folio, origen, cliente, fecha_entrega, prioridad, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, estado, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
      [folio, origen, cliente, fecha_entrega, prioridad, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, req.session.user.id]
    );

    req.session.success_msg = 'Vale creado correctamente';
    res.redirect(`/vales/tablero?fecha=${encodeURIComponent(fecha_entrega)}`);
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al crear el vale';
    res.redirect('/vales/crear');
  }
};

// Cambia el estado de un vale
exports.cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado, return_url } = req.body;
  const redirectTo = return_url || req.get('Referer') || '/vales/tablero';

  try {
    const [rows] = await db.query('SELECT estado FROM vales WHERE id = ?', [id]);

    if (rows.length === 0) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect(redirectTo);
    }

    const estadoAnterior = rows[0].estado;
    const validStates = ['Pendiente', 'Rebanando', 'Listo', 'Entregado', 'Cancelado'];

    if (!validStates.includes(nuevo_estado)) {
      req.session.error_msg = 'El estado solicitado no es válido';
      return res.redirect(redirectTo);
    }

    if (nuevo_estado === estadoAnterior) {
      req.session.error_msg = 'El vale ya se encuentra en ese estado';
      return res.redirect(redirectTo);
    }

    const allowedStates = permissionService.getAllowedStateTargets(
      req.permissions,
      req.session.user.role,
      estadoAnterior
    );

    if (!allowedStates.includes(nuevo_estado)) {
      req.session.error_msg = `No tienes permiso para cambiar de ${estadoAnterior} a ${nuevo_estado}`;
      return res.redirect(redirectTo);
    }

    await db.query('UPDATE vales SET estado = ?, updated_by = ? WHERE id = ?', [nuevo_estado, req.session.user.id, id]);

    await db.query(
      `INSERT INTO vale_history (vale_id, user_id, action, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'cambiar_estado', ?, ?, '')`,
      [id, req.session.user.id, estadoAnterior, nuevo_estado]
    );

    req.session.success_msg = 'Estado actualizado';
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cambiar el estado';
    res.redirect(redirectTo);
  }
};

// Detalle de vale
exports.detalle = async (req, res) => {
  const { id } = req.params;

  try {
    const [vales] = await db.query(
      `SELECT v.*, DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt, u.name AS creador
       FROM vales v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = ?`,
      [id]
    );

    if (!vales.length) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect('/vales/tablero');
    }

    const now = getMexicoDateParts();
    const vale = enrichVale(vales[0], now.isoDate);
    vale.allowed_states = permissionService.getAllowedStateTargets(
      req.permissions,
      req.session.user.role,
      vale.estado
    );

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

// Pantalla informativa para almacén/CEDIS.
// Por default muestra vales con fecha de entrega HOY y atrasados activos.
exports.pantallaController = async (req, res) => {
  try {
    const now = getMexicoDateParts();
    const filtroFecha = req.query.fecha || now.isoDate;

    const [rows] = await db.query(
      `SELECT folio, cliente, producto, prioridad, estado, DATE_FORMAT(fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt
       FROM vales
       WHERE DATE(fecha_entrega) = ?
          OR (DATE(fecha_entrega) < ? AND estado IN ('Pendiente', 'Rebanando', 'Listo'))
       ORDER BY
         CASE WHEN DATE(fecha_entrega) < ? AND estado IN ('Pendiente', 'Rebanando', 'Listo') THEN 0 ELSE 1 END,
         CASE prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         CASE estado WHEN 'Pendiente' THEN 1 WHEN 'Rebanando' THEN 2 WHEN 'Listo' THEN 3 WHEN 'Entregado' THEN 4 WHEN 'Cancelado' THEN 5 ELSE 6 END,
         fecha_entrega ASC,
         producto ASC`,
      [filtroFecha, filtroFecha, filtroFecha]
    );

    const vales = rows.map(v => enrichVale(v, filtroFecha));
    const overdueCount = vales.filter(v => v.is_overdue).length;

    res.render('pantalla', {
      title: 'Pantalla de Almacén',
      vales,
      fecha: new Date(),
      overdueCount,
      filtroFecha,
      filtroFechaDisplay: displayDateFromISO(filtroFecha),
      horaActual: now.displayTime
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar la pantalla informativa');
  }
};
