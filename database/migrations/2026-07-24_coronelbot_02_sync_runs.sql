-- CHC Rebanado Digital V17 - CORONELBOT
-- Motor: MySQL 8.x / MariaDB compatible
-- Respaldar la base antes de ejecutar.

SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;

-- ----------------------------------
-- 3. Bitácora de sincronizaciones
-- ----------------------------------
CREATE TABLE IF NOT EXISTS rebanado_sync_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  sync_run_id VARCHAR(100) NOT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status ENUM('running','success','partial_error','error') NOT NULL DEFAULT 'running',
  orders_received INT NOT NULL DEFAULT 0,
  orders_created INT NOT NULL DEFAULT 0,
  orders_updated INT NOT NULL DEFAULT 0,
  orders_skipped INT NOT NULL DEFAULT 0,
  products_created INT NOT NULL DEFAULT 0,
  products_updated INT NOT NULL DEFAULT 0,
  products_skipped INT NOT NULL DEFAULT 0,
  last_error MEDIUMTEXT NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rebanado_sync_runs_started (started_at),
  KEY idx_rebanado_sync_runs_status (status, finished_at),
  KEY idx_rebanado_sync_runs_source_id (source, sync_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asegura details_json también si la tabla fue creada por una versión previa del script.
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rebanado_sync_runs' AND COLUMN_NAME = 'details_json');
SET @sql := IF(@exists = 0, 'ALTER TABLE rebanado_sync_runs ADD COLUMN details_json JSON NULL AFTER last_error', 'SELECT ''details_json ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET SQL_SAFE_UPDATES = 1;
SELECT 'Tabla rebanado_sync_runs aplicada' AS resultado;
