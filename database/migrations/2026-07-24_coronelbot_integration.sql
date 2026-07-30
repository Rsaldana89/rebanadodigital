-- =====================================================================
-- CHC Rebanado Digital V17
-- Integración CORONELBOT / SAP / Siclik
-- Motor: MySQL 8.x / MariaDB compatible con mysql2
--
-- Ejecutar una sola vez después de la migración multiproducto V17.
-- El script es tolerante a reejecuciones: valida columnas e índices.
-- Recomendación obligatoria: respaldar la base antes de ejecutar.
-- =====================================================================

SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------
-- 1. Campos nuevos en vales
-- ---------------------------
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'sap_docentry');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN sap_docentry INT NULL AFTER numero_pedido', 'SELECT ''sap_docentry ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'sap_docnum');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN sap_docnum INT NULL AFTER sap_docentry', 'SELECT ''sap_docnum ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'external_key');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN external_key VARCHAR(100) NULL AFTER sap_docnum', 'SELECT ''external_key ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'cliente_codigo');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN cliente_codigo VARCHAR(50) NULL AFTER cliente', 'SELECT ''cliente_codigo ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'fecha_pedido');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN fecha_pedido DATE NULL AFTER cliente_codigo', 'SELECT ''fecha_pedido ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_dias_texto');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_dias_texto VARCHAR(120) NULL AFTER fecha_entrega', 'SELECT ''entrega_dias_texto ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_fecha_inicio');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_fecha_inicio DATE NULL AFTER entrega_dias_texto', 'SELECT ''entrega_fecha_inicio ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_fecha_fin');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_fecha_fin DATE NULL AFTER entrega_fecha_inicio', 'SELECT ''entrega_fecha_fin ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_horario');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_horario VARCHAR(100) NULL AFTER entrega_fecha_fin', 'SELECT ''entrega_horario ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_nombre');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_nombre VARCHAR(150) NULL AFTER entrega_horario', 'SELECT ''entrega_nombre ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'entrega_epp');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN entrega_epp VARCHAR(255) NULL AFTER entrega_nombre', 'SELECT ''entrega_epp ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'comentario_entrega');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN comentario_entrega TEXT NULL AFTER entrega_epp', 'SELECT ''comentario_entrega ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'numero_traslado');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN numero_traslado VARCHAR(100) NULL AFTER comentario_entrega', 'SELECT ''numero_traslado ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'siclik_usuario_nombre');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN siclik_usuario_nombre VARCHAR(150) NULL AFTER numero_traslado', 'SELECT ''siclik_usuario_nombre ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'siclik_usuario_correo');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN siclik_usuario_correo VARCHAR(190) NULL AFTER siclik_usuario_nombre', 'SELECT ''siclik_usuario_correo ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'last_synced_at');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD COLUMN last_synced_at DATETIME NULL AFTER updated_at', 'SELECT ''last_synced_at ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índice único: MySQL permite múltiples NULL, por lo que los vales manuales no chocan.
SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND INDEX_NAME = 'uq_vales_external_key');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD UNIQUE KEY uq_vales_external_key (external_key)', 'SELECT ''uq_vales_external_key ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND INDEX_NAME = 'idx_vales_sap_docentry');
SET @sql := IF(@exists = 0, 'ALTER TABLE vales ADD KEY idx_vales_sap_docentry (sap_docentry)', 'SELECT ''idx_vales_sap_docentry ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------
-- 2. Campos nuevos en vale_productos
-- -----------------------------------
-- Se amplían dos columnas existentes para no perder valores como "Corte fino".
ALTER TABLE vale_productos MODIFY COLUMN presentacion VARCHAR(100) NOT NULL;
ALTER TABLE vale_productos MODIFY COLUMN tipo_rebanado VARCHAR(80) NOT NULL DEFAULT 'Estándar';

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND COLUMN_NAME = 'sap_line_num');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD COLUMN sap_line_num INT NULL AFTER vale_id', 'SELECT ''sap_line_num ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND COLUMN_NAME = 'external_line_key');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD COLUMN external_line_key VARCHAR(140) NULL AFTER sap_line_num', 'SELECT ''external_line_key ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND COLUMN_NAME = 'almacen');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD COLUMN almacen VARCHAR(50) NULL AFTER cantidad', 'SELECT ''almacen ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND COLUMN_NAME = 'last_synced_at');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD COLUMN last_synced_at DATETIME NULL AFTER updated_at', 'SELECT ''last_synced_at ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND INDEX_NAME = 'uq_vale_productos_external_line_key');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD UNIQUE KEY uq_vale_productos_external_line_key (external_line_key)', 'SELECT ''uq_vale_productos_external_line_key ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vale_productos' AND INDEX_NAME = 'idx_vale_productos_sap_line');
SET @sql := IF(@exists = 0, 'ALTER TABLE vale_productos ADD KEY idx_vale_productos_sap_line (vale_id, sap_line_num)', 'SELECT ''idx_vale_productos_sap_line ya existe'' AS info'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

SELECT 'Migración CORONELBOT aplicada' AS resultado;
