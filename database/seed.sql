-- Datos iniciales para CHC Rebanado Digital V17

INSERT INTO users (name, username, password, role, active)
VALUES
  ('Administrador', 'admin', 'admin123', 'administrador', 1),
  ('Usuario CEDIS', 'cedis', 'cedis123', 'cedis', 1),
  ('Usuario Rebanado', 'rebanado', 'rebanado123', 'rebanado', 1),
  ('Usuario Almacén', 'almacen', 'almacen123', 'almacen', 1);

INSERT INTO vales
  (folio, origen, numero_pedido, cliente, fecha_entrega, prioridad, observaciones, estado, created_by, updated_by)
VALUES
  ('V-001', 'Manual', 'PED-1001', 'Cliente A', CURDATE(), 'Alta', 'Pedido urgente', 'Pendiente', 1, 1),
  ('V-002', 'Manual', 'PED-1002', 'Cliente B', CURDATE(), 'Normal', 'Separar por producto', 'Rebanando', 1, 1),
  ('V-003', 'Manual', 'PED-1003', 'Cliente C', CURDATE(), 'Baja', NULL, 'Listo', 1, 1),
  ('V-004', 'Manual', 'PED-1004', 'Cliente D', CURDATE(), 'Alta', 'Corte especial', 'Pendiente', 1, 1),
  ('V-005', 'Manual', 'PED-1005', 'Cliente E', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Normal', 'Entrega mañana', 'Entregado', 1, 1),
  ('V-006', 'Manual', 'PED-1006', 'Cliente F', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Alta', 'Por revisar', 'Cancelado', 1, 1);

INSERT INTO vale_productos
  (vale_id, sku, producto, cantidad, presentacion, tipo_rebanado, observaciones, orden)
VALUES
  (1, 'SKU001', 'Jamón Virginia', 10, '1 kg', 'Estándar', NULL, 1),
  (1, 'SKU002', 'Queso manchego', 5, '500 g', 'Grueso', 'Empacar por separado', 2),
  (1, 'SKU003', 'Pechuga de pavo', 4, '500 g', 'Estándar', NULL, 3),
  (2, 'SKU004', 'Jamón de pierna', 8, '1 kg', 'Estándar', NULL, 1),
  (2, 'SKU005', 'Salami', 3, '500 g', 'Grueso', NULL, 2),
  (3, 'SKU006', 'Salchicha', 20, 'Paquete', 'Estándar', NULL, 1),
  (3, 'SKU007', 'Tocino', 6, '250 g', 'Grueso', NULL, 2),
  (4, 'SKU008', 'Lomo canadiense', 15, '1 kg', 'Otro', 'Corte especial', 1),
  (4, 'SKU009', 'Queso gouda', 7, '500 g', 'Estándar', NULL, 2),
  (5, 'SKU010', 'Pechuga ahumada', 8, '500 g', 'Estándar', NULL, 1),
  (6, 'SKU011', 'Tocino ahumado', 12, '250 g', 'Grueso', NULL, 1);
