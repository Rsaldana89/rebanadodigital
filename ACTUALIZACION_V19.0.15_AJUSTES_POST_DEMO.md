# CHC Rebanado Digital v19.0.15 · Ajustes post-demo 21 de septiembre

## Alcance

Esta revisión aplica los acuerdos de la demostración operativa con CEDIS, Rebanado, Atención a Negocios y Almacén. No modifica la lógica de CORONELBOT/Siclik, reportes ni el modelo de inventario.

## Cambios

- Pantalla informativa `/pantalla`: **Entregados** pasa a una columna más angosta y usa tarjetas compactas sin productos, lugar de entrega, prioridad ni fecha prometida. Conserva referencia, cliente y hora real de entrega.
- Los vales entregados se muestran por la **fecha real del cambio a Entregado**, aunque su fecha prometida sea de días anteriores. Esto aplica tanto al tablero operativo como a la pantalla informativa.
- Rebanado puede corregir el flujo paso a paso: `Listo -> Rebanando -> Pendiente`.
- Rebanado no puede marcar `Entregado`, incluso si quedara una configuración antigua que hubiera concedido ese permiso.
- CEDIS y Almacén conservan la posibilidad de entregar según su matriz actual.
- Dentro de `Pendiente`, `Rebanando` y `Listo`, los vales se ordenan **Alta -> Normal -> Baja**. Dentro de la misma prioridad se muestra primero la fecha de entrega más antigua.
- `Entregado` se ordena por hora real de entrega, más reciente primero.
- Se actualizan cachés PWA/CSS a `v19.0.15` para evitar estilos antiguos en la TV.

## Base de datos / permisos

El servicio de inicio sincroniza los permisos críticos del perfil Rebanado. También se incluye la migración opcional:

`database/migrations/2026-09-22_ajustes_post_demo_v19_0_15.sql`

Puede ejecutarse una vez en producción si se desea dejar la matriz corregida antes de reiniciar el servicio.

## Pruebas agregadas/actualizadas

- Transiciones controladas de Rebanado.
- Bloqueo de `Entregado` para Rebanado.
- Orden Alta -> Normal -> Baja dentro del estado.
- Entregados de días anteriores visibles el día real de entrega.
- Tarjeta compacta de Entregados en la pantalla de almacén.
- Versión de caché de Pantalla Almacén actualizada.
