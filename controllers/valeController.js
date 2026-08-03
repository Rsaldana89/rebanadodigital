const db = require('../config/db');
const permissionService = require('../services/permissionService');
const syncService = require('../services/rebanadoSyncService');
const { displayDateFromISO, enrichValeDelivery } = require('../services/valeDeliveryService');

const VALID_STATES = ['Pendiente', 'Rebanando', 'Listo', 'Entregado', 'Cancelado'];

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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function getSafeReturnUrl(value, fallback = '/vales/tablero') {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\r\n]/.test(raw)) return fallback;
  return raw;
}

function normalizeProducts(body) {
  const skus = asArray(body.sku);
  const names = asArray(body.producto);
  const quantities = asArray(body.cantidad);
  const presentations = asArray(body.presentacion);
  const cuts = asArray(body.tipo_rebanado);
  const notes = asArray(body.producto_observaciones);
  const externalLineKeys = asArray(body.external_line_key);
  const sapLineNums = asArray(body.sap_line_num);
  const warehouses = asArray(body.almacen);
  const rowCount = Math.max(skus.length, names.length, quantities.length, presentations.length, cuts.length, notes.length, externalLineKeys.length, sapLineNums.length, warehouses.length);

  const products = [];
  for (let index = 0; index < rowCount; index += 1) {
    const sku = String(skus[index] || '').trim();
    const producto = String(names[index] || '').trim();
    const cantidadRaw = String(quantities[index] || '').trim();
    const presentacion = String(presentations[index] || '').trim();
    const requestedCut = String(cuts[index] || 'Estándar').trim();
    const tipo_rebanado = requestedCut ? requestedCut.slice(0, 80) : 'Estándar';
    const observaciones = String(notes[index] || '').trim();
    const external_line_key = String(externalLineKeys[index] || '').trim() || null;
    const sapLineRaw = String(sapLineNums[index] ?? '').trim();
    const sap_line_num = sapLineRaw !== '' && Number.isInteger(Number(sapLineRaw)) ? Number(sapLineRaw) : null;
    const almacen = String(warehouses[index] || '').trim() || null;

    // Ignora únicamente renglones completamente vacíos.
    if (!sku && !producto && !cantidadRaw && !presentacion && !observaciones) continue;

    const cantidad = Number(cantidadRaw);
    if (!sku || !producto || !presentacion || !Number.isFinite(cantidad) || cantidad <= 0) {
      const error = new Error(`Producto ${products.length + 1}: completa SKU, producto, cantidad mayor a cero y presentación.`);
      error.code = 'INVALID_PRODUCT';
      throw error;
    }

    products.push({
      sku,
      producto,
      cantidad,
      presentacion,
      tipo_rebanado,
      observaciones: observaciones || null,
      orden: products.length + 1,
      external_line_key,
      sap_line_num,
      almacen,
      last_synced_at: null
    });
  }

  if (!products.length) {
    const error = new Error('Agrega por lo menos un producto al vale.');
    error.code = 'NO_PRODUCTS';
    throw error;
  }

  return products;
}

async function attachProducts(vales, connection = db) {
  if (!vales.length) return vales;

  const ids = vales.map(vale => vale.id);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.query(
    `SELECT id, vale_id, sap_line_num, external_line_key, sku, producto, cantidad, almacen, presentacion, tipo_rebanado, observaciones, orden, last_synced_at
     FROM vale_productos
     WHERE vale_id IN (${placeholders})
     ORDER BY vale_id, orden, id`,
    ids
  );

  const productsByVale = new Map();
  rows.forEach(product => {
    if (!productsByVale.has(product.vale_id)) productsByVale.set(product.vale_id, []);
    productsByVale.get(product.vale_id).push(product);
  });

  return vales.map(vale => {
    const productos = productsByVale.get(vale.id) || [];
    return {
      ...vale,
      productos,
      total_productos: productos.length,
      productos_busqueda: productos.map(product => `${product.sku} ${product.producto}`).join(' ')
    };
  });
}

