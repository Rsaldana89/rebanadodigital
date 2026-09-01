-- =============================================================
-- CHC Rebanado Digital V19
-- Catálogo por SKU, inventario real, historial de rebanado,
-- cierres y mermas.
-- MySQL 8 - migración tolerante e idempotente.
-- =============================================================

START TRANSACTION;

CREATE TABLE IF NOT EXISTS productos_rebanables (
  sku VARCHAR(100) NOT NULL,
  descripcion VARCHAR(180) NOT NULL,
  presentacion VARCHAR(100) NULL DEFAULT 'REBANADO',
  unidad_control VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
  origen VARCHAR(30) NOT NULL DEFAULT 'Manual',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sku),
  KEY idx_productos_rebanables_descripcion (descripcion),
  KEY idx_productos_rebanables_activo (activo)
);

CREATE TABLE IF NOT EXISTS inventario_existencias (
  sku VARCHAR(100) NOT NULL,
  cantidad_sin_rebanar DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sku),
  CONSTRAINT fk_inv_existencias_producto
    FOREIGN KEY (sku) REFERENCES productos_rebanables(sku)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS cierres_rebanado (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  observaciones TEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cierres_rebanado_fecha (fecha),
  KEY idx_cierres_rebanado_fecha (fecha)
);

CREATE TABLE IF NOT EXISTS cierre_rebanado_detalles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cierre_id BIGINT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  cantidad_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_merma DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cierre_rebanado_sku (cierre_id, sku),
  KEY idx_cierre_detalle_sku (sku),
  CONSTRAINT fk_cierre_detalle_cierre
    FOREIGN KEY (cierre_id) REFERENCES cierres_rebanado(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cierre_detalle_producto
    FOREIGN KEY (sku) REFERENCES productos_rebanables(sku)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha_operacion DATE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL DEFAULT 0,
  delta_sin_rebanar DECIMAL(12,2) NOT NULL DEFAULT 0,
  delta_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_rebanada_historial DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_merma DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_sin_rebanar DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  vale_id INT NULL,
  vale_producto_id INT NULL,
  vale_history_id INT NULL,
  cierre_id BIGINT NULL,
  event_key VARCHAR(190) NULL,
  referencia VARCHAR(150) NULL,
  observaciones TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reversed_at DATETIME NULL,
  reversed_by INT NULL,
  reversal_movement_id BIGINT NULL,
  UNIQUE KEY uq_inventario_event_key (event_key),
  KEY idx_inv_mov_sku_fecha (sku, fecha_operacion, id),
  KEY idx_inv_mov_tipo_fecha (tipo, fecha_operacion),
  KEY idx_inv_mov_vale (vale_id, reversed_at),
  KEY idx_inv_mov_cierre (cierre_id, sku),
  CONSTRAINT fk_inv_mov_producto
    FOREIGN KEY (sku) REFERENCES productos_rebanables(sku)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inv_mov_vale
    FOREIGN KEY (vale_id) REFERENCES vales(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_inv_mov_vale_producto
    FOREIGN KEY (vale_producto_id) REFERENCES vale_productos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_inv_mov_vale_history
    FOREIGN KEY (vale_history_id) REFERENCES vale_history(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_inv_mov_cierre
    FOREIGN KEY (cierre_id) REFERENCES cierres_rebanado(id)
    ON DELETE SET NULL
);

-- Catálogo inicial proporcionado por CEDIS (septiembre 2026).
INSERT INTO productos_rebanables
  (sku, descripcion, presentacion, unidad_control, origen, activo)
VALUES
  ('1101001', 'Jamon de Pavo y Cerdo Americano AROOS', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101006', 'Espaldilla Cocida AROOS', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101014', 'Jamón Virginia de Pavo CORONEL', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101016', 'Pechuga de Pavo Natural CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101019', 'Mortadela de Pavo MARIETTA', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101020', 'Jamon de Pavo Virginia CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101027', 'Pavo Tortero AROOS', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101034', 'Queso de Puerco CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101041', 'Jamón Americano Zepelin CORONEL', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101043', 'Jamon Americano CORONEL', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101051', 'Jamón Americano Redondo CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101054', 'Jamón Pechuga  Pavo Coronel', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101058', 'Jamon Americano CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1103008', 'Salami FUD 1.75kg', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1104001', 'Tocino Ahumado CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1104005', 'Tocino NAYAR', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1104008', 'Tocino Ahumado', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1108004', 'Pierna Adobada Económica HIDALMEX', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1108005', 'Pierna Tipo Carnitas HIDALMEX', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1204005', 'Queso GOUDA EL SABINO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1204009', 'Queso Manchego CORONEL', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1204013', 'Queso Gouda CORONEL', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1204014', 'Queso Chihuahua Menonita CAMPO DE ORO', 'REBANADO', 'UNIDAD', 'Excel', 1),
  ('1101042', 'Pechuga de Pavo Braseada CAPISTRANO', 'REBANADO', 'UNIDAD', 'Excel', 1)
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion),
  presentacion = VALUES(presentacion),
  activo = 1;

-- Incorporar SKUs históricos sin alterar el catálogo oficial ya cargado.
INSERT IGNORE INTO productos_rebanables
  (sku, descripcion, presentacion, unidad_control, origen, activo)
SELECT TRIM(vp.sku), LEFT(MAX(vp.producto), 180), 'REBANADO', 'UNIDAD', 'Migracion', 1
FROM vale_productos vp
WHERE TRIM(COALESCE(vp.sku, '')) <> ''
GROUP BY TRIM(vp.sku);

INSERT IGNORE INTO productos_rebanables
  (sku, descripcion, presentacion, unidad_control, origen, activo)
SELECT TRIM(ir.sku), LEFT(MAX(ir.producto), 180), 'REBANADO', 'UNIDAD', 'Migracion', 1
FROM inventario_rebanado ir
WHERE TRIM(COALESCE(ir.sku, '')) <> ''
GROUP BY TRIM(ir.sku);

INSERT IGNORE INTO inventario_existencias (sku)
SELECT sku FROM productos_rebanables;

-- Permisos separados: consulta, administración, cierre y catálogo.
INSERT INTO permission_catalog (code, category, name, description, sort_order, active)
VALUES
  ('inventario.view', 'Inventario', 'Consultar inventario', 'Ver existencias, rebanado, mermas y movimientos.', 100, 1),
  ('inventario.manage', 'Inventario', 'Administrar inventario', 'Cargar producto sin rebanar y registrar ajustes o mermas.', 101, 1),
  ('inventario.cierre', 'Inventario', 'Realizar cierre de Rebanado', 'Capturar rebanado que queda y merma del cierre.', 102, 1),
  ('productos.manage', 'Inventario', 'Administrar productos rebanables', 'Dar de alta SKUs disponibles para inventario y vales.', 103, 1)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  active = 1;

INSERT INTO role_permissions (role, permission_code, allowed)
VALUES
  ('administrador', 'inventario.view', 1),
  ('administrador', 'inventario.manage', 1),
  ('administrador', 'inventario.cierre', 1),
  ('administrador', 'productos.manage', 1),
  ('cedis', 'inventario.view', 1),
  ('cedis', 'inventario.manage', 1),
  ('cedis', 'inventario.cierre', 1),
  ('cedis', 'productos.manage', 1),
  ('rebanado', 'inventario.view', 1),
  ('rebanado', 'inventario.manage', 0),
  ('rebanado', 'inventario.cierre', 1),
  ('rebanado', 'productos.manage', 0),
  ('almacen', 'inventario.view', 1),
  ('almacen', 'inventario.manage', 0),
  ('almacen', 'inventario.cierre', 0),
  ('almacen', 'productos.manage', 0)
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

COMMIT;

-- Verificación posterior.
SELECT COUNT(*) AS productos_rebanables FROM productos_rebanables WHERE activo = 1;
SELECT COUNT(*) AS existencias_inicializadas FROM inventario_existencias;
SELECT role, permission_code, allowed
FROM role_permissions
WHERE permission_code IN ('inventario.view','inventario.manage','inventario.cierre','productos.manage')
ORDER BY role, permission_code;

