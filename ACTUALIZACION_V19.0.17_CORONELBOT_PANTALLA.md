# Rebanado Digital v19.0.17 - Estado CORONELBOT en Pantalla de Almacén

## Cambio principal

La Pantalla de Almacén ahora muestra un indicador compacto del estado de sincronización con CORONELBOT en el encabezado.

### Estados visuales

- **CORONELBOT OK**: existe contacto reciente dentro de la tolerancia configurada y no hay error de la última sincronización de datos.
- **CORONELBOT ALERTA**: se superó la tolerancia, la última corrida quedó en error parcial o existe un error de sincronización.
- **CORONELBOT SIN DATOS**: la información de integración no está disponible (por ejemplo, si falta la migración correspondiente).

El indicador muestra la hora del último contacto y, al colocar el cursor encima, detalla también la última sincronización exitosa y el último error disponible.

Se incluye en **/pantalla** y **/pantalla2**. Ambas vistas continúan actualizándose automáticamente cada 30 segundos, por lo que el estado de CORONELBOT también se refresca sin intervención.

## PWA

Se actualizó la versión y caché a `19.0.17` para evitar conservar estilos anteriores en la PC/TV de Almacén.

## Base de datos

No requiere cambios de estructura ni migraciones nuevas. Utiliza el mismo heartbeat y registro de sincronizaciones de CORONELBOT que ya usa Inicio, Gestión de Vales y Permisos.
