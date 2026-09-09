const db = require('../config/db');
const { createWorkbook } = require('../services/xlsxService');

const REPORT_TYPES = new Set(['vales', 'productos', 'merma']);
const STATES = ['Todos', 'Pendiente', 'Rebanando', 'Listo', 'Entregado', 'Cancelado'];

function getMexicoDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function displayDate(isoDate) {
  if (!isoDate) return '';
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(isoDate);
}

function normalizeFilters(query = {}) {
  const today = getMexicoDate();
  const type = REPORT_TYPES.has(query.tipo) ? query.tipo : 'vales';
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(query.fecha_inicio || '')) ? query.fecha_inicio : today;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(String(query.fecha_fin || '')) ? query.fecha_fin : today;
  const fechaInicio = start <= end ? start : end;
  const fechaFin = start <= end ? end : start;
  const estado = STATES.includes(query.estado) ? query.estado : 'Todos';
  return { tipo: type, fecha_inicio: fechaInicio, fecha_fin: fechaFin, estado };
}

function buildQuickRanges(filters) {
  const today = getMexicoDate();
  return {
    hoy: { fecha_inicio: today, fecha_fin: today },
    siete: { fecha_inicio: addDays(today, -6), fecha_fin: today },
    mes: { fecha_inicio: `${today.slice(0, 7)}-01`, fecha_fin: today },
    current: filters
  };
}

function deliveryText(vale) {
  if (vale.entrega_dias_texto) return vale.entrega_dias_texto;
  if (vale.entrega_fecha_inicio_fmt && vale.entrega_fecha_fin_fmt && vale.entrega_fecha_inicio_fmt !== vale.entrega_fecha_fin_fmt) {
    return `${displayDate(vale.entrega_fecha_inicio_fmt)} al ${displayDate(vale.entrega_fecha_fin_fmt)}`;
  }
  return displayDate(vale.entrega_fecha_inicio_fmt || vale.fecha_entrega_fmt);
}

async function attachProducts(vales) {
  if (!vales.length) return vales;
  const ids = vales.map(vale => vale.id);
  const placeholders = ids.map(() => '?').join(',');
  const [products] = await db.query(
    `SELECT id, vale_id, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, orden
     FROM vale_productos
     WHERE vale_id IN (${placeholders})
     ORDER BY vale_id, orden, id`,
    ids
  );

  const map = new Map();
  products.forEach(product => {
    if (!map.has(product.vale_id)) map.set(product.vale_id, []);
    map.get(product.vale_id).push(product);
  });

  return vales.map(vale => {
    const items = map.get(vale.id) || [];
    return {
      ...vale,
      productos: items,
      total_productos: items.length,
      cantidad_total: items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
      entrega_texto: deliveryText(vale)
    };
  });
}

