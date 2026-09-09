const db = require('../config/db');
const syncService = require('../services/rebanadoSyncService');

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
      `SELECT v.estado, COUNT(*) AS total
       FROM vales v
       LEFT JOIN (
         SELECT vale_id,
                MAX(CASE WHEN estado_nuevo = 'Entregado' THEN created_at END) AS entregado_at,
                MAX(CASE WHEN estado_nuevo = 'Cancelado' THEN created_at END) AS cancelado_at
         FROM vale_history
         WHERE estado_nuevo IN ('Entregado', 'Cancelado')
         GROUP BY vale_id
       ) sh ON sh.vale_id = v.id
       WHERE (
         v.estado IN ('Pendiente', 'Rebanando', 'Listo')
         AND (
           ? BETWEEN COALESCE(v.entrega_fecha_inicio, v.fecha_entrega)
                     AND COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega)
           OR COALESCE(v.entrega_fecha_fin, v.entrega_fecha_inicio, v.fecha_entrega) < ?
         )
       )
          OR (v.estado = 'Entregado'
              AND DATE(CONVERT_TZ(COALESCE(sh.entregado_at, v.updated_at), '+00:00', '-06:00')) = ?)
          OR (v.estado = 'Cancelado'
              AND DATE(CONVERT_TZ(COALESCE(sh.cancelado_at, v.updated_at), '+00:00', '-06:00')) = ?)
       GROUP BY v.estado`,
      [fechaTrabajo, fechaTrabajo, fechaTrabajo, fechaTrabajo]
    );

    const [overdueRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM vales
       WHERE COALESCE(entrega_fecha_fin, entrega_fecha_inicio, fecha_entrega) < ?
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
    const syncStatus = ['administrador', 'cedis'].includes(req.session.user.role)
      ? await syncService.getStatusForUi()
      : null;

    res.render('dashboard', {
      title: 'Dashboard',
      summary,
      total,
      overdueCount,
      fechaTrabajo,
      fechaTrabajoDisplay: fechaTrabajo.split('-').reverse().join('/'),
      horaActual: now.displayTime,
      syncStatus
    });
  } catch (err) {
    console.error(err);
    req.session.error_msg = 'Error al cargar el dashboard';
    res.redirect('/');
  }
};
