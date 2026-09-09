# Rebanado Digital v19.0.8 · Pantalla de almacén 2

Se agrega una segunda alternativa pública para la pantalla informativa de almacén, sin sustituir la vista actual.

## Rutas
- `/pantalla`: vista 1 existente por secciones + seguimiento lateral.
- `/pantalla2`: vista 2 con cuatro columnas grandes: **Entregados, Listos, Rebanando y Pendientes**.

## Vista 2
- Cuatro columnas del mismo ancho ocupando el área disponible de la pantalla.
- Cada columna conserva el color operativo de su estado.
- Vales con pedido/orden de venta destacado, folio, cliente, lugar de entrega, prioridad, productos, fecha y atraso.
- Desplazamiento vertical automático exclusivamente hacia abajo; al terminar reinicia desde arriba, sin movimiento de regreso.
- Conserva la posición de desplazamiento entre recargas dentro de la sesión.
- Actualización automática cada 30 segundos.
- Acceso rápido entre Vista 1 y Vista 2 desde el encabezado.
- Ambas vistas continúan dentro de la misma PWA de Pantalla Rebanado.

No requiere cambios de base de datos.
