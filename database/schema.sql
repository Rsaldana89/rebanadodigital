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
  cliente VARCHAR(100) NOT NULL,
  fecha_entrega DATE NOT NULL,
  prioridad ENUM('Alta','Normal','Baja') NOT NULL DEFAULT 'Normal',
  observaciones TEXT,
  estado ENUM('Pendiente','Rebanando','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vales_folio (folio),
  KEY idx_vales_fecha_estado (fecha_entrega, estado),
  KEY idx_vales_cliente (cliente),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

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
