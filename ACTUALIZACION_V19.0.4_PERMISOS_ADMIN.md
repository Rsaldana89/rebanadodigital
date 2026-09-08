# CHC Rebanado Digital 19.0.4

## Permisos de estados

- Se corrigió el flujo normal para que `Marcar Entregado` permita `Listo → Entregado` sin exigir `Corregir estados libremente`.
- Los pasos normales quedan: `Pendiente → Rebanando → Listo → Entregado`.
- `Cancelar vale` continúa disponible desde estados activos cuando el permiso está concedido.
- Los saltos, reaperturas y retrocesos siguen reservados al permiso `Corregir estados libremente`.
- Por ello, Administración ya puede activar solamente `Marcar Entregado` para Rebanado desde la pantalla de permisos.

## Eliminación de vales

- Se agregó el permiso `Eliminar vales`, concedido inicialmente sólo a Administración.
- Administración puede eliminar desde el detalle o desde el menú de cada tarjeta del tablero.
- La acción exige confirmación explícita.
- Si el vale estaba entregado, se restaura primero su inventario dentro de la misma transacción.
- Los movimientos conservan una referencia que identifica el folio eliminado.
- Un vale sincronizado puede reaparecer si la orden continúa vigente en Siclik y CORONELBOT vuelve a enviarla.

## Corrección de inventario

- Se agregó el permiso `Corregir existencias`, concedido inicialmente sólo a Administración.
- La tabla de existencias muestra el botón `Editar` únicamente a quien tenga ese permiso.
- Se capturan los saldos finales de `Sin rebanar` y `Rebanado que queda`.
- El saldo sin rebanar puede quedar negativo; el rebanado que queda nunca puede ser negativo.
- El motivo es obligatorio y el sistema registra la diferencia como movimiento `AJUSTE_ADMIN`, incluyendo usuario, fecha, saldo anterior y saldo final.

## Base de datos

La aplicación registra automáticamente los dos permisos nuevos al iniciar. También se incluye la migración tolerante:

`database/migrations/2026-09-08_permisos_borrado_ajuste_v19_0_4.sql`
