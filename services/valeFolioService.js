const crypto = require('crypto');

const ORIGIN_PREFIXES = {
  Manual: 'VM',
  Siclik: 'VS',
  Excel: 'VE'
};

function getPrefix(origin) {
  return ORIGIN_PREFIXES[origin] || 'V';
}

function getMexicoYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

  return `${parts.year.slice(-2)}${parts.month}`;
}

function buildValeFolio(origin, valeId, date = new Date()) {
  const numericId = Number(valeId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('No es posible generar el folio sin un ID de vale valido.');
  }

  const consecutive = String(numericId).padStart(4, '0');
  return `${getPrefix(origin)}-${getMexicoYearMonth(date)}-${consecutive}`;
}

// La tabla exige un folio desde el INSERT. Este valor existe solamente dentro
// de la transaccion; en cuanto MySQL devuelve el ID real se sustituye por el
// folio definitivo VM/VS-AAMM-ID.
function buildTemporaryFolio(origin) {
  const uniquePart = `${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`;
  return `TMP-${getPrefix(origin)}-${uniquePart}`.slice(0, 50);
}

async function assignFinalFolio(connection, valeId, origin, date = new Date()) {
  const folio = buildValeFolio(origin, valeId, date);
  await connection.query('UPDATE vales SET folio = ? WHERE id = ?', [folio, valeId]);
  return folio;
}

module.exports = {
  buildValeFolio,
  buildTemporaryFolio,
  assignFinalFolio,
  getMexicoYearMonth
};
