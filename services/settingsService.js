const db = require('../config/db');

const DEFAULT_SYNC_ALERT_HOURS = Math.max(1, Number(process.env.REBANADO_SYNC_ALERT_HOURS || 6));
const DEFAULT_SYNC_ALERT_GRACE_MINUTES = Math.max(0, Number(process.env.REBANADO_SYNC_ALERT_GRACE_MINUTES || 30));

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
}

async function getValues(keys = []) {
  if (!keys.length) return {};
  const placeholders = keys.map(() => '?').join(',');
  try {
    const [rows] = await db.query(
      `SELECT setting_key, setting_value
       FROM app_settings
       WHERE setting_key IN (${placeholders})`,
      keys
    );
    return rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
  } catch (error) {
    // Mantiene la app operativa antes de aplicar la migración nueva.
    if (error.code === 'ER_NO_SUCH_TABLE') return {};
    throw error;
  }
}

async function getSyncAlertSettings() {
  const values = await getValues([
    'rebanado_sync_alert_hours',
    'rebanado_sync_alert_grace_minutes'
  ]);

  return {
    alertHours: clampInteger(values.rebanado_sync_alert_hours, DEFAULT_SYNC_ALERT_HOURS, 1, 168),
    alertGraceMinutes: clampInteger(values.rebanado_sync_alert_grace_minutes, DEFAULT_SYNC_ALERT_GRACE_MINUTES, 0, 180),
    storedInDatabase: Object.prototype.hasOwnProperty.call(values, 'rebanado_sync_alert_hours')
  };
}

async function saveSyncAlertSettings({ alertHours, alertGraceMinutes, updatedBy }) {
  const safeHours = clampInteger(alertHours, DEFAULT_SYNC_ALERT_HOURS, 1, 168);
  const safeGrace = clampInteger(alertGraceMinutes, DEFAULT_SYNC_ALERT_GRACE_MINUTES, 0, 180);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const rows = [
      ['rebanado_sync_alert_hours', String(safeHours), 'Horas máximas sin contacto de CORONELBOT antes de mostrar alerta.', updatedBy || null],
      ['rebanado_sync_alert_grace_minutes', String(safeGrace), 'Margen adicional en minutos antes de mostrar alerta de sincronización.', updatedBy || null]
    ];

    for (const row of rows) {
      await connection.query(
        `INSERT INTO app_settings
          (setting_key, setting_value, description, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           setting_value = VALUES(setting_value),
           description = VALUES(description),
           updated_by = VALUES(updated_by),
           updated_at = CURRENT_TIMESTAMP`,
        row
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }

  return { alertHours: safeHours, alertGraceMinutes: safeGrace, storedInDatabase: true };
}

module.exports = {
  DEFAULT_SYNC_ALERT_HOURS,
  DEFAULT_SYNC_ALERT_GRACE_MINUTES,
  getSyncAlertSettings,
  saveSyncAlertSettings
};