async function loadVales(filters) {
  let stateFilter = '';
  const params = [filters.fecha_inicio, filters.fecha_fin, filters.fecha_inicio, filters.fecha_fin, filters.fecha_inicio, filters.fecha_fin];
  if (filters.estado !== 'Todos') {
    stateFilter = ' AND v.estado = ?';
    params.push(filters.estado);
  }

  const [rows] = await db.query(
    `SELECT v.*,
            DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt,
            DATE_FORMAT(v.entrega_fecha_inicio, '%Y-%m-%d') AS entrega_fecha_inicio_fmt,
            DATE_FORMAT(v.entrega_fecha_fin, '%Y-%m-%d') AS entrega_fecha_fin_fmt,
            DATE_FORMAT(CONVERT_TZ(sh.listo_at, '+00:00', '-06:00'), '%d/%m/%Y %H:%i') AS listo_display,
            DATE_FORMAT(CONVERT_TZ(sh.entregado_at, '+00:00', '-06:00'), '%d/%m/%Y %H:%i') AS entregado_display,
            DATE_FORMAT(CONVERT_TZ(sh.cancelado_at, '+00:00', '-06:00'), '%d/%m/%Y %H:%i') AS cancelado_display,
            CASE
              WHEN v.estado = 'Entregado' THEN DATE_FORMAT(CONVERT_TZ(COALESCE(sh.entregado_at, v.updated_at), '+00:00', '-06:00'), '%Y-%m-%d')
              WHEN v.estado = 'Cancelado' THEN DATE_FORMAT(CONVERT_TZ(COALESCE(sh.cancelado_at, v.updated_at), '+00:00', '-06:00'), '%Y-%m-%d')
              ELSE DATE_FORMAT(COALESCE(v.entrega_fecha_inicio, v.fecha_entrega), '%Y-%m-%d')
            END AS fecha_operacion_fmt
     FROM vales v
     LEFT JOIN (
       SELECT vale_id,
              MAX(CASE WHEN estado_nuevo = 'Listo' THEN created_at END) AS listo_at,
              MAX(CASE WHEN estado_nuevo = 'Entregado' THEN created_at END) AS entregado_at,
              MAX(CASE WHEN estado_nuevo = 'Cancelado' THEN created_at END) AS cancelado_at
       FROM vale_history
       WHERE estado_nuevo IN ('Listo', 'Entregado', 'Cancelado')
       GROUP BY vale_id
     ) sh ON sh.vale_id = v.id
     WHERE (
       (v.estado IN ('Pendiente', 'Rebanando', 'Listo')
        AND COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) >= ?
        AND COALESCE(v.entrega_fecha_inicio, v.fecha_entrega) <= ?)
       OR
       (v.estado = 'Entregado'
        AND DATE(CONVERT_TZ(COALESCE(sh.entregado_at, v.updated_at), '+00:00', '-06:00')) BETWEEN ? AND ?)
       OR
       (v.estado = 'Cancelado'
        AND DATE(CONVERT_TZ(COALESCE(sh.cancelado_at, v.updated_at), '+00:00', '-06:00')) BETWEEN ? AND ?)
     )${stateFilter}
     ORDER BY fecha_operacion_fmt DESC,
              CASE v.estado WHEN 'Pendiente' THEN 1 WHEN 'Rebanando' THEN 2 WHEN 'Listo' THEN 3 WHEN 'Entregado' THEN 4 ELSE 5 END,
              CASE v.prioridad WHEN 'Alta' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Baja' THEN 3 ELSE 4 END,
              v.created_at DESC`,
    params
  );

  const vales = await attachProducts(rows);
  const summary = { total: vales.length, Pendiente: 0, Rebanando: 0, Listo: 0, Entregado: 0, Cancelado: 0 };
  vales.forEach(vale => {
    if (Object.prototype.hasOwnProperty.call(summary, vale.estado)) summary[vale.estado] += 1;
  });
  return { vales, summary };
}

