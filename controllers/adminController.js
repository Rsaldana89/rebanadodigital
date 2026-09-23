const { buildSqlBackup, buildBackupFilename } = require('../services/databaseBackupService');

exports.downloadDatabaseBackup = async (req, res) => {
  try {
    const requestedBy = req.session.user?.username || req.session.user?.name || 'administrador';
    const sql = await buildSqlBackup({ requestedBy });
    const filename = buildBackupFilename();

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).send(sql);
  } catch (error) {
    console.error('Error al generar respaldo de base de datos:', error);
    req.session.error_msg = 'No fue posible generar el respaldo de la base de datos';
    return res.redirect('/permisos');
  }
};
