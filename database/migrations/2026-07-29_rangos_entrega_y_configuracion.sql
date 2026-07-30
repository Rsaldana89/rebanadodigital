-- =====================================================================
-- CHC Rebanado Digital v17.2
-- Rango de entrega Siclik + configuración administrativa de alertas
-- Motor: MySQL 8.x
--
-- No modifica ni elimina vales existentes. Puede ejecutarse más de una vez.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_app_settings_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings (setting_key, setting_value, description, updated_by)
VALUES
  ('rebanado_sync_alert_hours', '6', 'Horas máximas sin contacto de CORONELBOT antes de mostrar alerta.', NULL),
  ('rebanado_sync_alert_grace_minutes', '30', 'Margen adicional en minutos antes de mostrar alerta de sincronización.', NULL)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- Ayuda a consultar rápidamente un día dentro del rango de entrega Siclik.
SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND INDEX_NAME = 'idx_vales_entrega_rango_estado'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE vales ADD KEY idx_vales_entrega_rango_estado (entrega_fecha_inicio, entrega_fecha_fin, estado)',
  'SELECT ''idx_vales_entrega_rango_estado ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración v17.2 aplicada correctamente' AS resultado;
