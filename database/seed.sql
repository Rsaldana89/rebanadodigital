-- Datos iniciales para CHC Rebanado Digital

INSERT INTO users (name, username, password, role, active)
VALUES
  ('Administrador', 'admin', 'admin123', 'administrador', 1),
  ('Usuario CEDIS', 'cedis', 'cedis123', 'cedis', 1),
  ('Usuario Rebanado', 'rebanado', 'rebanado123', 'rebanado', 1),
  ('Usuario Almacén', 'almacen', 'almacen123', 'almacen', 1);

-- Vales de prueba
INSERT INTO vales (folio, origen, cliente, fecha_entrega, prioridad, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, estado, created_by)
VALUES
  ('V-001', 'Manual', 'Cliente A', CURDATE(), 'Alta', 'SKU001', 'Jamón', 10, '1 kg', 'Estándar', 'Pedido urgente', 'Pendiente', 1),
  ('V-002', 'Manual', 'Cliente B', CURDATE(), 'Normal', 'SKU002', 'Queso', 5, '500 g', 'Grueso', 'Preparar sin sal', 'Rebanando', 1),
  ('V-003', 'Manual', 'Cliente C', CURDATE(), 'Baja', 'SKU003', 'Salchicha', 20, 'Paquete', 'Estándar', '', 'Listo', 1),
  ('V-004', 'Manual', 'Cliente D', CURDATE(), 'Alta', 'SKU004', 'Lomo', 15, '1 kg', 'Otro', 'Corte especial', 'Pendiente', 1),
  ('V-005', 'Manual', 'Cliente E', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Normal', 'SKU005', 'Pechuga', 8, '500 g', 'Estándar', 'Entrega mañana', 'Entregado', 1),
  ('V-006', 'Manual', 'Cliente F', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Alta', 'SKU006', 'Tocino', 12, '250 g', 'Grueso', 'Por revisar', 'Cancelado', 1);