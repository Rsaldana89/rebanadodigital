const db = require('../config/db');

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

exports.index = async (req, res) => {
  try {
    const fechaTrabajo = req.query.fecha || getMexicoDateParts().isoDate;
    const now = getMexicoDateParts();

    const [counts] = await db.query(
      `SELECT estado, COUNT(*) AS total
       FROM vales
       WHERE DATE(fecha_entrega) = ?
          OR (DATE(fecha_entrega) < ? AND estado IN ('Pendiente', 'Rebanando', 'Listo'))
       GROUP BY estado`,
      [fechaTrabajo, fechaTrabajo]
    );

    const [overdueRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM vales
       WHERE DATE(fecha_entrega) < ?
         AND estado IN ('Pendiente', 'Rebanando', 'Listo')`,
      [fechaTrabajo]
    );

    const summary = {
      Pendiente: 0,
      Rebanando: 0,
      Listo: 0,
      Entregado: 0,
      Cancelado: 0
    };

    counts.forEach(row => {
      summary[row.estado] = row.total;
    });

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const overdueCount = overdueRows[0]?.total || 0;

    res.render('dashboard', {
      title: 'Dashboard',
      summary,
      total,
      overdueCount,
      fechaTrabajo,
      fechaTrabajoDisplay: fechaTrabajo.split('-').reverse().join('/'),
      horaActual: now.displayTime
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el dashboard';
    res.redirect('/');
  }
};
