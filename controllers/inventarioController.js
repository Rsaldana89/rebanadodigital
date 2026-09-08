const db = require('../config/db');
const inventoryService = require('../services/inventoryService');

function mexicoDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function formArray(body, name) {
  if (body?.[name] !== undefined) return asArray(body[name]);
  return asArray(body?.[`${name}[]`]);
}

exports.index = async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT p.sku, p.descripcion, p.presentacion, p.unidad_control, p.origen, p.activo,
              COALESCE(e.cantidad_sin_rebanar, 0) AS cantidad_sin_rebanar,
              COALESCE(e.cantidad_rebanado_queda, 0) AS cantidad_rebanado_queda,
              COALESCE(e.cantidad_sin_rebanar, 0) + COALESCE(e.cantidad_rebanado_queda, 0) AS total_real,
              COALESCE(c.comprometido, 0) AS comprometido,
              COALESCE(e.cantidad_sin_rebanar, 0) + COALESCE(e.cantidad_rebanado_queda, 0) - COALESCE(c.comprometido, 0) AS proyectado
       FROM productos_rebanables p
       LEFT JOIN inventario_existencias e ON e.sku = p.sku
       LEFT JOIN (
         SELECT vp.sku, SUM(vp.cantidad) AS comprometido
         FROM vale_productos vp
         INNER JOIN vales v ON v.id = vp.vale_id
         WHERE v.estado IN ('Pendiente','Rebanando','Listo')
         GROUP BY vp.sku
       ) c ON c.sku = p.sku
       WHERE p.activo = 1
       ORDER BY p.descripcion, p.sku`
    );

    const [movements] = await db.query(
      `SELECT im.*, p.descripcion, u.name AS usuario, v.folio
       FROM inventario_movimientos im
       INNER JOIN productos_rebanables p ON p.sku = im.sku
       LEFT JOIN users u ON u.id = im.created_by
       LEFT JOIN vales v ON v.id = im.vale_id
       ORDER BY im.created_at DESC, im.id DESC
       LIMIT 150`
    );

    const summary = products.reduce((acc, item) => {
      acc.totalProducts += 1;
      acc.unsliced += Number(item.cantidad_sin_rebanar) || 0;
      acc.sliced += Number(item.cantidad_rebanado_queda) || 0;
      acc.committed += Number(item.comprometido) || 0;
      if (Number(item.proyectado) < 0) acc.negative += 1;
      return acc;
    }, { totalProducts: 0, unsliced: 0, sliced: 0, committed: 0, negative: 0 });

    return res.render('inventario/index', {
      title: 'Inventario de Rebanado',
      products,
      movements,
      rebanadoHistory: movements.filter(item => Number(item.cantidad_rebanada_historial) > 0),
      wasteHistory: movements.filter(item => Number(item.cantidad_merma) > 0),
      summary,
      today: mexicoDate()
    });
  } catch (error) {
    console.error(error);
    req.session.error_msg = 'No fue posible cargar el inventario. Aplica la migración V19.';
    return res.redirect('/dashboard');
  }
};

exports.buscarProductos = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const like = `%${query}%`;
    const [rows] = await db.query(
      `SELECT sku, descripcion, presentacion, unidad_control, origen
       FROM productos_rebanables
       WHERE activo = 1 AND (? = '' OR sku LIKE ? OR descripcion LIKE ?)
       ORDER BY CASE WHEN sku = ? THEN 0 WHEN sku LIKE ? THEN 1 ELSE 2 END,
                descripcion
       LIMIT 30`,
      [query, like, like, query, `${query}%`]
    );
    return res.json({ ok: true, productos: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, productos: [] });
  }
};

exports.registrarProducto = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const sku = inventoryService.normalizeSku(req.body.sku);
    const description = inventoryService.normalizeDescription(req.body.producto);
    if (!sku || !description) throw new Error('SKU y producto son obligatorios.');
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO productos_rebanables
        (sku, descripcion, presentacion, unidad_control, origen, activo, created_by, updated_by)
       VALUES (?, ?, 'REBANADO', 'UNIDAD', 'Manual', 1, ?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), activo = 1, updated_by = VALUES(updated_by)`,
      [sku, description, req.session.user.id, req.session.user.id]
    );
    await connection.query('INSERT IGNORE INTO inventario_existencias (sku) VALUES (?)', [sku]);
    await connection.commit();
    req.session.success_msg = `Producto ${sku} disponible en el catálogo`;
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error(error);
    req.session.error_msg = error.message || 'No fue posible registrar el producto';
  } finally {
    connection.release();
  }
  return res.redirect('/inventario#existencias');
};

exports.registrarCarga = async (req, res) => {
  try {
    await inventoryService.registerLoad({
      sku: req.body.sku,
      producto: req.body.producto,
      cantidad: req.body.cantidad,
      referencia: req.body.referencia,
      observaciones: req.body.observaciones,
      userId: req.session.user.id,
      date: req.body.fecha || mexicoDate()
    });
    req.session.success_msg = 'Carga de producto sin rebanar registrada';
  } catch (error) {
    console.error(error);
    req.session.error_msg = error.message || 'No fue posible registrar la carga';
  }
  return res.redirect('/inventario#existencias');
};

