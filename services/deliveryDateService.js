function isValidDateParts(day, month, year) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseSingleDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidDateParts(day, month, year)) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseEntregaDias(texto) {
  const original = String(texto || '').trim();
  const matches = original.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];

  if (!matches.length) {
    throw new Error('ENTREGA_DIAS no contiene una fecha válida en formato DD/MM/AAAA.');
  }

  const start = parseSingleDate(matches[0]);
  const end = parseSingleDate(matches[1] || matches[0]);
  if (!start || !end) {
    throw new Error('ENTREGA_DIAS contiene una fecha inexistente o inválida.');
  }
  if (end < start) {
    throw new Error('La fecha final de ENTREGA_DIAS es anterior a la fecha inicial.');
  }

  return {
    texto: original,
    fechaInicio: start,
    fechaFin: end
  };
}

module.exports = { parseEntregaDias, parseSingleDate };
