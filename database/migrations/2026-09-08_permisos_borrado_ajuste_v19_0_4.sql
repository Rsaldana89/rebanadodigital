-- =========================================================
-- CHC Rebanado Digital 19.0.4
-- Permisos para eliminar vales y corregir existencias
-- MySQL 8 · tolerante a múltiples ejecuciones
-- =========================================================

INSERT INTO permission_catalog
  (code, category, name, description, sort_order, active)
VALUES
  ('vales.delete', 'Vales', 'Eliminar vales',
   'Eliminar definitivamente una comanda; si estaba entregada, restaura antes su inventario.', 36, 1),
  ('inventario.adjust', 'Inventario', 'Corregir existencias',
   'Establecer saldos exactos de inventario mediante un movimiento administrativo auditado.', 104, 1)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  active = 1;

-- Administración conserva ambos permisos. Los demás roles quedan apagados
-- inicialmente, pero Administración puede delegarlos desde el menú Permisos.
INSERT INTO role_permissions (role, permission_code, allowed)
VALUES
  ('administrador', 'vales.delete', 1),
  ('administrador', 'inventario.adjust', 1)
ON DUPLICATE KEY UPDATE allowed = 1;

INSERT IGNORE INTO role_permissions (role, permission_code, allowed)
VALUES
  ('cedis', 'vales.delete', 0),
  ('almacen', 'vales.delete', 0),
  ('rebanado', 'vales.delete', 0),
  ('cedis', 'inventario.adjust', 0),
  ('almacen', 'inventario.adjust', 0),
  ('rebanado', 'inventario.adjust', 0);

SELECT rp.role, rp.permission_code, rp.allowed
FROM role_permissions rp
WHERE rp.permission_code IN ('vales.delete', 'inventario.adjust')
ORDER BY rp.permission_code, rp.role;
