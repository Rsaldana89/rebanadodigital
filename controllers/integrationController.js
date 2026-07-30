const syncService = require('../services/rebanadoSyncService');

exports.receiveOrders = async (req, res) => {
  try {
    const result = await syncService.synchronize(req.body || {});
    const statusCode = result.status === 'error' ? 422 : 200;
    return res.status(statusCode).json(result);
  } catch (error) {
    console.error('Error general en integración SAP/Siclik:', error);
    const statusCode = error.code === 'ER_NO_SUCH_TABLE' ? 503 : 500;
    return res.status(statusCode).json({
      ok: false,
      status: 'error',
      syncRunId: req.body?.syncRunId || null,
      errors: [{ sapDocEntry: null, message: error.message || 'Error interno de sincronización.' }]
    });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    return res.json(await syncService.recordHeartbeat(req.body || {}));
  } catch (error) {
    console.error('Error registrando heartbeat de CORONELBOT:', error);
    return res.status(error.code === 'ER_NO_SUCH_TABLE' ? 503 : 500).json({
      ok: false,
      status: 'unavailable',
      message: error.code === 'ER_NO_SUCH_TABLE'
        ? 'La migración de integración CORONELBOT no está aplicada.'
        : 'No fue posible registrar el contacto de CORONELBOT.'
    });
  }
};

exports.status = async (req, res) => {
  try {
    return res.json(await syncService.getStatus());
  } catch (error) {
    console.error('Error consultando estado de sincronización:', error);
    return res.status(503).json({
      ok: false,
      status: 'unavailable',
      message: error.code === 'ER_NO_SUCH_TABLE'
        ? 'La migración de integración CORONELBOT no está aplicada.'
        : 'No fue posible consultar la sincronización.'
    });
  }
};

exports.runs = async (req, res) => {
  try {
    const runs = await syncService.getRuns(req.query.limit);
    return res.json({ ok: true, count: runs.length, runs });
  } catch (error) {
    console.error('Error consultando historial de sincronización:', error);
    return res.status(503).json({ ok: false, status: 'unavailable', message: 'No fue posible consultar el historial.' });
  }
};
