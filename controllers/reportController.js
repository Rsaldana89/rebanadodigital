const db = require('../config/db');
// Conversor simple de JSON a CSV sin dependencias
function toCsv(data, fields) {
  const lines = [];
  lines.push(fields.join(','));
  data.forEach(item => {
    const row = fields.map(field => {
      let val = item[field];
      if (val === undefined || val === null) return '';
      val = String(val);
      // Escapar comillas dobles
      val = val.replace(/"/g, '""');
      // Envolver en comillas si contiene coma, salto de línea o comillas
      if (val.search(/[",\n]/) >= 0) {
        val = `"${val}"`;
      }
      return val;
    });
    lines.push(row.join(','));
  });
  return lines.join('\n');
}

// Lista de reportes de vales
exports.listar = async (req, res) => {
  const { estado, fecha_inicio, fecha_fin, exportar } = req.query;
  try {
    let query = 'SELECT * FROM vales WHERE 1 = 1';
    const params = [];
    if (estado && estado !== 'Todos') {
      query += ' AND estado = ?';
      params.push(estado);
    }
    if (fecha_inicio) {
      query += ' AND fecha_entrega >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND fecha_entrega <= ?';
      params.push(fecha_fin);
    }
    const [vales] = await db.query(query, params);
    if (exportar === 'csv') {
      const fields = ['folio','cliente','producto','cantidad','prioridad','estado','fecha_entrega'];
      const csv = toCsv(vales, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('reporte_vales.csv');
      return res.send(csv);
    }
    res.render('reportes/lista', {
      title: 'Reportes de vales',
      vales,
      filtros: { estado: estado || 'Todos', fecha_inicio, fecha_fin }
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al generar el reporte';
    res.redirect('/dashboard');
  }
};