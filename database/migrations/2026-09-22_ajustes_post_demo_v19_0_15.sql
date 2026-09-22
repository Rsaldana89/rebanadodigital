-- CHC Rebanado Digital v19.0.15
-- Acuerdos operativos posteriores a la demo del 21 de septiembre de 2026.

START TRANSACTION;

-- Rebanado puede regresar Rebanando -> Pendiente.
INSERT INTO role_permissions (role, permission_code, allowed)
VALUES ('rebanado', 'vales.state.pending', 1)
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

-- Rebanado nunca entrega ni obtiene corrección libre de estados.
INSERT INTO role_permissions (role, permission_code, allowed)
VALUES
  ('rebanado', 'vales.state.entregado', 0),
  ('rebanado', 'vales.state.manage_all', 0)
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

COMMIT;
