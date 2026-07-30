const assert = require('assert');
const path = require('path');

const dbPath = path.resolve(__dirname, '../config/db.js');
const servicePath = path.resolve(__dirname, '../services/settingsService.js');

function loadService(fakeDb) {
  delete require.cache[servicePath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  return require(servicePath);
}

(async () => {
  const writes = [];
  const fakeConnection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params) => { writes.push({ sql, params }); return [{ affectedRows: 1 }]; }
  };
  const fakeDb = {
    query: async () => [[
      { setting_key: 'rebanado_sync_alert_hours', setting_value: '8' },
      { setting_key: 'rebanado_sync_alert_grace_minutes', setting_value: '45' }
    ]],
    getConnection: async () => fakeConnection
  };

  const service = loadService(fakeDb);
  const current = await service.getSyncAlertSettings();
  assert.strictEqual(current.alertHours, 8);
  assert.strictEqual(current.alertGraceMinutes, 45);

  const saved = await service.saveSyncAlertSettings({ alertHours: 10, alertGraceMinutes: 15, updatedBy: 1 });
  assert.strictEqual(saved.alertHours, 10);
  assert.strictEqual(saved.alertGraceMinutes, 15);
  assert.strictEqual(writes.length, 2);
  console.log('Pruebas de configuración de alertas: OK');
})().catch(error => { console.error(error); process.exit(1); });
