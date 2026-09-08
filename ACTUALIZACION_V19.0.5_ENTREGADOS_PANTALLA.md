# Rebanado Digital 19.0.5

## Pantalla de almacén

- Los vales entregados se muestran el día en que cambiaron al estado `Entregado`, aunque su fecha programada de entrega sea anterior.
- Los cancelados siguen la misma regla con el día real de cancelación.
- Para registros antiguos sin historial se usa `updated_at` como respaldo.
- La franja derecha muestra, en este orden: Entregados, Listos, Rebanando y Cancelados.
- Cada estado conserva un encabezado visible, un espacio propio y desplazamiento automático independiente.
- Los renglones compactos muestran folio, cliente y lugar de entrega.

Esta actualización no requiere cambios de base de datos.
