# CHC Rebanado Digital v11

## Permisos implementados

La versión usa permisos por rol como configuración principal y excepciones por usuario cuando sean necesarias.

### Administrador

Conserva todos los permisos y puede administrar usuarios y permisos.

### CEDIS / Almacén

Por default puede crear y consultar vales, realizar correcciones, cambiar a cualquier estado, registrar cierre de día y consultar reportes.

### Rebanado

Por default puede consultar vales y usar estas transiciones:

- Pendiente → Rebanando
- Pendiente → Cancelado
- Rebanando → Listo
- Rebanando → Cancelado
- Listo → Rebanando
- Listo → Cancelado

No puede marcar Entregado ni regresar a Pendiente, salvo que el administrador le conceda permisos y habilite corrección libre.

## Panel

- `/permisos`: matriz por rol.
- `/permisos/usuario/:id`: excepciones por usuario.

Los botones de estado permanecen visibles, pero aparecen deshabilitados y con candado cuando el usuario no puede ejecutar la acción.
