const crypto = require('crypto');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = function requireSyncToken(req, res, next) {
  const configuredToken = process.env.REBANADO_SYNC_TOKEN;
  if (!configuredToken) {
    return res.status(503).json({
      ok: false,
      status: 'configuration_error',
      message: 'REBANADO_SYNC_TOKEN no está configurado en el servidor.'
    });
  }

  const authorization = String(req.get('Authorization') || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const receivedToken = match ? match[1].trim() : '';

  if (!receivedToken || !safeEqual(receivedToken, configuredToken)) {
    return res.status(401).json({
      ok: false,
      status: 'unauthorized',
      message: 'Token de integración inválido o ausente.'
    });
  }

  return next();
};