async function insertProducts(connection, valeId, products) {
  const values = products.map(product => [
    valeId,
    product.sap_line_num ?? null,
    product.external_line_key || null,
    product.sku,
    product.producto,
    product.cantidad,
    product.almacen || null,
    product.presentacion,
    product.tipo_rebanado,
    product.observaciones,
    product.orden,
    product.last_synced_at || null
  ]);

  await connection.query(
    `INSERT INTO vale_productos
      (vale_id, sap_line_num, external_line_key, sku, producto, cantidad, almacen,
       presentacion, tipo_rebanado, observaciones, orden, last_synced_at)
     VALUES ?`,
    [values]
  );
}

function buildValeFormData(body = {}, fallback = {}) {
  return {
    id: fallback.id || null,
    folio: fallback.folio || '',
    origen: body.origen || fallback.origen || 'Manual',
    numero_pedido: body.numero_pedido !== undefined ? body.numero_pedido : (fallback.numero_pedido || ''),
    cliente: body.cliente !== undefined ? body.cliente : (fallback.cliente || ''),
    fecha_entrega: body.fecha_entrega || fallback.fecha_entrega_fmt || fallback.fecha_entrega || '',
    prioridad: body.prioridad || fallback.prioridad || 'Normal',
    observaciones: body.observaciones !== undefined ? body.observaciones : (fallback.observaciones || ''),
    estado: fallback.estado || 'Pendiente'
  };
}

