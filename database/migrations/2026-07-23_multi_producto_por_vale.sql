-- ============================================================
-- CHC Rebanado Digital
-- Migración V16 -> V17: varios productos por vale/pedido
-- Ejecutar una sola vez sobre la base existente.
--
-- Recomendación: generar un respaldo antes de ejecutar.
-- La migración conserva cada producto anterior como el primer
-- producto de su vale y después retira las columnas antiguas.
-- ============================================================

SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Agregar número de pedido a la cabecera si todavía no existe.
SET @has_numero_pedido := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND COLUMN_NAME = 'numero_pedido'
);
SET @sql := IF(
  @has_numero_pedido = 0,
  'ALTER TABLE vales ADD COLUMN numero_pedido VARCHAR(80) NULL AFTER origen',
  'SELECT ''numero_pedido ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Crear el detalle de productos.
CREATE TABLE IF NOT EXISTS vale_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vale_id INT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  producto VARCHAR(150) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  presentacion VARCHAR(50) NOT NULL,
  tipo_rebanado ENUM('Estándar','Grueso','Otro') NOT NULL DEFAULT 'Estándar',
  observaciones TEXT,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_vale_productos_vale (vale_id, orden),
  KEY idx_vale_productos_sku (sku),
  CONSTRAINT fk_vale_productos_vale
    FOREIGN KEY (vale_id) REFERENCES vales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Migrar el producto actual de cada vale, únicamente cuando
--    las columnas antiguas todavía existen.
SET @has_legacy_columns := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vales'
    AND COLUMN_NAME IN ('sku','producto','cantidad','presentacion','tipo_rebanado')
);

SET @sql := IF(
  @has_legacy_columns = 5,
  'INSERT INTO vale_productos (vale_id, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, orden)
   SELECT v.id, v.sku, v.producto, v.cantidad, v.presentacion, v.tipo_rebanado, NULL, 1
   FROM vales v
   WHERE NOT EXISTS (SELECT 1 FROM vale_productos vp WHERE vp.vale_id = v.id)',
  'SELECT ''Las columnas anteriores ya no existen; se omite la migración de datos'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Verificación previa: cada vale debe tener al menos un producto.
SET @missing_products := (
  SELECT COUNT(*)
  FROM vales v
  LEFT JOIN vale_productos vp ON vp.vale_id = v.id
  WHERE vp.id IS NULL
);

SELECT @missing_products AS vales_sin_productos;

-- 5. Retirar columnas antiguas únicamente si todos los vales
--    quedaron respaldados en vale_productos. Si el resultado anterior
--    es mayor a cero, no se elimina información y debe revisarse.
--    Cada sentencia es condicional para
--    permitir verificar o reejecutar el script sin errores.
SET @has_column := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'sku');
SET @sql := IF(@missing_products = 0 AND @has_column = 1, 'ALTER TABLE vales DROP COLUMN sku', IF(@has_column = 0, 'SELECT ''sku ya fue retirado'' AS info', 'SELECT ''No se retiró sku porque existen vales sin productos'' AS advertencia'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_column := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'producto');
SET @sql := IF(@missing_products = 0 AND @has_column = 1, 'ALTER TABLE vales DROP COLUMN producto', IF(@has_column = 0, 'SELECT ''producto ya fue retirado'' AS info', 'SELECT ''No se retiró producto porque existen vales sin productos'' AS advertencia'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_column := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'cantidad');
SET @sql := IF(@missing_products = 0 AND @has_column = 1, 'ALTER TABLE vales DROP COLUMN cantidad', IF(@has_column = 0, 'SELECT ''cantidad ya fue retirada'' AS info', 'SELECT ''No se retiró cantidad porque existen vales sin productos'' AS advertencia'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_column := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'presentacion');
SET @sql := IF(@missing_products = 0 AND @has_column = 1, 'ALTER TABLE vales DROP COLUMN presentacion', IF(@has_column = 0, 'SELECT ''presentacion ya fue retirada'' AS info', 'SELECT ''No se retiró presentacion porque existen vales sin productos'' AS advertencia'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_column := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND COLUMN_NAME = 'tipo_rebanado');
SET @sql := IF(@missing_products = 0 AND @has_column = 1, 'ALTER TABLE vales DROP COLUMN tipo_rebanado', IF(@has_column = 0, 'SELECT ''tipo_rebanado ya fue retirado'' AS info', 'SELECT ''No se retiró tipo_rebanado porque existen vales sin productos'' AS advertencia'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Asegurar índices recomendados.
SET @has_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND INDEX_NAME = 'idx_vales_fecha_estado'
);
SET @sql := IF(@has_index = 0, 'ALTER TABLE vales ADD INDEX idx_vales_fecha_estado (fecha_entrega, estado)', 'SELECT ''Índice fecha/estado ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vales' AND INDEX_NAME = 'idx_vales_cliente'
);
SET @sql := IF(@has_index = 0, 'ALTER TABLE vales ADD INDEX idx_vales_cliente (cliente)', 'SELECT ''Índice cliente ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- Resumen final.
SELECT
  COUNT(DISTINCT v.id) AS total_vales,
  COUNT(vp.id) AS total_productos,
  SUM(CASE WHEN vp.id IS NULL THEN 1 ELSE 0 END) AS vales_sin_productos
FROM vales v
LEFT JOIN vale_productos vp ON vp.vale_id = v.id;
