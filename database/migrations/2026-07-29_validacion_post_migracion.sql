-- Validación posterior a la actualización CORONELBOT + v17.2.
-- No modifica datos.

SELECT DATABASE() AS base_actual;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vales'
  AND COLUMN_NAME IN (
    'external_key', 'entrega_dias_texto', 'entrega_fecha_inicio',
    'entrega_fecha_fin', 'last_synced_at'
  )
ORDER BY ORDINAL_POSITION;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vale_productos'
  AND COLUMN_NAME IN ('external_line_key', 'sap_line_num', 'almacen', 'last_synced_at')
ORDER BY ORDINAL_POSITION;

SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('rebanado_sync_runs', 'app_settings')
ORDER BY TABLE_NAME;

SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vales'
  AND INDEX_NAME IN ('uq_vales_external_key', 'idx_vales_entrega_rango_estado')
GROUP BY INDEX_NAME
ORDER BY INDEX_NAME;

SELECT setting_key, setting_value, updated_at
FROM app_settings
WHERE setting_key IN ('rebanado_sync_alert_hours', 'rebanado_sync_alert_grace_minutes')
ORDER BY setting_key;