// Muestra el tablero operativo de vales.
// Por default filtra la fecha de entrega de HOY e incluye atrasados activos.
exports.tablero = async (req, res) => {
  try {
    const now = getMexicoDateParts();
    const filtroFecha = req.query.fecha || now.isoDate;

    const [rows] = await db.query(
      `SELECT v.*,
              DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt,
              DATE_FORMAT(v.entrega_fecha_inicio, '%Y-%m-%d') AS entrega_fecha_inicio_fmt,
              DATE_FORMAT(v.entrega_fecha_fin, '%Y-%m-%d') AS entrega_fecha_fin_fmt,
              u.name AS creado_por
       FROM vales v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE (? BETWEEN COALESCE(v.entrega_fecha_inicio, v.fecha_entrega)
                    AND COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega))
          OR (COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) < ?
              AND v.estado IN ('Pendiente', 'Rebanando', 'Listo'))
       ORDER BY
         CASE WHEN COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) < ?
                   AND v.estado IN ('Pendiente', 'Rebanando', 'Listo') THEN 0 ELSE 1 END,
         CASE v.prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         CASE v.estado WHEN 'Pendiente' THEN 1 WHEN 'Rebanando' THEN 2 WHEN 'Listo' THEN 3 WHEN 'Entregado' THEN 4 WHEN 'Cancelado' THEN 5 ELSE 6 END,
         COALESCE(v.entrega_fecha_inicio, v.fecha_entrega) ASC,
         v.cliente ASC,
         v.created_at ASC`,
      [filtroFecha, filtroFecha, filtroFecha]
    );

    const rowsWithProducts = await attachProducts(rows);
    const vales = rowsWithProducts.map(v => {
      const enriched = enrichValeDelivery(v, filtroFecha);
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
    const syncStatus = ['administrador', 'cedis'].includes(req.session.user.role)
      ? await syncService.getStatusForUi()
      : null;

    res.render('vales/tablero', {
      title: 'Tablero de Vales',
      estados,
      overdueCount,
      filtroFecha,
      filtroFechaDisplay: displayDateFromISO(filtroFecha),
      horaActual: now.displayTime,
      syncStatus
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el tablero. Verifica que la migración de múltiples productos esté aplicada.';
    res.redirect('/dashboard');
  }
};

// Muestra formulario para crear un vale/comanda.
exports.showCrearForm = (req, res) => {
  res.render('vales/formulario', {
    title: 'Crear Vale',
    modo: 'crear',
    vale: buildValeFormData(),
    productos: [{ sku: '', producto: '', cantidad: '', presentacion: '', tipo_rebanado: 'Estándar', observaciones: '' }]
  });
};

// Crea un vale nuevo con uno o más productos.
exports.crearVale = async (req, res) => {
  let connection;
  try {
    const products = normalizeProducts(req.body);
    const { origen, numero_pedido, cliente, fecha_entrega, prioridad, observaciones } = req.body;

    if (!cliente || !fecha_entrega) {
      throw new Error('Cliente y fecha de entrega son obligatorios.');
    }

    const folio = `V-${Date.now()}`;
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO vales
        (folio, origen, numero_pedido, cliente, fecha_entrega, prioridad, observaciones, estado, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?)`,
      [
        folio,
        origen || 'Manual',
        String(numero_pedido || '').trim() || null,
        String(cliente).trim(),
        fecha_entrega,
        prioridad || 'Normal',
        String(observaciones || '').trim() || null,
        req.session.user.id,
        req.session.user.id
      ]
    );

    await insertProducts(connection, result.insertId, products);
    await connection.query(
      `INSERT INTO vale_history (vale_id, user_id, action, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'crear_vale', NULL, 'Pendiente', ?)`,
      [result.insertId, req.session.user.id, `Vale creado con ${products.length} producto(s).`]
    );

    await connection.commit();
    req.session.success_msg = `Vale creado correctamente con ${products.length} producto(s)`;
    res.redirect(`/vales/tablero?fecha=${encodeURIComponent(fecha_entrega)}&focus=${result.insertId}#vale-${result.insertId}`);
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(err);
    req.session.error_msg = err.code === 'INVALID_PRODUCT' || err.code === 'NO_PRODUCTS'
      ? err.message
      : 'Error al crear el vale';
    res.redirect('/vales/crear');
  } finally {
    if (connection) connection.release();
  }
};

exports.showEditarForm = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT v.*, DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt
       FROM vales v
       WHERE v.id = ?`,
      [id]
    );

    if (!rows.length) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect('/vales/tablero');
    }

    const [withProducts] = await attachProducts(rows);
    return res.render('vales/formulario', {
      title: `Editar ${withProducts.folio}`,
      modo: 'editar',
      vale: buildValeFormData({}, withProducts),
      productos: withProducts.productos,
      return_url: getSafeReturnUrl(req.query.return_url, `/vales/${id}`)
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el vale para edición';
    return res.redirect('/vales/tablero');
  }
};

exports.editarVale = async (req, res) => {
  const { id } = req.params;
  const returnUrl = getSafeReturnUrl(req.body.return_url, `/vales/${id}`);
  let connection;

  try {
    const products = normalizeProducts(req.body);
    const { origen, numero_pedido, cliente, fecha_entrega, prioridad, observaciones } = req.body;

    if (!cliente || !fecha_entrega) {
      throw new Error('Cliente y fecha de entrega son obligatorios.');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [currentRows] = await connection.query('SELECT folio, estado FROM vales WHERE id = ? FOR UPDATE', [id]);
    if (!currentRows.length) {
      await connection.rollback();
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect('/vales/tablero');
    }

    await connection.query(
      `UPDATE vales
       SET origen = ?, numero_pedido = ?, cliente = ?, fecha_entrega = ?, prioridad = ?, observaciones = ?, updated_by = ?
       WHERE id = ?`,
      [
        origen || 'Manual',
        String(numero_pedido || '').trim() || null,
        String(cliente).trim(),
        fecha_entrega,
        prioridad || 'Normal',
        String(observaciones || '').trim() || null,
        req.session.user.id,
        id
      ]
    );

    const [existingProductMetadata] = await connection.query(
      `SELECT external_line_key, sap_line_num, almacen, last_synced_at
       FROM vale_productos
       WHERE vale_id = ? AND external_line_key IS NOT NULL`,
      [id]
    );
    const metadataByKey = new Map(existingProductMetadata.map(item => [item.external_line_key, item]));
    products.forEach(product => {
      if (!product.external_line_key) return;
      const metadata = metadataByKey.get(product.external_line_key);
      if (!metadata) {
        product.external_line_key = null;
        product.sap_line_num = null;
        product.almacen = null;
        product.last_synced_at = null;
        return;
      }
      product.sap_line_num = metadata.sap_line_num;
      product.almacen = metadata.almacen;
      product.last_synced_at = metadata.last_synced_at;
    });

    await connection.query('DELETE FROM vale_productos WHERE vale_id = ?', [id]);
    await insertProducts(connection, id, products);
    await connection.query(
      `INSERT INTO vale_history (vale_id, user_id, action, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'editar_vale', ?, ?, ?)`,
      [id, req.session.user.id, currentRows[0].estado, currentRows[0].estado, `Datos corregidos. El vale quedó con ${products.length} producto(s).`]
    );

    await connection.commit();
    req.session.success_msg = 'Vale y productos actualizados correctamente';
    return res.redirect(returnUrl);
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(err);
    req.session.error_msg = err.code === 'INVALID_PRODUCT' || err.code === 'NO_PRODUCTS'
      ? err.message
      : 'Error al actualizar el vale';
    return res.redirect(`/vales/${id}/editar?return_url=${encodeURIComponent(returnUrl)}`);
  } finally {
    if (connection) connection.release();
  }
};

// Cambia el estado de un vale completo. Todos los productos avanzan como una sola comanda.
exports.cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado, return_url } = req.body;
  const redirectTo = getSafeReturnUrl(return_url, '/vales/tablero');

  try {
    const [rows] = await db.query('SELECT estado FROM vales WHERE id = ?', [id]);

    if (rows.length === 0) {
      req.session.error_msg = 'Vale no encontrado';
      return res.redirect(redirectTo);
    }

    const estadoAnterior = rows[0].estado;

    if (!VALID_STATES.includes(nuevo_estado)) {
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
       VALUES (?, ?, 'cambiar_estado', ?, ?, 'Cambio aplicado a toda la comanda')`,
      [id, req.session.user.id, estadoAnterior, nuevo_estado]
    );

    req.session.success_msg = 'Estado de la comanda actualizado';
    return res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cambiar el estado';
    return res.redirect(redirectTo);
  }
};

// Detalle de vale/comanda.
exports.detalle = async (req, res) => {
  const { id } = req.params;
  const returnUrl = getSafeReturnUrl(req.query.return_url, `/vales/tablero?focus=${id}#vale-${id}`);

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

    const [withProducts] = await attachProducts(vales);
    const now = getMexicoDateParts();
    const vale = enrichValeDelivery(withProducts, now.isoDate);
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

    return res.render('vales/detalle', { title: `Vale ${vale.folio}`, vale, historial, return_url: returnUrl });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el detalle';
    return res.redirect('/vales/tablero');
  }
};

