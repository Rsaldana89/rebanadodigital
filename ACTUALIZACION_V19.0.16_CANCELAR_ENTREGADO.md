# CHC Rebanado Digital v19.0.16 - Cancelacion de vales entregados

## Ajuste solicitado

CEDIS y Administrador pueden cancelar una comanda que ya fue marcada como **Entregado**.

Regla final:

- Administrador: Entregado -> Cancelado permitido.
- CEDIS: Entregado -> Cancelado permitido.
- Almacen: no puede modificar una comanda despues de Entregado.
- Rebanado: no puede modificar una comanda despues de Entregado.

La cancelacion desde Entregado utiliza la logica existente del controlador para revertir el consumo de inventario asociado a la entrega y registra el cambio en el historial del vale.

## Interfaz

En el tablero operativo, el menu de acciones ahora muestra **Cancelar vale** sobre una comanda Entregada solamente cuando el usuario tiene permitido ese cambio. En detalle se utiliza la misma regla de permisos.

## Base de datos

No requiere migracion ni cambio estructural de base de datos. La restriccion se aplica en la regla de transiciones del backend, por lo que no depende de que una matriz historica tenga `manage_all` activo.
