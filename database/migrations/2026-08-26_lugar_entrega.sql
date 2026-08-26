-- CHC Rebanado Digital V18.2.9
-- Campos opcionales para conservar el destino seleccionado en SAP/Siclik.
-- La migración es tolerante y puede ejecutarse más de una vez en MySQL 8.

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND COLUMN_NAME = 'lugar_entrega'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE vales ADD COLUMN lugar_entrega VARCHAR(255) NULL AFTER cliente_codigo',
  'SELECT ''lugar_entrega ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND COLUMN_NAME = 'codigo_lugar_entrega'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE vales ADD COLUMN codigo_lugar_entrega VARCHAR(100) NULL AFTER lugar_entrega',
  'SELECT ''codigo_lugar_entrega ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vales'
  AND COLUMN_NAME IN ('lugar_entrega', 'codigo_lugar_entrega')
ORDER BY ORDINAL_POSITION;
