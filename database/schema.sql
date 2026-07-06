-- Esquema de base de datos para CHC Rebanado Digital

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
  cliente VARCHAR(100) NOT NULL,
  fecha_entrega DATE NOT NULL,
  prioridad ENUM('Alta','Normal','Baja') NOT NULL DEFAULT 'Normal',
  sku VARCHAR(100) NOT NULL,
  producto VARCHAR(100) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  presentacion VARCHAR(50) NOT NULL,
  tipo_rebanado ENUM('Estándar','Grueso','Otro') NOT NULL DEFAULT 'Estándar',
  observaciones TEXT,
  estado ENUM('Pendiente','Rebanando','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
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