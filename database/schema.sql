-- Esquema de base de datos para CHC Rebanado Digital
-- V17: un vale representa un pedido/cliente y puede contener múltiples productos.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role ENUM('administrador','cedis','rebanado','almacen') NOT NULL DEFAULT 'cedis',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(50) NOT NULL,
  origen ENUM('Manual','Siclik','Excel') NOT NULL DEFAULT 'Manual',
  numero_pedido VARCHAR(80) NULL,
  sap_docentry INT NULL,
  sap_docnum INT NULL,
  external_key VARCHAR(100) NULL,
  cliente VARCHAR(100) NOT NULL,
  cliente_codigo VARCHAR(50) NULL,
  lugar_entrega VARCHAR(255) NULL,
  codigo_lugar_entrega VARCHAR(100) NULL,
  fecha_pedido DATE NULL,
  fecha_entrega DATE NOT NULL,
  entrega_dias_texto VARCHAR(120) NULL,
  entrega_fecha_inicio DATE NULL,
  entrega_fecha_fin DATE NULL,
  entrega_horario VARCHAR(100) NULL,
  entrega_nombre VARCHAR(150) NULL,
  entrega_epp VARCHAR(255) NULL,
  comentario_entrega TEXT NULL,
  numero_traslado VARCHAR(100) NULL,
  siclik_usuario_nombre VARCHAR(150) NULL,
  siclik_usuario_correo VARCHAR(190) NULL,
  prioridad ENUM('Alta','Normal','Baja') NOT NULL DEFAULT 'Normal',
  observaciones TEXT,
  estado ENUM('Pendiente','Rebanando','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_synced_at DATETIME NULL,
  UNIQUE KEY uq_vales_folio (folio),
  UNIQUE KEY uq_vales_external_key (external_key),
  KEY idx_vales_fecha_estado (fecha_entrega, estado),
  KEY idx_vales_cliente (cliente),
  KEY idx_vales_sap_docentry (sap_docentry),
  KEY idx_vales_entrega_rango_estado (entrega_fecha_inicio, entrega_fecha_fin, estado),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vale_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vale_id INT NOT NULL,
  sap_line_num INT NULL,
  external_line_key VARCHAR(140) NULL,
  sku VARCHAR(100) NOT NULL,
  producto VARCHAR(150) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  almacen VARCHAR(50) NULL,
  presentacion VARCHAR(100) NOT NULL,
  tipo_rebanado VARCHAR(80) NOT NULL DEFAULT 'Estándar',
  observaciones TEXT,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_synced_at DATETIME NULL,
  UNIQUE KEY uq_vale_productos_external_line_key (external_line_key),
  KEY idx_vale_productos_vale (vale_id, orden),
  KEY idx_vale_productos_sku (sku),
  KEY idx_vale_productos_sap_line (vale_id, sap_line_num),
  CONSTRAINT fk_vale_productos_vale
    FOREIGN KEY (vale_id) REFERENCES vales(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_app_settings_updated_at (updated_at)
);

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
);

CREATE TABLE IF NOT EXISTS vale_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vale_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20),
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vale_id) REFERENCES vales(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventario_rebanado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  producto VARCHAR(100) NOT NULL,
  cantidad_disponible DECIMAL(10,2) DEFAULT 0,
  producto_extra DECIMAL(10,2) DEFAULT 0,
  sobrante DECIMAL(10,2) DEFAULT 0,
  merma DECIMAL(10,2) DEFAULT 0,
  observaciones TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- V19: catálogo e inventario operativo. La tabla anterior se conserva
-- para compatibilidad con registros históricos.
CREATE TABLE IF NOT EXISTS productos_rebanables (
  sku VARCHAR(100) PRIMARY KEY,
  descripcion VARCHAR(180) NOT NULL,
  presentacion VARCHAR(100) NULL DEFAULT 'REBANADO',
  unidad_control VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
  origen VARCHAR(30) NOT NULL DEFAULT 'Manual',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_productos_rebanables_descripcion (descripcion),
  KEY idx_productos_rebanables_activo (activo)
);

CREATE TABLE IF NOT EXISTS inventario_existencias (
  sku VARCHAR(100) PRIMARY KEY,
  cantidad_sin_rebanar DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sku) REFERENCES productos_rebanables(sku) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cierres_rebanado (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  observaciones TEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cierre_rebanado_detalles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cierre_id BIGINT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  cantidad_rebanado_queda DECIMAL(12,2) NOT NULL DEFAULT 0,
  cantidad_merma DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cierre_rebanado_sku (cierre_id, sku),
  FOREIGN KEY (cierre_id) REFERENCES cierres_rebanado(id) ON DELETE CASCADE,
  FOREIGN KEY (sku) REFERENCES productos_rebanables(sku) ON UPDATE CASCADE
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
  event_key VARCHAR(190) NULL UNIQUE,
  referencia VARCHAR(150) NULL,
  observaciones TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reversed_at DATETIME NULL,
  reversed_by INT NULL,
  reversal_movement_id BIGINT NULL,
  KEY idx_inv_mov_sku_fecha (sku, fecha_operacion, id),
  KEY idx_inv_mov_tipo_fecha (tipo, fecha_operacion),
  KEY idx_inv_mov_vale (vale_id, reversed_at),
  FOREIGN KEY (sku) REFERENCES productos_rebanables(sku) ON UPDATE CASCADE,
  FOREIGN KEY (vale_id) REFERENCES vales(id) ON DELETE SET NULL,
  FOREIGN KEY (vale_producto_id) REFERENCES vale_productos(id) ON DELETE SET NULL,
  FOREIGN KEY (vale_history_id) REFERENCES vale_history(id) ON DELETE SET NULL,
  FOREIGN KEY (cierre_id) REFERENCES cierres_rebanado(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  changed_by INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS permission_catalog (
  code VARCHAR(80) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(30) NOT NULL,
  permission_code VARCHAR(80) NOT NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role, permission_code),
  FOREIGN KEY (permission_code) REFERENCES permission_catalog(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT NOT NULL,
  permission_code VARCHAR(80) NOT NULL,
  allowed TINYINT(1) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_code) REFERENCES permission_catalog(code) ON DELETE CASCADE
);