async function loadProductos(filters) {
  const params = [filters.fecha_inicio, filters.fecha_fin];
  const [rows] = await db.query(
    `SELECT vp.sku,
            MAX(vp.producto) AS producto,
            SUM(vp.cantidad) AS cantidad_surtida,
            COUNT(DISTINCT v.id) AS vales,
            COUNT(DISTINCT v.cliente) AS clientes,
            GROUP_CONCAT(DISTINCT vp.tipo_rebanado ORDER BY vp.tipo_rebanado SEPARATOR ', ') AS tipos_rebanado
     FROM vale_productos vp
     INNER JOIN vales v ON v.id = vp.vale_id
     LEFT JOIN (
       SELECT vale_id, MAX(created_at) AS entregado_at
       FROM vale_history
       WHERE estado_nuevo = 'Entregado'
       GROUP BY vale_id
     ) sh ON sh.vale_id = v.id
     WHERE v.estado = 'Entregado'
       AND DATE(CONVERT_TZ(COALESCE(sh.entregado_at, v.updated_at), '+00:00', '-06:00')) BETWEEN ? AND ?
     GROUP BY vp.sku
     ORDER BY cantidad_surtida DESC, producto ASC`,
    params
  );

  const [[valeCountRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM vales v
     LEFT JOIN (
       SELECT vale_id, MAX(created_at) AS entregado_at
       FROM vale_history
       WHERE estado_nuevo = 'Entregado'
       GROUP BY vale_id
     ) sh ON sh.vale_id = v.id
     WHERE v.estado = 'Entregado'
       AND DATE(CONVERT_TZ(COALESCE(sh.entregado_at, v.updated_at), '+00:00', '-06:00')) BETWEEN ? AND ?`,
    params
  );

  const [slicedRows] = await db.query(
    `SELECT sku, SUM(cantidad_rebanada_historial) AS rebanado_nuevo
     FROM inventario_movimientos
     WHERE tipo = 'SALIDA_VALE'
       AND reversed_at IS NULL
       AND fecha_operacion BETWEEN ? AND ?
     GROUP BY sku`,
    params
  ).catch(error => {
    console.warn('Reporte de productos sin desglose de inventario:', error.message);
    return [[]];
  });

  const slicedBySku = new Map(slicedRows.map(row => [String(row.sku), Number(row.rebanado_nuevo) || 0]));
  const totalCantidad = rows.reduce((sum, row) => sum + (Number(row.cantidad_surtida) || 0), 0);
  const products = rows.map((row, index) => {
    const cantidad = Number(row.cantidad_surtida) || 0;
    const rebanadoNuevo = slicedBySku.get(String(row.sku)) || 0;
    return {
      ...row,
      rank: index + 1,
      cantidad_surtida: cantidad,
      vales: Number(row.vales) || 0,
      clientes: Number(row.clientes) || 0,
      rebanado_nuevo: rebanadoNuevo,
      rebanado_previo_usado: Math.max(0, Math.round((cantidad - rebanadoNuevo) * 100) / 100),
      participacion: totalCantidad > 0 ? cantidad / totalCantidad : 0
    };
  });

  const bottomProducts = [...products].filter(item => item.cantidad_surtida > 0).sort((a, b) => a.cantidad_surtida - b.cantidad_surtida || a.producto.localeCompare(b.producto)).slice(0, 5);
  const summary = {
    productos: products.length,
    vales: Number(valeCountRow?.total) || 0,
    cantidad: totalCantidad,
    top: products[0] || null
  };

  return { products, topProducts: products.slice(0, 5), bottomProducts, summary };
}

async function loadMerma(filters) {
  const params = [filters.fecha_inicio, filters.fecha_fin];
  const [rows] = await db.query(
    `SELECT im.sku,
            MAX(COALESCE(p.descripcion, im.sku)) AS producto,
            SUM(im.cantidad_merma) AS merma_total,
            SUM(CASE WHEN im.tipo = 'MERMA_MANUAL' THEN im.cantidad_merma ELSE 0 END) AS merma_manual,
            SUM(CASE WHEN im.tipo = 'CIERRE_REBANADO' THEN im.cantidad_merma ELSE 0 END) AS merma_cierre,
            COUNT(*) AS eventos
     FROM inventario_movimientos im
     LEFT JOIN productos_rebanables p ON p.sku = im.sku
     WHERE im.cantidad_merma > 0
       AND im.reversed_at IS NULL
       AND im.fecha_operacion BETWEEN ? AND ?
     GROUP BY im.sku
     ORDER BY merma_total DESC, producto ASC`,
    params
  ).catch(error => {
    console.warn('Reporte de merma no disponible:', error.message);
    return [[]];
  });

  const [slicedRows] = await db.query(
    `SELECT sku, SUM(cantidad_rebanada_historial) AS rebanado_periodo
     FROM inventario_movimientos
     WHERE reversed_at IS NULL
       AND fecha_operacion BETWEEN ? AND ?
     GROUP BY sku`,
    params
  ).catch(() => [[]]);
  const slicedBySku = new Map(slicedRows.map(row => [String(row.sku), Number(row.rebanado_periodo) || 0]));

  const waste = rows.map(row => {
    const merma = Number(row.merma_total) || 0;
    const sliced = slicedBySku.get(String(row.sku)) || 0;
    return {
      ...row,
      merma_total: merma,
      merma_manual: Number(row.merma_manual) || 0,
      merma_cierre: Number(row.merma_cierre) || 0,
      eventos: Number(row.eventos) || 0,
      rebanado_periodo: sliced,
      porcentaje_merma: sliced > 0 ? merma / sliced : null
    };
  });

  const [detail] = await db.query(
    `SELECT DATE_FORMAT(im.fecha_operacion, '%d/%m/%Y') AS fecha,
            im.sku,
            COALESCE(p.descripcion, im.sku) AS producto,
            im.tipo,
            im.cantidad_merma,
            im.referencia,
            im.observaciones,
            u.name AS usuario
     FROM inventario_movimientos im
     LEFT JOIN productos_rebanables p ON p.sku = im.sku
     LEFT JOIN users u ON u.id = im.created_by
     WHERE im.cantidad_merma > 0
       AND im.reversed_at IS NULL
       AND im.fecha_operacion BETWEEN ? AND ?
     ORDER BY im.fecha_operacion DESC, im.id DESC`,
    params
  ).catch(() => [[]]);

  const summary = {
    productos: waste.length,
    merma: waste.reduce((sum, item) => sum + item.merma_total, 0),
    eventos: waste.reduce((sum, item) => sum + item.eventos, 0),
    rebanado: slicedRows.reduce((sum, item) => sum + (Number(item.rebanado_periodo) || 0), 0)
  };
  summary.porcentaje = summary.rebanado > 0 ? summary.merma / summary.rebanado : null;

  return { waste, detail, summary };
}

function periodMeta(filters, reportName) {
  return [
    `Reporte: ${reportName}`,
    `Periodo: ${displayDate(filters.fecha_inicio)} al ${displayDate(filters.fecha_fin)}`,
    'Generado por CHC Rebanado Digital'
  ];
}

function exportValesExcel(data, filters) {
  const valesRows = data.vales.map(vale => ({
    folio: vale.folio,
    pedido: vale.numero_pedido || '',
    origen: vale.origen || '',
    cliente: vale.cliente,
    lugar: vale.lugar_entrega || '',
    prioridad: vale.prioridad,
    estado: vale.estado,
    fecha_operacion: displayDate(vale.fecha_operacion_fmt),
    entrega: vale.entrega_texto || '',
    listo: vale.listo_display || '',
    entregado: vale.entregado_display || '',
    cancelado: vale.cancelado_display || '',
    productos: vale.total_productos,
    cantidad: Number(vale.cantidad_total) || 0,
    observaciones: vale.observaciones || ''
  }));
  const productRows = [];
  data.vales.forEach(vale => {
    (vale.productos || []).forEach(item => productRows.push({
      folio: vale.folio,
      pedido: vale.numero_pedido || '',
      estado: vale.estado,
      cliente: vale.cliente,
      sku: item.sku,
      producto: item.producto,
      cantidad: Number(item.cantidad) || 0,
      presentacion: item.presentacion || '',
      tipo: item.tipo_rebanado || '',
      indicaciones: item.observaciones || ''
    }));
  });

  return createWorkbook({ sheets: [
    {
      name: 'Vales', title: 'CHC · Reporte de vales', meta: periodMeta(filters, 'Vales del periodo'),
      columns: [
        { header: 'Folio', key: 'folio', width: 18 }, { header: 'Pedido / orden', key: 'pedido', width: 18 },
        { header: 'Origen', key: 'origen', width: 12 }, { header: 'Cliente / sucursal', key: 'cliente', width: 28 },
        { header: 'Lugar de entrega', key: 'lugar', width: 30 }, { header: 'Prioridad', key: 'prioridad', width: 12 },
        { header: 'Estado', key: 'estado', width: 14 }, { header: 'Fecha operativa', key: 'fecha_operacion', width: 16 },
        { header: 'Entrega solicitada', key: 'entrega', width: 24 }, { header: 'Listo', key: 'listo', width: 20 },
        { header: 'Entregado', key: 'entregado', width: 20 }, { header: 'Cancelado', key: 'cancelado', width: 20 },
        { header: 'Productos', key: 'productos', type: 'number', width: 12 }, { header: 'Cantidad', key: 'cantidad', type: 'number', width: 12 },
        { header: 'Observaciones', key: 'observaciones', width: 36 }
      ],
      rows: valesRows
    },
    {
      name: 'Detalle productos', title: 'CHC · Detalle de productos por vale', meta: periodMeta(filters, 'Detalle de productos'),
      columns: [
        { header: 'Folio', key: 'folio', width: 18 }, { header: 'Pedido / orden', key: 'pedido', width: 18 },
        { header: 'Estado', key: 'estado', width: 14 }, { header: 'Cliente / sucursal', key: 'cliente', width: 28 },
        { header: 'SKU', key: 'sku', width: 16 }, { header: 'Producto', key: 'producto', width: 34 },
        { header: 'Cantidad', key: 'cantidad', type: 'number', width: 12 }, { header: 'Presentación', key: 'presentacion', width: 18 },
        { header: 'Tipo rebanado', key: 'tipo', width: 18 }, { header: 'Indicaciones', key: 'indicaciones', width: 34 }
      ],
      rows: productRows
    }
  ] });
}

function exportProductosExcel(data, filters) {
  return createWorkbook({ sheets: [{
    name: 'Productos rebanados', title: 'CHC · Productos rebanados', meta: periodMeta(filters, 'Ranking de productos entregados'),
    columns: [
      { header: 'Ranking', key: 'rank', type: 'number', width: 10 }, { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Producto', key: 'producto', width: 36 }, { header: 'Tipos de rebanado', key: 'tipos_rebanado', width: 26 },
      { header: 'Vales', key: 'vales', type: 'number', width: 10 }, { header: 'Clientes / sucursales', key: 'clientes', type: 'number', width: 18 },
      { header: 'Cantidad surtida', key: 'cantidad_surtida', type: 'number', width: 16 },
      { header: 'Rebanado nuevo', key: 'rebanado_nuevo', type: 'number', width: 16 },
      { header: 'Usado de rebanado disponible', key: 'rebanado_previo_usado', type: 'number', width: 24 },
      { header: '% del periodo', key: 'participacion', type: 'percent', width: 14 }
    ],
    rows: data.products
  }] });
}

function exportMermaExcel(data, filters) {
  return createWorkbook({ sheets: [
    {
      name: 'Merma por producto', title: 'CHC · Merma y rendimiento', meta: periodMeta(filters, 'Merma por producto'),
      columns: [
        { header: 'SKU', key: 'sku', width: 16 }, { header: 'Producto', key: 'producto', width: 36 },
        { header: 'Merma total', key: 'merma_total', type: 'number', width: 15 }, { header: 'Merma manual', key: 'merma_manual', type: 'number', width: 15 },
        { header: 'Merma en cierre', key: 'merma_cierre', type: 'number', width: 15 }, { header: 'Rebanado registrado', key: 'rebanado_periodo', type: 'number', width: 18 },
        { header: '% merma / rebanado', key: 'porcentaje_merma', type: 'percent', width: 18 }, { header: 'Eventos', key: 'eventos', type: 'number', width: 10 }
      ],
      rows: data.waste
    },
    {
      name: 'Detalle merma', title: 'CHC · Detalle de merma', meta: periodMeta(filters, 'Movimientos de merma'),
      columns: [
        { header: 'Fecha', key: 'fecha', width: 14 }, { header: 'SKU', key: 'sku', width: 16 },
        { header: 'Producto', key: 'producto', width: 36 }, { header: 'Origen', key: 'tipo', width: 18 },
        { header: 'Cantidad merma', key: 'cantidad_merma', type: 'number', width: 16 }, { header: 'Referencia', key: 'referencia', width: 24 },
        { header: 'Usuario', key: 'usuario', width: 22 }, { header: 'Observaciones', key: 'observaciones', width: 40 }
      ],
      rows: data.detail.map(item => ({ ...item, cantidad_merma: Number(item.cantidad_merma) || 0 }))
    }
  ] });
}

exports.listar = async (req, res) => {
  const filtros = normalizeFilters(req.query);
  try {
    let data;
    if (filtros.tipo === 'productos') data = await loadProductos(filtros);
    else if (filtros.tipo === 'merma') data = await loadMerma(filtros);
    else data = await loadVales(filtros);

    if (req.query.exportar === 'xlsx') {
      let workbook;
      let baseName;
      if (filtros.tipo === 'productos') {
        workbook = exportProductosExcel(data, filtros);
        baseName = 'productos_rebanados';
      } else if (filtros.tipo === 'merma') {
        workbook = exportMermaExcel(data, filtros);
        baseName = 'merma_rebanado';
      } else {
        workbook = exportValesExcel(data, filtros);
        baseName = 'vales_rebanado';
      }
      const fileName = `${baseName}_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(workbook);
    }

    return res.render('reportes/lista', {
      title: 'Reportes',
      filtros,
      quickRanges: buildQuickRanges(filtros),
      estados: STATES,
      data,
      displayDate
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al generar el reporte';
    return res.redirect('/dashboard');
  }
};

exports._test = { normalizeFilters, deliveryText, displayDate, addDays };
