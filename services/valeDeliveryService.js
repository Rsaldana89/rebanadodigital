const ACTIVE_STATES = ['Pendiente', 'Rebanando', 'Listo'];

function displayDateFromISO(isoDate) {
  if (!isoDate) return '';
  return String(isoDate).slice(0, 10).split('-').reverse().join('/');
}

function isoDateFromValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function dayDiff(olderIsoDate, newerIsoDate) {
  if (!olderIsoDate || !newerIsoDate) return 0;
  const older = new Date(`${olderIsoDate}T00:00:00Z`);
  const newer = new Date(`${newerIsoDate}T00:00:00Z`);
  const diff = newer.getTime() - older.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function enrichValeDelivery(vale, filtroFecha) {
  const fechaEntrega = vale.fecha_entrega_fmt || isoDateFromValue(vale.fecha_entrega);
  const entregaInicio = vale.entrega_fecha_inicio_fmt || isoDateFromValue(vale.entrega_fecha_inicio) || fechaEntrega;
  const entregaFin = vale.entrega_fecha_fin_fmt || isoDateFromValue(vale.entrega_fecha_fin) || entregaInicio || fechaEntrega;
  const entregaTexto = String(vale.entrega_dias_texto || '').trim();
  const entregaDisplay = entregaTexto || displayDateFromISO(entregaInicio || fechaEntrega);
  const isOverdue = Boolean(entregaFin && entregaFin < filtroFecha && ACTIVE_STATES.includes(vale.estado));

  return {
    ...vale,
    fecha_entrega_fmt: fechaEntrega,
    entrega_fecha_inicio_fmt: entregaInicio,
    entrega_fecha_fin_fmt: entregaFin,
    entrega_display: entregaDisplay,
    entrega_es_rango: Boolean(entregaInicio && entregaFin && entregaInicio !== entregaFin),
    is_overdue: isOverdue,
    days_late: isOverdue ? dayDiff(entregaFin, filtroFecha) : 0
  };
}

module.exports = {
  ACTIVE_STATES,
  displayDateFromISO,
  isoDateFromValue,
  dayDiff,
  enrichValeDelivery
};
