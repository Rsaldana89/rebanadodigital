const db = require('../config/db');

function toCsv(data, fields) {
  const lines = [];
  lines.push(fields.join(','));
  data.forEach(item => {
    const row = fields.map(field => {
      let val = item[field];
      if (val === undefined || val === null) return '';
      val = String(val).replace(/"/g, '""');
      if (val.search(/[",\n]/) >= 0) val = `"${val}"`;
      return val;
    });
    lines.push(row.join(','));
  });
  return lines.join('\n');
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

  return vales.map(vale => ({
    ...vale,
    productos: map.get(vale.id) || [],
    total_productos: (map.get(vale.id) || []).length
  }));
}

exports.listar = async (req, res) => {
  const { estado, fecha_inicio, fecha_fin, exportar } = req.query;
  try {
    let query = `SELECT v.*, DATE_FORMAT(v.fecha_entrega, '%Y-%m-%d') AS fecha_entrega_fmt
                 FROM vales v
                 WHERE 1 = 1`;
    const params = [];

    if (estado && estado !== 'Todos') {
      query += ' AND v.estado = ?';
      params.push(estado);
    }
    if (fecha_inicio) {
      query += ' AND v.fecha_entrega >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND v.fecha_entrega <= ?';
      params.push(fecha_fin);
    }

    query += ' ORDER BY v.fecha_entrega DESC, v.created_at DESC';
    const [rows] = await db.query(query, params);
    const vales = await attachProducts(rows);

    if (exportar === 'csv') {
      // El CSV genera un renglón por producto, conservando los datos del vale/pedido.
      const csvRows = [];
      vales.forEach(vale => {
        if (!vale.productos.length) {
          csvRows.push({
            folio: vale.folio,
            numero_pedido: vale.numero_pedido || '',
            cliente: vale.cliente,
            sku: '',
            producto: '',
            cantidad: '',
            presentacion: '',
            tipo_rebanado: '',
            indicaciones_producto: '',
            prioridad: vale.prioridad,
            estado: vale.estado,
            fecha_entrega: vale.fecha_entrega_fmt || '',
            observaciones_generales: vale.observaciones || ''
          });
          return;
        }

        vale.productos.forEach(product => {
          csvRows.push({
            folio: vale.folio,
            numero_pedido: vale.numero_pedido || '',
            cliente: vale.cliente,
            sku: product.sku,
            producto: product.producto,
            cantidad: product.cantidad,
            presentacion: product.presentacion,
            tipo_rebanado: product.tipo_rebanado,
            indicaciones_producto: product.observaciones || '',
            prioridad: vale.prioridad,
            estado: vale.estado,
            fecha_entrega: vale.fecha_entrega_fmt || '',
            observaciones_generales: vale.observaciones || ''
          });
        });
      });

      const fields = [
        'folio', 'numero_pedido', 'cliente', 'sku', 'producto', 'cantidad', 'presentacion',
        'tipo_rebanado', 'indicaciones_producto', 'prioridad', 'estado', 'fecha_entrega',
        'observaciones_generales'
      ];
      const csv = toCsv(csvRows, fields);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('reporte_vales_productos.csv');
      return res.send(`\uFEFF${csv}`);
    }

    return res.render('reportes/lista', {
      title: 'Reportes de vales',
      vales,
      filtros: { estado: estado || 'Todos', fecha_inicio, fecha_fin }
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al generar el reporte';
    return res.redirect('/dashboard');
  }
};
