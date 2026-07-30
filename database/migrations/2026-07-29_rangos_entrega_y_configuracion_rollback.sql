-- Rollback opcional de CHC Rebanado Digital v17.2.
-- No elimina campos ni vales de la integración CORONELBOT.

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND INDEX_NAME = 'idx_vales_entrega_rango_estado'
);
SET @sql := IF(
  @exists > 0,
  'ALTER TABLE vales DROP INDEX idx_vales_entrega_rango_estado',
  'SELECT ''idx_vales_entrega_rango_estado no existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS app_settings;

SELECT 'Rollback v17.2 aplicado' AS resultado;