// Pantalla informativa para almacén/CEDIS.
// Por default muestra vales con fecha de entrega HOY y atrasados activos.
exports.pantallaController = async (req, res) => {
  try {
    const now = getMexicoDateParts();
    const filtroFecha = req.query.fecha || now.isoDate;

    const [rows] = await db.query(
      `SELECT v.id, v.folio, v.numero_pedido, v.cliente, v.prioridad, v.estado,
              v.entrega_dias_texto,
              DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt,
              DATE_FORMAT(v.entrega_fecha_inicio, '%Y-%m-%d') AS entrega_fecha_inicio_fmt,
              DATE_FORMAT(v.entrega_fecha_fin, '%Y-%m-%d') AS entrega_fecha_fin_fmt
       FROM vales v
       WHERE (? BETWEEN COALESCE(v.entrega_fecha_inicio, v.fecha_entrega)
                    AND COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega))
          OR (COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) < ?
              AND v.estado IN ('Pendiente', 'Rebanando', 'Listo'))
       ORDER BY
         CASE WHEN COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) < ?
                   AND v.estado IN ('Pendiente', 'Rebanando', 'Listo') THEN 0 ELSE 1 END,
         CASE v.prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
         CASE v.estado WHEN 'Pendiente' THEN 1 WHEN 'Rebanando' THEN 2 WHEN 'Listo' THEN 3 WHEN 'Entregado' THEN 4 WHEN 'Cancelado' THEN 5 ELSE 6 END,
         COALESCE(v.entrega_fecha_inicio, v.fecha_entrega) ASC,
         v.cliente ASC`,
      [filtroFecha, filtroFecha, filtroFecha]
    );

    const withProducts = await attachProducts(rows);
    const vales = withProducts.map(v => enrichValeDelivery(v, filtroFecha));
    const overdueCount = vales.filter(v => v.is_overdue).length;

    return res.render('pantalla', {
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
    return res.status(500).send('Error al cargar la pantalla informativa');
  }
};