exports.registrarMerma = async (req, res) => {
  try {
    await inventoryService.registerWaste({
      sku: req.body.sku,
      producto: req.body.producto,
      cantidad: req.body.cantidad,
      origenMerma: req.body.origen_merma,
      observaciones: req.body.observaciones,
      userId: req.session.user.id,
      date: req.body.fecha || mexicoDate()
    });
    req.session.success_msg = 'Merma registrada correctamente';
  } catch (error) {
    console.error(error);
    req.session.error_msg = error.message || 'No fue posible registrar la merma';
  }
  return res.redirect('/inventario#mermas');
};

exports.ajustarExistencia = async (req, res) => {
  try {
    await inventoryService.adjustStock({
      sku: req.body.sku,
      targetUnsliced: req.body.cantidad_sin_rebanar,
      targetSliced: req.body.cantidad_rebanado_queda,
      observations: req.body.observaciones,
      userId: req.session.user.id,
      date: req.body.fecha || mexicoDate()
    });
    req.session.success_msg = `Existencias del SKU ${inventoryService.normalizeSku(req.body.sku)} corregidas`;
  } catch (error) {
    console.error(error);
    req.session.error_msg = error.message || 'No fue posible corregir las existencias';
  }
  return res.redirect('/inventario#existencias');
};

exports.showCierre = async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.fecha || '')) ? req.query.fecha : mexicoDate();
    const [rows] = await db.query(
      `SELECT p.sku, p.descripcion,
              COALESCE(e.cantidad_rebanado_queda, 0) AS saldo_rebanado_queda,
              COALESCE(h.rebanado_vales, 0) AS rebanado_vales,
              COALESCE(cd.cantidad_rebanado_queda, e.cantidad_rebanado_queda, 0) AS cierre_rebanado_queda,
              COALESCE(cd.cantidad_merma, 0) AS cierre_merma,
              COALESCE(cd.observaciones, '') AS cierre_observaciones
       FROM productos_rebanables p
       LEFT JOIN inventario_existencias e ON e.sku = p.sku
       LEFT JOIN (
         SELECT sku, SUM(cantidad_rebanada_historial) AS rebanado_vales
         FROM inventario_movimientos
         WHERE fecha_operacion = ? AND tipo = 'SALIDA_VALE' AND reversed_at IS NULL
         GROUP BY sku
       ) h ON h.sku = p.sku
       LEFT JOIN cierres_rebanado c ON c.fecha = ?
       LEFT JOIN cierre_rebanado_detalles cd ON cd.cierre_id = c.id AND cd.sku = p.sku
       WHERE p.activo = 1
       ORDER BY CASE WHEN COALESCE(h.rebanado_vales, 0) > 0 OR COALESCE(e.cantidad_rebanado_queda, 0) > 0 THEN 0 ELSE 1 END,
                p.descripcion`,
      [date, date]
    );
    const [[close]] = await db.query('SELECT observaciones FROM cierres_rebanado WHERE fecha = ?', [date]);
    return res.render('inventario/cierre', {
      title: 'Cierre de Rebanado',
      date,
      products: rows,
      observations: close?.observaciones || ''
    });
  } catch (error) {
    console.error(error);
    req.session.error_msg = 'No fue posible preparar el cierre';
    return res.redirect('/inventario');
  }
};

exports.guardarCierre = async (req, res) => {
  try {
    const skus = formArray(req.body, 'sku');
    const products = formArray(req.body, 'producto');
    const sliced = formArray(req.body, 'rebanado_que_queda');
    const waste = formArray(req.body, 'merma');
    const notes = formArray(req.body, 'detalle_observaciones');
    const details = skus.map((sku, index) => ({
      sku,
      producto: products[index] || sku,
      rebanadoQueda: sliced[index] || 0,
      merma: waste[index] || 0,
      observaciones: String(notes[index] || '').trim() || null
    }));
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.fecha || '')) ? req.body.fecha : mexicoDate();
    await inventoryService.saveClose({
      date,
      observations: String(req.body.observaciones || '').trim() || null,
      details,
      userId: req.session.user.id
    });
    req.session.success_msg = 'Cierre de Rebanado guardado correctamente';
    return res.redirect(`/inventario/cierre?fecha=${encodeURIComponent(date)}`);
  } catch (error) {
    console.error(error);
    req.session.error_msg = error.message || 'No fue posible guardar el cierre';
    return res.redirect(`/inventario/cierre?fecha=${encodeURIComponent(req.body.fecha || mexicoDate())}`);
  }
};

// Compatibilidad con enlaces anteriores.
exports.showRegistro = (req, res) => res.redirect('/inventario/cierre');
